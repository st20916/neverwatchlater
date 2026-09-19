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
 * "보관하기"/"보관 해제" — 유튜브 재생목록은 건드리지 않고 D-Day 판정 대상에서만 빼거나
 * 다시 넣는다.
 */
export async function setVideoArchived(videoId, isArchived) {
  const res = await fetch(`${API_BASE_URL}/api/videos/${videoId}/archive`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isArchived }),
  });
  return parseResponse(res, '보관 상태를 변경하지 못했습니다.'); // { video }
}

/**
 * "나중에" — 저장 일자를 현재 시각으로 초기화해 방치 경고(D-Day)를 리셋한다.
 */
export async function resetVideoDday(videoId) {
  const res = await fetch(`${API_BASE_URL}/api/videos/${videoId}/reset-dday`, {
    method: 'PATCH',
    credentials: 'include',
  });
  return parseResponse(res, '저장 일자를 초기화하지 못했습니다.'); // { video }
}

/**
 * 대량 링크 등록 — 붙여넣은 텍스트에서 유효한 유튜브 영상 URL을 추출해 전용 재생목록에
 * 일괄 등록한다. 링크별 성공/실패/유효하지 않음 결과를 함께 받는다.
 */
export async function bulkImportVideos(text) {
  const res = await fetch(`${API_BASE_URL}/api/videos/bulk-import`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return parseResponse(res, '링크 등록에 실패했습니다.'); // { total, successCount, duplicateCount, invalidCount, failedCount, results }
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
