/**
 * 사용자별 전용 재생목록 매핑을 저장하는 MongoDB 저장소.
 *
 * - 컬렉션: users
 * - 문서: { _id: googleId, playlistId, playlistTitle, updatedAt }
 * - 토큰 등 민감 정보는 저장하지 않는다 (docs/security.md 5절: 사용자 데이터 최소화).
 *
 * 서비스 계층은 이 store의 메서드만 호출하므로, 이전 파일 기반 구현에서 Mongo로
 * 바꿔도 playlist.service 등은 수정할 필요가 없다.
 */
import { getDb } from '../config/mongo.js';

const COLLECTION = 'users';

function toPlaylistRecord(doc) {
  if (!doc) return null;
  return {
    playlistId: doc.playlistId,
    playlistTitle: doc.playlistTitle,
    updatedAt: doc.updatedAt,
  };
}

/**
 * @param {{ getCollection?: () => import('mongodb').Collection }} [deps]
 */
export function createUserStore(deps = {}) {
  const getCollection =
    deps.getCollection ?? (() => getDb().collection(COLLECTION));

  // 같은 googleId에 대한 쓰기를 프로세스 내에서 직렬화한다(다중 요청 경합 완화).
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
     * 특정 사용자의 재생목록 매핑 조회. 없으면 null.
     */
    getPlaylistRecord(googleId) {
      return enqueue(googleId, async () => {
        const doc = await getCollection().findOne({ _id: googleId });
        return toPlaylistRecord(doc);
      });
    },

    /**
     * 특정 사용자의 재생목록 매핑을 저장(덮어쓰기)한다.
     */
    setPlaylistRecord(googleId, { playlistId, playlistTitle }) {
      return enqueue(googleId, async () => {
        const updatedAt = new Date().toISOString();
        const record = { playlistId, playlistTitle, updatedAt };

        await getCollection().updateOne(
          { _id: googleId },
          { $set: record },
          { upsert: true }
        );

        return record;
      });
    },
  };
}

// 서버 전역에서 공용으로 쓰는 기본 저장소 인스턴스.
export const userStore = createUserStore();
