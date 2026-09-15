// Google OAuth 콜백 실패(`/oauth/error`) 결과 화면.
// server/src/controllers/auth.controller.js의 handleGoogleCallback이 로그인 실패 시
// reason 쿼리 파라미터와 함께 이 경로로 리다이렉트한다.
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import './OAuthTest.css';

const REASON_MESSAGES = {
  oauth_denied: '사용자가 Google 로그인 동의를 거부했습니다.',
  invalid_state: '요청이 유효하지 않습니다 (state 값 불일치). 로그인을 다시 시도해주세요.',
  profile_fetch_failed: 'Google 프로필 정보를 가져오지 못했습니다.',
  token_exchange_failed: '토큰 교환에 실패했습니다. 서버 로그를 확인해주세요.',
};

function OAuthError() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') ?? 'unknown';

  const message = useMemo(
    () => REASON_MESSAGES[reason] ?? `알 수 없는 오류입니다. (reason: ${reason})`,
    [reason],
  );

  return (
    <div className="oauth-test-page oauth-test-page--error">
      <h1>❌ 로그인 실패 (테스트 화면)</h1>
      <p>서버가 `/api/auth/google/callback`에서 여기(`/oauth/error`)로 리다이렉트했습니다.</p>
      <p className="oauth-test-reason">reason: {reason}</p>
      <p>{message}</p>
      <Link to="/">홈으로</Link>
    </div>
  );
}

export default OAuthError;
