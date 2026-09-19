import { Link } from 'react-router-dom';

import PlaylistSetupPage from './PlaylistSetupPage.jsx';

import './AuthLoadingPage.css';

const AuthLoadingPage = () => (
  <PlaylistSetupPage initialState="linking" showPreview={false}>
    <nav className="auth-loading__actions" aria-label="프로토타입 이동">
      <Link to="/playlist-setup">인증 성공 화면 보기</Link>
      <Link to="/auth/failed">인증 실패 화면 보기</Link>
    </nav>
  </PlaylistSetupPage>
);

export default AuthLoadingPage;
