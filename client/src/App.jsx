import { BrowserRouter, Route, Routes } from 'react-router-dom';

import GlobalNav from './components/GlobalNav.jsx';
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

const App = () => (
  <BrowserRouter>
    <div className="app-shell">
      <GlobalNav />

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
  </BrowserRouter>
);

export default App;
