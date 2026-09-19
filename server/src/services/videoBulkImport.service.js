/**
 * 대량 링크 등록(PRD 5.1) 비즈니스 로직.
 *
 * - 붙여넣은 텍스트에서 유효한 유튜브 "영상" URL만 정규식으로 추출한다(providers/../utils
 *   /youtubeUrl.js). 재생목록 URL·일반 URL은 등록 대상에서 제외되고 "유효하지 않은 URL"로
 *   분류된다.
 * - 같은 영상이 요청 안에서 여러 번 입력되었거나 이미 전용 재생목록에 등록되어 있으면
 *   "중복"으로 분류하고 건너뛴다(로컬 저장소에 기록된 최근 동기화 결과를 기준으로 판단한다).
 * - 유효한 영상 URL(중복 제외, videoId 기준)이 100개를 넘으면 전체 요청을 거부한다.
 * - 유효한 URL 각각에 대해 YouTube 재생목록에 추가를 시도하고, 성공/실패를 링크별로
 *   구분해 기록한다 — 일부가 실패해도 나머지 성공 건은 그대로 등록된 채로 남는다.
 * - 성공적으로 추가된 영상은 로컬 저장소에도 최소 정보로 즉시 반영해 두고(제목/썸네일
 *   등 상세 메타데이터는 컨트롤러가 트리거하는 백그라운드 동기화가 채운다), 다음 조회 시
 *   바로 보이게 한다.
 *
 * store/provider 의존성은 매개변수로 주입 가능하게 만들어 테스트를 쉽게 한다.
 */
import * as defaultYoutube from '../providers/youtube.js';
import { videoStore as defaultVideoStore } from '../store/videoStore.js';
import { extractCandidateUrls, extractVideoId } from '../utils/youtubeUrl.js';

export const MAX_URLS_PER_REQUEST = 100;

export const RESULT_STATUS = {
  SUCCESS: 'success',
  DUPLICATE: 'duplicate',
  INVALID: 'invalid',
  FAILED: 'failed',
};

const RESULT_MESSAGE = {
  [RESULT_STATUS.SUCCESS]: '전용 재생목록에 등록되었습니다.',
  [RESULT_STATUS.DUPLICATE]: '이미 등록되었거나 중복된 URL이라 건너뛰었습니다.',
  [RESULT_STATUS.INVALID]: '유효한 유튜브 영상 URL이 아닙니다.',
  [RESULT_STATUS.FAILED]: '등록에 실패했습니다.',
};

function summarize(results) {
  const counts = {
    total: results.length,
    successCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    failedCount: 0,
  };

  for (const result of results) {
    if (result.status === RESULT_STATUS.SUCCESS) counts.successCount += 1;
    else if (result.status === RESULT_STATUS.DUPLICATE) counts.duplicateCount += 1;
    else if (result.status === RESULT_STATUS.INVALID) counts.invalidCount += 1;
    else if (result.status === RESULT_STATUS.FAILED) counts.failedCount += 1;
  }

  return counts;
}

/**
 * 새로 추가된 영상을 저장소에 최소 필드로 반영한다. 상세 메타데이터(제목/채널/썸네일)는
 * 값이 비어 있는 채로 두고, 컨트롤러가 트리거하는 백그라운드 동기화가 채운다.
 */
function toMinimalVideoRecord({ videoId, playlistItemId, publishedAt }) {
  return {
    videoId,
    playlistItemId,
    title: '',
    channelName: '',
    thumbnailUrl: '',
    durationSeconds: null,
    savedAt: publishedAt,
    isArchived: false,
    summaryStatus: 'pending',
    summary: null,
  };
}

/**
 * @param {{ googleId: string, accessToken: string, playlistId: string, text: string }} params
 * @returns {Promise<{
 *   total: number, successCount: number, duplicateCount: number, invalidCount: number,
 *   failedCount: number,
 *   results: Array<{ url: string, videoId: string | null, status: string, message: string }>
 * }>}
 */
export async function bulkImportVideos({ googleId, accessToken, playlistId, text }, deps = {}) {
  const store = deps.videoStore ?? defaultVideoStore;
  const youtube = deps.youtube ?? defaultYoutube;

  const candidates = extractCandidateUrls(text).map((url) => ({
    url,
    videoId: extractVideoId(url),
  }));

  const uniqueValidIds = new Set(
    candidates.filter((candidate) => candidate.videoId !== null).map((candidate) => candidate.videoId)
  );

  if (uniqueValidIds.size === 0) {
    const err = new Error('등록할 수 있는 유효한 유튜브 영상 URL이 없습니다.');
    err.statusCode = 400;
    throw err;
  }

  if (uniqueValidIds.size > MAX_URLS_PER_REQUEST) {
    const err = new Error(
      `한 번에 등록할 수 있는 유효한 유튜브 영상 URL은 최대 ${MAX_URLS_PER_REQUEST}개입니다.`
    );
    err.statusCode = 400;
    throw err;
  }

  const existingRecord = await store.getUserVideoData(googleId);
  const existingVideoIds = new Set((existingRecord?.videos ?? []).map((video) => video.videoId));

  const seenInRequest = new Set();
  const results = [];
  const newlyAdded = [];

  for (const { url, videoId } of candidates) {
    if (!videoId) {
      results.push({ url, videoId: null, status: RESULT_STATUS.INVALID, message: RESULT_MESSAGE.invalid });
      continue;
    }

    if (existingVideoIds.has(videoId) || seenInRequest.has(videoId)) {
      results.push({ url, videoId, status: RESULT_STATUS.DUPLICATE, message: RESULT_MESSAGE.duplicate });
      continue;
    }

    seenInRequest.add(videoId);

    try {
      const added = await youtube.addPlaylistItem(accessToken, playlistId, videoId);
      existingVideoIds.add(videoId);
      newlyAdded.push({ videoId, playlistItemId: added.playlistItemId, publishedAt: added.publishedAt });
      results.push({ url, videoId, status: RESULT_STATUS.SUCCESS, message: RESULT_MESSAGE.success });
    } catch {
      results.push({ url, videoId, status: RESULT_STATUS.FAILED, message: RESULT_MESSAGE.failed });
    }
  }

  if (newlyAdded.length > 0) {
    await store.commitUserVideoData(googleId, (current) => {
      const merged = new Map(current.videos.map((video) => [video.videoId, video]));
      for (const item of newlyAdded) {
        // 동시 동기화 등으로 이미 반영되었다면 기존 값을 유지한다(안전장치).
        if (!merged.has(item.videoId)) {
          merged.set(item.videoId, toMinimalVideoRecord(item));
        }
      }
      return { ...current, videos: Array.from(merged.values()) };
    });
  }

  return { ...summarize(results), results };
}
