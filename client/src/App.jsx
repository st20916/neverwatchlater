import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import GlobalNav from './components/GlobalNav.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import AuthFailedPage from './pages/AuthFailedPage.jsx';
import AuthLoadingPage from './pages/AuthLoadingPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PlaylistSetupPage from './pages/PlaylistSetupPage.jsx';
import VideoListPage from './pages/VideoListPage.jsx';
// TODO(테스트용): Google OAuth 리다이렉트 결과 확인용 임시 화면입니다.
// 테스트가 끝나면 아래 두 import와 <Route> 두 줄을 함께 삭제해주세요.
import OAuthError from './pages/OAuthError.jsx';
import OAuthSuccess from './pages/OAuthSuccess.jsx';

import './App.css';

const CHROME_PATHS = [
  '/auth/loading',
  '/auth/failed',
  '/playlist-setup',
  '/videos',
  '/oauth/success',
  '/oauth/error',
];

const AppLayout = () => {
  const { pathname } = useLocation();
  const showChrome = CHROME_PATHS.includes(pathname);

  return (
    <div className={showChrome ? 'app-shell' : 'app-shell app-shell--guide'}>
      {showChrome ? <GlobalNav /> : null}

      <main className="app-shell__main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/loading" element={<AuthLoadingPage />} />
          <Route path="/auth/failed" element={<AuthFailedPage />} />
          <Route path="/playlist-setup" element={<PlaylistSetupPage />} />
          <Route path="/videos" element={<VideoListPage />} />
          <Route path="/oauth/success" element={<OAuthSuccess />} />
          <Route path="/oauth/error" element={<OAuthError />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </main>

      {showChrome ? <SiteFooter /> : null}
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AppLayout />
  </BrowserRouter>
);

export default App;
