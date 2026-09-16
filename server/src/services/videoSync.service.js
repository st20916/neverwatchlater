/**
 * 전용 재생목록 영상 동기화 비즈니스 로직 (PRD 2.1).
 *
 * 정책:
 * - 마지막 동기화 후 3일이 지나지 않았으면 YouTube를 다시 호출하지 않는다(force=true면 예외).
 * - 신규 영상은 summaryStatus='pending'으로 추가하고, 삭제된 영상은 목록에서 제거한다.
 * - 기존 영상은 제목/채널명/썸네일/재생목록항목ID만 최신화하고, savedAt/isArchived/
 *   summaryStatus/summary/durationSeconds는 절대 덮어쓰지 않는다.
 *   ("나중에" 액션은 YouTube를 건드리지 않고 savedAt만 초기화하므로, 재동기화가 이를
 *   YouTube의 원래 추가일로 되돌리면 안 된다.)
 * - 동기화 실패 시 기존 데이터와 마지막 동기화 시각을 그대로 유지한다.
 * - 같은 사용자에 대한 동기화 요청이 동시에 여러 번 들어와도 실제로는 한 번만 실행한다.
 *
 * store/provider 의존성은 매개변수로 주입 가능하게 만들어 테스트를 쉽게 한다.
 */
import * as defaultYoutube from '../providers/youtube.js';
import { videoStore as defaultVideoStore } from '../store/videoStore.js';

const SYNC_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 최대 3일 주기

// 사용자별 진행 중인 동기화 작업을 추적해 중복 실행을 막는다(단일 프로세스 전제).
const inFlightSyncs = new Map();

/**
 * durationSeconds가 아직 없는 영상(신규 영상, 또는 Part B 이전에 동기화되어 값이 비어있던
 * 영상)의 videoId만 골라 YouTube에서 길이를 조회한다. 조회에 실패해도 동기화 전체를
 * 실패시키지 않고 빈 결과를 반환해 다음 동기화 때 다시 시도하게 한다.
 * @returns {Promise<Record<string, number | null>>} videoId → durationSeconds
 */
async function fetchMissingDurations(videos, accessToken, youtube) {
  const missingIds = videos
    .filter((video) => video.durationSeconds == null)
    .map((video) => video.videoId);

  if (missingIds.length === 0) return {};

  try {
    return await youtube.getVideoDurations(accessToken, missingIds);
  } catch (err) {
    console.warn('videoSync: 영상 길이 조회 실패, 다음 동기화에서 재시도합니다.', err.message);
    return {};
  }
}

function applyDurations(videos, durations) {
  return videos.map((video) =>
    video.durationSeconds == null && durations[video.videoId] != null
      ? { ...video, durationSeconds: durations[video.videoId] }
      : video
  );
}

function buildMergedVideos(existingVideos, fetchedItems) {
  const existingById = new Map(existingVideos.map((video) => [video.videoId, video]));

  return fetchedItems.map((item) => {
    const existing = existingById.get(item.videoId);

    if (existing) {
      return {
        ...existing,
        playlistItemId: item.playlistItemId,
        title: item.title,
        channelName: item.channelName,
        thumbnailUrl: item.thumbnailUrl,
      };
    }

    return {
      videoId: item.videoId,
      playlistItemId: item.playlistItemId,
      title: item.title,
      channelName: item.channelName,
      thumbnailUrl: item.thumbnailUrl,
      durationSeconds: null,
      savedAt: item.publishedAt,
      isArchived: false,
      summaryStatus: 'pending',
      summary: null,
    };
  });
}

/**
 * 저장소에 기록된 현재 상태만 조회한다(YouTube 재조회 없음).
 */
export async function getStoredVideos(googleId, deps = {}) {
  const store = deps.videoStore ?? defaultVideoStore;
  const record = await store.getUserVideoData(googleId);
  return record ?? { lastSyncedAt: null, videos: [] };
}

/**
 * 전용 재생목록을 동기화한다.
 * @param {{ googleId: string, accessToken: string, playlistId: string, force?: boolean }} params
 * @returns {Promise<{ videos: object[], lastSyncedAt: string, synced: boolean }>}
 */
export async function syncVideos({ googleId, accessToken, playlistId, force = false }, deps = {}) {
  // 다른 호출이 같은 사용자를 이미 처리 중이면 그 결과를 그대로 기다린다.
  // task 등록(아래)까지 await 없이 동기적으로 처리해야 동시 요청 사이의 경합을 막을 수 있다.
  const existingInFlight = inFlightSyncs.get(googleId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const store = deps.videoStore ?? defaultVideoStore;
  const youtube = deps.youtube ?? defaultYoutube;

  const task = (async () => {
    const record = await getStoredVideos(googleId, { videoStore: store });

    const isFresh =
      !force &&
      record.lastSyncedAt !== null &&
      Date.now() - new Date(record.lastSyncedAt).getTime() < SYNC_INTERVAL_MS;

    if (isFresh) {
      return { videos: record.videos, lastSyncedAt: record.lastSyncedAt, synced: false };
    }

    const items = await youtube.listPlaylistItems(accessToken, playlistId);

    // 길이 조회 대상은 초기 스냅샷 기준으로 판단한다(길이 값은 다른 작업과 충돌하지 않는
    // 필드라 스냅샷이 약간 오래되어도 안전하다). 네트워크 호출은 쓰기 잠금 밖에서 수행한다.
    const provisional = buildMergedVideos(record.videos, items);
    const durations = await fetchMissingDurations(provisional, accessToken, youtube);

    const lastSyncedAt = new Date().toISOString();

    // 실제 반영은 "커밋 시점의 최신 상태"를 다시 읽어 병합한다. 동기화가 진행되는 동안
    // 백그라운드 AI 요약 작업이 완료한 summaryStatus/summary 갱신을 덮어쓰지 않기 위함이다.
    const committed = await store.commitUserVideoData(googleId, (current) => {
      const merged = buildMergedVideos(current.videos, items);
      return { lastSyncedAt, videos: applyDurations(merged, durations) };
    });

    return { videos: committed.videos, lastSyncedAt: committed.lastSyncedAt, synced: true };
  })();

  inFlightSyncs.set(googleId, task);

  try {
    return await task;
  } finally {
    inFlightSyncs.delete(googleId);
  }
}
