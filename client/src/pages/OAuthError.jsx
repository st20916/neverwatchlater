// TODO(테스트용): 예전 `/oauth/error` 북마크를 제품 실패 화면으로 넘깁니다.
// 테스트가 끝나면 라우트(`App.jsx`)와 함께 삭제해주세요.
import { Navigate, useSearchParams } from 'react-router-dom';

function OAuthError() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const to = reason
    ? `/auth/failed?reason=${encodeURIComponent(reason)}`
    : '/auth/failed';

  return <Navigate to={to} replace />;
}

export default OAuthError;
