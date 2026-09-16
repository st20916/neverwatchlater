/**
 * 사용자별 동기화된 영상 목록을 저장하는 파일 기반 저장소 (MVP용).
 *
 * - 저장 위치: server/data/videos.json
 * - 구조: { [googleId]: { lastSyncedAt: string | null, videos: VideoRecord[] } }
 * - userStore.js(재생목록 매핑)와는 관심사가 달라 별도 파일로 분리한다.
 *
 * TODO(확정필요, docs/product-specs/playlist.md와 동일한 이유): 운영 배포 전 실제 DB로 교체한다.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, 'videos.json');

/**
 * 테스트에서 격리된 파일 경로를 주입할 수 있도록 팩토리 형태로 제공한다.
 * 기본 export(defaultStore)는 실제 서버에서 사용하는 싱글턴이다.
 */
export function createVideoStore(filePath = DEFAULT_DATA_FILE) {
  let writeQueue = Promise.resolve();

  async function readAll() {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      console.warn(`videoStore: ${filePath} 파싱 실패, 빈 저장소로 대체합니다.`, err.message);
      return {};
    }
  }

  async function writeAll(data) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const tmpFile = path.join(dir, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpFile, filePath);
  }

  function enqueue(task) {
    const result = writeQueue.then(task, task);
    writeQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  return {
    /**
     * 특정 사용자의 동기화 데이터 조회. 기록이 없으면 null.
     */
    getUserVideoData(googleId) {
      return enqueue(async () => {
        const all = await readAll();
        return all[googleId] ?? null;
      });
    },

    /**
     * 특정 사용자의 동기화 데이터를 저장(덮어쓰기)한다.
     */
    setUserVideoData(googleId, { lastSyncedAt, videos }) {
      return enqueue(async () => {
        const all = await readAll();
        all[googleId] = { lastSyncedAt, videos };
        await writeAll(all);
        return all[googleId];
      });
    },

    /**
     * 읽기 → 계산 → 쓰기를 하나의 원자적 작업으로 실행한다.
     * computeNext(current)는 최신 상태를 받아 다음 상태를 반환한다(동기/비동기 모두 가능).
     *
     * 동기화(전체 목록 재작성)와 개별 영상 갱신(요약 상태 등)이 동시에 일어나도, 이 함수를
     * 통해 쓰기 직전에 "가장 최신 상태"를 다시 읽어 병합하면 한쪽이 다른 쪽의 갱신을
     * 덮어쓰는 문제를 막을 수 있다.
     */
    commitUserVideoData(googleId, computeNext) {
      return enqueue(async () => {
        const all = await readAll();
        const current = all[googleId] ?? { lastSyncedAt: null, videos: [] };
        const next = await computeNext(current);
        all[googleId] = next;
        await writeAll(all);
        return next;
      });
    },

    /**
     * 특정 영상 하나의 필드만 갱신한다(요약 상태/결과 갱신용). 다른 영상 데이터는 건드리지
     * 않는다. 대상 영상이 이미 삭제되었다면(재동기화로 제거된 경우) 아무 것도 하지 않는다.
     */
    updateVideoFields(googleId, videoId, fields) {
      return enqueue(async () => {
        const all = await readAll();
        const record = all[googleId];
        if (!record) return null;

        const index = record.videos.findIndex((video) => video.videoId === videoId);
        if (index === -1) return null;

        record.videos[index] = { ...record.videos[index], ...fields };
        all[googleId] = record;
        await writeAll(all);
        return record.videos[index];
      });
    },
  };
}

// 서버 전역에서 공용으로 쓰는 기본 저장소 인스턴스.
export const videoStore = createVideoStore();
