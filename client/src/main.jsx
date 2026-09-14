import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
// TODO(테스트용): Google OAuth 리다이렉트 결과 확인용 임시 라우트/화면입니다.
// 테스트가 끝나면 아래 두 import와 <Route> 두 줄을 함께 삭제해주세요.
import OAuthError from './pages/OAuthError.jsx'
import OAuthSuccess from './pages/OAuthSuccess.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/oauth/success" element={<OAuthSuccess />} />
        <Route path="/oauth/error" element={<OAuthError />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
