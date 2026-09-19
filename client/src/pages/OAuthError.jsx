// TODO(테스트용): 예전 `/oauth/error` 북마크를 제품 실패 화면으로 넘깁니다.
// 테스트가 끝나면 라우트(`App.jsx`)와 함께 삭제해주세요.
import { Navigate, useSearchParams } from 'react-router-dom';

const REASON_MESSAGES = {
  oauth_denied: '사용자가 Google 로그인 동의를 거부했습니다.',
  invalid_state: '요청이 유효하지 않습니다 (state 값 불일치). 로그인을 다시 시도해주세요.',
  profile_fetch_failed: 'Google 프로필 정보를 가져오지 못했습니다.',
  token_exchange_failed: '토큰 교환에 실패했습니다. 서버 로그를 확인해주세요.',
};

function OAuthError() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const to = reason
    ? `/auth/failed?reason=${encodeURIComponent(reason)}`
    : '/auth/failed';

  return <Navigate to={to} replace />;
}

export default OAuthError;
