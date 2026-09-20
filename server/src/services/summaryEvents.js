/**
 * 영상 요약 완료를 사용자별로 실시간 구독/발행하는 인메모리 이벤트 허브 (SSE용).
 *
 * inFlightSyncs/inFlightSummaryRuns와 같은 전제(단일 서버 프로세스)를 따른다 — 여러
 * 인스턴스로 수평 확장할 경우 공유 메시지 버스로 교체해야 한다.
 */
import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const eventName = (googleId) => `summary:${googleId}`;

/**
 * googleId의 요약 이벤트를 구독한다.
 * @returns {() => void} 구독 해제 함수
 */
export function subscribe(googleId, listener) {
  const name = eventName(googleId);
  emitter.on(name, listener);
  return () => emitter.off(name, listener);
}

/**
 * googleId를 구독 중인 클라이언트들에게 영상 하나의 요약 결과를 전송한다.
 * @param {string} googleId
 * @param {{ videoId: string, summaryStatus: string, summary: string[] | null }} payload
 */
export function publish(googleId, payload) {
  emitter.emit(eventName(googleId), payload);
}
