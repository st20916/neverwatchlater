import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import LandingHeader from './components/LandingHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import AuthFailedPage from './pages/AuthFailedPage.jsx';
import AuthLoadingPage from './pages/AuthLoadingPage.jsx';
import BulkImportPage from './pages/BulkImportPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PlaylistSetupPage from './pages/PlaylistSetupPage.jsx';
import VideoListPage from './pages/VideoListPage.jsx';
// Google OAuth 로그인 실패 결과 화면 (server/src/controllers/auth.controller.js가 리다이렉트).
// 성공 시에는 /playlist-setup(PlaylistSetupPage)으로 바로 리다이렉트된다.
import OAuthError from './pages/OAuthError.jsx';

import './App.css';

const CHROME_PATHS = [
  '/auth/loading',
  '/auth/failed',
  '/playlist-setup',
  '/videos',
  '/videos/bulk-import',
  '/oauth/error',
];

const AppLayout = () => {
  const { pathname, hash } = useLocation();
  const showChrome = CHROME_PATHS.includes(pathname);

  useEffect(() => {
    if (hash) {
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className={showChrome ? 'app-shell' : 'app-shell app-shell--guide'}>
      <LandingHeader />

      <main className="app-shell__main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/loading" element={<AuthLoadingPage />} />
          <Route path="/auth/failed" element={<AuthFailedPage />} />
          <Route path="/playlist-setup" element={<PlaylistSetupPage />} />
          <Route path="/videos" element={<VideoListPage />} />
          <Route path="/videos/bulk-import" element={<BulkImportPage />} />
          <Route path="/oauth/error" element={<OAuthError />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AppLayout />
  </BrowserRouter>
);

export default App;
