import { BrowserRouter, Route, Routes } from 'react-router-dom';

import GlobalNav from './components/GlobalNav.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import AuthFailedPage from './pages/AuthFailedPage.jsx';
import AuthLoadingPage from './pages/AuthLoadingPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PlaylistSetupPage from './pages/PlaylistSetupPage.jsx';
import VideoListPage from './pages/VideoListPage.jsx';

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
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  </BrowserRouter>
);

export default App;
