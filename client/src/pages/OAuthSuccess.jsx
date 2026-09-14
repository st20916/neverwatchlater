// TODO(테스트용): Google OAuth 콜백 성공(`/oauth/success`) 확인용 임시 테스트 화면입니다.
// 테스트가 끝나면 라우트(main.jsx)와 함께 삭제해주세요.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchCurrentUser } from '../api/authApi';
import { setupDedicatedPlaylist } from '../api/playlistApi';
import './OAuthTest.css';

function OAuthSuccess() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // 문서 기획(1.2 전용 재생목록 설정) 기준: 'loading' | 'success' | 'error' | 'idle'
  const [playlistStatus, setPlaylistStatus] = useState('idle');
  const [playlistResult, setPlaylistResult] = useState(null);
  const [playlistError, setPlaylistError] = useState(null);

  const runPlaylistSetup = useCallback(() => {
    setPlaylistStatus('loading');
    setPlaylistError(null);

    setupDedicatedPlaylist()
      .then((result) => {
        setPlaylistResult(result);
        setPlaylistStatus('success');
      })
      .catch((err) => {
        setPlaylistError(err.message);
        setPlaylistStatus('error');
      });
  }, []);

  useEffect(() => {
    fetchCurrentUser()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        setStatus('success');
        // 기획서 1.2절: "Google 로그인과 유튜브 권한 동의가 성공하면 서비스가 전용
        // 재생목록 설정을 자동으로 시작한다" — 로그인 확인 직후 자동 트리거.
        runPlaylistSetup();
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, [runPlaylistSetup]);

  return (
    <div className="oauth-test-page oauth-test-page--success">
      <h1>✅ 로그인 성공 (테스트 화면)</h1>
      <p>서버가 `/api/auth/google/callback`에서 여기(`/oauth/success`)로 리다이렉트했습니다.</p>

      {status === 'loading' && <p>세션에서 사용자 정보를 불러오는 중...</p>}

      {status === 'success' && (
        <div className="oauth-test-card">
          <p>
            <strong>이메일</strong>: {user.email}
          </p>
          <p>
            <strong>이름</strong>: {user.name}
          </p>
          <p>
            <strong>Google ID</strong>: {user.googleId}
          </p>
        </div>
      )}

      {status === 'error' && (
        <p className="oauth-test-warning">`GET /api/auth/me` 호출 실패: {error}</p>
      )}

      {status === 'success' && (
        <div className="oauth-test-card">
          <h2>전용 재생목록 설정 (Neverwatchlater)</h2>

          {playlistStatus === 'loading' && <p>재생목록을 확인/생성하는 중...</p>}

          {playlistStatus === 'success' && (
            <div>
              <p>
                <strong>Playlist ID</strong>: {playlistResult.playlistId}
              </p>
              <p>
                <strong>신규 생성 여부</strong>: {playlistResult.created ? '새로 생성함' : '기존 재생목록 사용'}
              </p>
            </div>
          )}

          {playlistStatus === 'error' && (
            <div>
              <p className="oauth-test-warning">설정 실패: {playlistError}</p>
              <button type="button" onClick={runPlaylistSetup}>
                다시 시도
              </button>
            </div>
          )}
        </div>
      )}

      <Link to="/">홈으로</Link>
    </div>
  );
}

export default OAuthSuccess;
