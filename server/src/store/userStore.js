/**
 * 사용자별 전용 재생목록 매핑을 저장하는 파일 기반 저장소 (MVP용).
 *
 * - 저장 위치: server/data/users.json
 * - 구조: { [googleId]: { playlistId, playlistTitle, updatedAt } }
 * - 토큰 등 민감 정보는 저장하지 않는다 (docs/security.md 5절: 사용자 데이터 최소화).
 *
 * TODO(확정필요, docs/product-specs/playlist.md): 동시 접속자가 늘어나거나 운영 배포 전에는
 * SQLite 등 실제 DB로 교체한다. 이 구현은 파일 하나를 프로세스 내 write queue로 직렬화해
 * 쓰기 충돌을 최소화하지만, 다중 프로세스/인스턴스 환경에서는 안전하지 않다.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, 'users.json');

/**
 * 테스트에서 격리된 파일 경로를 주입할 수 있도록 팩토리 형태로 제공한다.
 * 기본 export(defaultStore)는 실제 서버에서 사용하는 싱글턴이다.
 */
export function createUserStore(filePath = DEFAULT_DATA_FILE) {
  // 같은 파일에 대한 읽기/쓰기를 순서대로만 실행하기 위한 프로미스 체인.
  let writeQueue = Promise.resolve();

  async function readAll() {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      // 파일이 손상된 경우에도 서버 전체가 죽지 않도록 빈 객체로 복구하고 경고만 남긴다.
      console.warn(`userStore: ${filePath} 파싱 실패, 빈 저장소로 대체합니다.`, err.message);
      return {};
    }
  }

  async function writeAll(data) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // 임시 파일에 먼저 쓰고 rename하여 쓰기 도중 프로세스가 죽어도 파일이 깨지지 않게 한다.
    const tmpFile = path.join(dir, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpFile, filePath);
  }

  function enqueue(task) {
    const result = writeQueue.then(task, task);
    // 실패해도 다음 작업이 계속 진행되도록 큐 자체는 항상 resolve 상태로 유지한다.
    writeQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  return {
    /**
     * 특정 사용자의 재생목록 매핑 조회. 없으면 null.
     */
    getPlaylistRecord(googleId) {
      return enqueue(async () => {
        const all = await readAll();
        return all[googleId] ?? null;
      });
    },

    /**
     * 특정 사용자의 재생목록 매핑을 저장(덮어쓰기)한다.
     */
    setPlaylistRecord(googleId, { playlistId, playlistTitle }) {
      return enqueue(async () => {
        const all = await readAll();
        all[googleId] = {
          playlistId,
          playlistTitle,
          updatedAt: new Date().toISOString(),
        };
        await writeAll(all);
        return all[googleId];
      });
    },
  };
}

// 서버 전역에서 공용으로 쓰는 기본 저장소 인스턴스.
export const userStore = createUserStore();
