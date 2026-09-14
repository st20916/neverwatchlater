import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// <BrowserRouter>는 App.jsx 안에 하나만 둔다. 여기서 또 감싸면
// "You cannot render a <Router> inside another <Router>" 에러가 발생한다.
// (자세한 내용: docs/troubleshooting.md)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
