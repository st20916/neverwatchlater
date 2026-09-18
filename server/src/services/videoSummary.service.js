/**
 * 유튜브 영상 직접 분석 기반 AI 3줄 요약 비즈니스 로직 (PRD 2.2).
 *
 * 예전에는 자막을 먼저 스크래핑해 텍스트로 요약했지만, 유튜브의 PoToken 요구로 자막
 * 다운로드 자체가 막혀(providers/gemini.js 상단 설명 참고) Gemini에 영상 URL을 직접
 * 넘겨 요약하는 방식으로 바꿨다. 더 이상 "자막 트랙이 없다"는 별도 실패 사유가 없어
 * (Gemini가 영상을 직접 보므로) summaryStatus는 pending/done/failed만 쓴다.
 *
 * 정책:
 * - 대상은 summaryStatus가 'pending'이거나, 'failed'이면서 재시도 한도를 넘지 않은 영상이다.
 * - 요약 생성 중 오류가 나면(비공개/삭제된 영상, API 오류 등) 'failed'로 표시하고 다음
 *   처리 때 재시도한다. 재시도 한도를 넘으면 더 이상 자동으로 재시도하지 않는다.
 * - 여러 영상을 동시에 처리하되 동시 처리 개수에 상한을 둔다(외부 API 쿼터 보호).
 * - 같은 사용자에 대한 처리 요청이 동시에 여러 번 들어와도 실제로는 한 번만 실행한다.
 * - 영상 하나의 결과는 store.updateVideoFields로 그 영상만 갱신한다(동시에 진행 중일 수
 *   있는 동기화가 목록 전체를 덮어써도 이미 반영된 개별 결과를 잃지 않는다).
 *
 * store/provider 의존성은 매개변수로 주입 가능하게 만들어 테스트를 쉽게 한다.
 */
import * as defaultGemini from '../providers/gemini.js';
import { videoStore as defaultVideoStore } from '../store/videoStore.js';
import { publish as defaultPublish } from './summaryEvents.js';

const SUMMARY_CONCURRENCY = 3;
export const MAX_SUMMARY_RETRIES = 3;

// 사용자별 진행 중인 요약 처리 작업을 추적해 중복 실행을 막는다(단일 프로세스 전제).
const inFlightSummaryRuns = new Map();

async function runWithConcurrency(items, worker, concurrency) {
  let index = 0;

  async function next() {
    while (index < items.length) {
      const current = index++;
      await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

async function summarizeOne(video, googleId, { store, gemini, publish }) {
  try {
    const summary = await gemini.summarizeVideo(video.videoId);
    await store.updateVideoFields(googleId, video.videoId, {
      summaryStatus: 'done',
      summary,
      summaryRetryCount: 0,
    });
    publish(googleId, { videoId: video.videoId, summaryStatus: 'done', summary });
  } catch (err) {
    console.warn(`videoSummary: 요약 생성 실패(videoId=${video.videoId})`, err.message);
    await store.updateVideoFields(googleId, video.videoId, {
      summaryStatus: 'failed',
      summaryRetryCount: (video.summaryRetryCount ?? 0) + 1,
    });
    publish(googleId, { videoId: video.videoId, summaryStatus: 'failed', summary: null });
  }
}

/**
 * 사용자의 pending/재시도 대상 영상을 백그라운드로 요약 처리한다.
 * 호출자는 이 프로미스를 기다리지 않고(fire-and-forget) 바로 응답을 반환해도 된다 —
 * 목록 조회가 요약 완료를 기다리지 않아야 하기 때문이다(PRD 2.2 메타데이터 우선 원칙).
 * @param {{ googleId: string }} params
 */
export async function processPendingSummaries({ googleId }, deps = {}) {
  // task 등록까지 await 없이 동기적으로 처리해야 동시 호출 사이의 경합을 막을 수 있다.
  const existingInFlight = inFlightSummaryRuns.get(googleId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const store = deps.videoStore ?? defaultVideoStore;
  const gemini = deps.gemini ?? defaultGemini;
  const publish = deps.publish ?? defaultPublish;

  const task = (async () => {
    const record = await store.getUserVideoData(googleId);
    if (!record) return;

    const targets = record.videos.filter(
      (video) =>
        video.summaryStatus === 'pending' ||
        (video.summaryStatus === 'failed' && (video.summaryRetryCount ?? 0) < MAX_SUMMARY_RETRIES)
    );

    if (targets.length === 0) return;

    await runWithConcurrency(
      targets,
      (video) => summarizeOne(video, googleId, { store, gemini, publish }),
      SUMMARY_CONCURRENCY
    );
  })();

  inFlightSummaryRuns.set(googleId, task);

  try {
    await task;
  } finally {
    inFlightSummaryRuns.delete(googleId);
  }
}
