import { API_BASE_URL } from './config';

async function parseResponse(res, fallbackMessage) {
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(body.message || fallbackMessage);
    error.status = res.status;
    throw error;
  }

  return body;
}

/**
 * 로그인 사용자의 동기화된 영상 목록을 조회한다. 마지막 동기화 후 3일이 지났으면 서버가
 * 자동으로 재동기화한다. 전용 재생목록이 없으면 409, 로그인하지 않았으면 401을 던진다.
 */
export async function fetchVideos() {
  const res = await fetch(`${API_BASE_URL}/api/videos`, { credentials: 'include' });
  return parseResponse(res, '영상 목록을 불러오지 못했습니다.'); // { videos, lastSyncedAt, synced, syncFailed }
}

/**
 * 3일 주기와 상관없이 즉시 동기화한다("지금 동기화" 버튼용).
 */
export async function syncVideosNow() {
  const res = await fetch(`${API_BASE_URL}/api/videos/sync`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseResponse(res, '동기화 요청이 실패했습니다.'); // { videos, lastSyncedAt, synced, syncFailed }
}

/**
 * "안볼래요" — 유튜브 재생목록과 로컬 목록 양쪽에서 영상을 제거한다.
 */
export async function deleteVideo(videoId) {
  const res = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(res, '영상을 삭제하지 못했습니다.'); // { videos }
}

/**
 * 백그라운드 AI 요약이 영상 하나씩 끝날 때마다 실시간으로 전달받는다(SSE). 새로고침 없이
 * 화면을 갱신하기 위한 용도 — onUpdate는 { videoId, summaryStatus, summary }를 받는다.
 * @returns {() => void} 구독 해제 함수
 */
export function subscribeToSummaryUpdates(onUpdate) {
  const source = new EventSource(`${API_BASE_URL}/api/videos/stream`, { withCredentials: true });

  source.onmessage = (event) => {
    try {
      onUpdate(JSON.parse(event.data));
    } catch {
      // 형식이 이상한 이벤트는 무시한다 — 다음 이벤트나 재조회로 결국 최신 상태가 반영된다.
    }
  };

  return () => source.close();
}
