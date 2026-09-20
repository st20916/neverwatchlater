/**
 * 사용자별 동기화된 영상 목록을 저장하는 MongoDB 저장소.
 *
 * - 컬렉션: videos
 * - 문서: { _id: googleId, lastSyncedAt: string | null, videos: VideoRecord[] }
 * - userStore(재생목록 매핑)와는 관심사가 달라 별도 컬렉션으로 분리한다.
 *
 * commitUserVideoData는 "읽기 → 계산 → 쓰기"를 googleId별 큐로 직렬화해, 동기화와
 * 백그라운드 AI 요약이 동시에 일어나도 한쪽이 다른 쪽의 갱신을 덮어쓰지 않게 한다.
 */
import { getDb } from '../config/mongo.js';

const COLLECTION = 'videos';

function toVideoRecord(doc) {
  if (!doc) return null;
  return {
    lastSyncedAt: doc.lastSyncedAt ?? null,
    videos: Array.isArray(doc.videos) ? doc.videos : [],
  };
}

/**
 * @param {{ getCollection?: () => import('mongodb').Collection }} [deps]
 */
export function createVideoStore(deps = {}) {
  const getCollection =
    deps.getCollection ?? (() => getDb().collection(COLLECTION));

  // 같은 googleId 문서에 대한 읽기-수정-쓰기를 프로세스 내에서 직렬화한다.
  const writeQueues = new Map();

  function enqueue(googleId, task) {
    const prev = writeQueues.get(googleId) ?? Promise.resolve();
    const next = prev.then(task, task);
    writeQueues.set(
      googleId,
      next.then(
        () => undefined,
        () => undefined
      )
    );
    return next;
  }

  return {
    /**
     * 특정 사용자의 동기화 데이터 조회. 기록이 없으면 null.
     */
    getUserVideoData(googleId) {
      return enqueue(googleId, async () => {
        const doc = await getCollection().findOne({ _id: googleId });
        return toVideoRecord(doc);
      });
    },

    /**
     * 특정 사용자의 동기화 데이터를 저장(덮어쓰기)한다.
     */
    setUserVideoData(googleId, { lastSyncedAt, videos }) {
      return enqueue(googleId, async () => {
        const record = { lastSyncedAt: lastSyncedAt ?? null, videos: videos ?? [] };

        await getCollection().updateOne(
          { _id: googleId },
          { $set: record },
          { upsert: true }
        );

        return record;
      });
    },

    /**
     * 읽기 → 계산 → 쓰기를 하나의 원자적 작업으로 실행한다.
     * computeNext(current)는 최신 상태를 받아 다음 상태를 반환한다(동기/비동기 모두 가능).
     */
    commitUserVideoData(googleId, computeNext) {
      return enqueue(googleId, async () => {
        const doc = await getCollection().findOne({ _id: googleId });
        const current = toVideoRecord(doc) ?? { lastSyncedAt: null, videos: [] };
        const next = await computeNext(current);
        const record = {
          lastSyncedAt: next.lastSyncedAt ?? null,
          videos: next.videos ?? [],
        };

        await getCollection().updateOne(
          { _id: googleId },
          { $set: record },
          { upsert: true }
        );

        return record;
      });
    },

    /**
     * 특정 영상 하나의 필드만 갱신한다(요약 상태/결과 갱신용). 다른 영상 데이터는 건드리지
     * 않는다. 대상 영상이 이미 삭제되었다면 null을 반환한다.
     */
    updateVideoFields(googleId, videoId, fields) {
      return enqueue(googleId, async () => {
        const setFields = {};
        for (const [key, value] of Object.entries(fields ?? {})) {
          setFields[`videos.$.${key}`] = value;
        }

        if (Object.keys(setFields).length === 0) {
          const doc = await getCollection().findOne({ _id: googleId });
          const record = toVideoRecord(doc);
          return record?.videos.find((video) => video.videoId === videoId) ?? null;
        }

        const result = await getCollection().findOneAndUpdate(
          { _id: googleId, 'videos.videoId': videoId },
          { $set: setFields },
          { returnDocument: 'after' }
        );

        if (!result) return null;
        return result.videos.find((video) => video.videoId === videoId) ?? null;
      });
    },

    /**
     * 특정 영상 하나를 목록에서 통째로 제거한다("안볼래요" 액션). 요약 캐시 등 파생
     * 데이터도 레코드와 함께 자연히 삭제된다. 대상이 이미 없으면 null을 반환한다.
     */
    removeVideo(googleId, videoId) {
      return enqueue(googleId, async () => {
        const existing = await getCollection().findOne({
          _id: googleId,
          'videos.videoId': videoId,
        });
        if (!existing) return null;

        const result = await getCollection().findOneAndUpdate(
          { _id: googleId },
          { $pull: { videos: { videoId } } },
          { returnDocument: 'after' }
        );

        return toVideoRecord(result);
      });
    },
  };
}

// 서버 전역에서 공용으로 쓰는 기본 저장소 인스턴스.
export const videoStore = createVideoStore();
