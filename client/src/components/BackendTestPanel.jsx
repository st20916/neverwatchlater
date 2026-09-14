import { useState } from 'react';

import { fetchCurrentUser, getGoogleLoginUrl, logout } from '../api/authApi';
import { fetchHealth } from '../api/healthApi';
import { getPlaylistStatus, setupDedicatedPlaylist } from '../api/playlistApi';
import './BackendTestPanel.css';

// 각 버튼이 실행할 액션 정의: id, 라벨, 실제 호출 함수.
// 'navigate' 타입은 fetch가 아니라 전체 페이지 이동이 필요한 액션(Google 로그인)이다.
const ACTIONS = [
  { id: 'health', label: '헬스체크 (GET /api/health)', type: 'fetch', run: fetchHealth },
  { id: 'login', label: 'Google 로그인 시작', type: 'navigate', getUrl: getGoogleLoginUrl },
  { id: 'me', label: '내 정보 확인 (GET /api/auth/me)', type: 'fetch', run: fetchCurrentUser },
  { id: 'logout', label: '로그아웃 (POST /api/auth/logout)', type: 'fetch', run: logout },
  {
    id: 'playlist-setup',
    label: '전용 재생목록 설정 (POST /api/playlists/setup)',
    type: 'fetch',
    run: setupDedicatedPlaylist,
  },
  {
    id: 'playlist-status',
    label: '재생목록 상태 확인 (GET /api/playlists/me)',
    type: 'fetch',
    run: getPlaylistStatus,
  },
];

// 컴포넌트 밖의 일반 함수로 분리 — 클릭 핸들러에서만 호출되는 전체 페이지 이동이며,
// 렌더링 중 실행되는 코드가 아니다.
function navigateTo(url) {
  window.location.href = url;
}

function BackendTestPanel() {
  // { [actionId]: { state: 'loading' | 'success' | 'error', data?: unknown, message?: string } }
  const [results, setResults] = useState({});

  const runAction = async (action) => {
    if (action.type === 'navigate') {
      navigateTo(action.getUrl());
      return;
    }

    setResults((prev) => ({ ...prev, [action.id]: { state: 'loading' } }));

    try {
      const data = await action.run();
      setResults((prev) => ({ ...prev, [action.id]: { state: 'success', data } }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [action.id]: { state: 'error', message: err.message },
      }));
    }
  };

  return (
    <section className="backend-test-panel" aria-labelledby="backend-test-panel-heading">
      <h2 id="backend-test-panel-heading">백엔드 연동 테스트</h2>
      <p className="backend-test-panel__hint">
        <code>server/</code>의 API를 직접 호출해 응답을 확인합니다. Google 로그인 관련
        버튼은 로그인 세션(쿠키)이 있어야 성공합니다.
      </p>

      <ul className="backend-test-panel__actions">
        {ACTIONS.map((action) => {
          const result = results[action.id];

          return (
            <li key={action.id} className="backend-test-panel__action">
              <button
                type="button"
                onClick={() => runAction(action)}
                disabled={result?.state === 'loading'}
              >
                {result?.state === 'loading' ? '요청 중...' : action.label}
              </button>

              {result?.state === 'success' && (
                <pre className="backend-test-panel__result backend-test-panel__result--success">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}

              {result?.state === 'error' && (
                <p className="backend-test-panel__result backend-test-panel__result--error">
                  오류: {result.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default BackendTestPanel;
