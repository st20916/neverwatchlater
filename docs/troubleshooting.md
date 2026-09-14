# 트러블슈팅 (Troubleshooting)

개발 중 마주친 에러와 해결 방법을 기록합니다. 비슷한 문제를 다시 만났을 때 여기부터 확인하세요.

---

## 1. `Uncaught Error: You cannot render a <Router> inside another <Router>.`

### 증상

브라우저 콘솔에 다음 에러가 뜨고 화면이 렌더링되지 않는다.

```
Uncaught Error: You cannot render a <Router> inside another <Router>. You should never have more than one in your app.
```

### 원인

`react-router-dom`의 `<BrowserRouter>`(또는 `<HashRouter>`, `<MemoryRouter>` 등 `<Router>` 계열 컴포넌트)는 **앱 전체에 단 하나만** 존재해야 한다. 라우터가 두 번 중첩되면 내부적으로 히스토리(history) 객체 관리가 충돌하기 때문에 React Router가 즉시 에러를 던진다.

이 프로젝트에서는 다음과 같이 라우터가 이중으로 선언되어 있었다.

- `client/src/main.jsx`: 최상위에서 `<BrowserRouter>`로 감싸고, `<Route path="/" element={<App />} />` 형태로 `App`을 렌더링
- `client/src/App.jsx`: 내부에서 **또다시** `<BrowserRouter>`로 감싸고 자체 `<Routes>`를 정의

즉, `main.jsx`의 `<BrowserRouter>` 안에서 렌더링된 `<App />`이 자기 내부에 `<BrowserRouter>`를 한 번 더 열면서 라우터가 중첩된 것이다. (참고로 이 구조는 라우터 중첩 외에도, `main.jsx`의 `<Route path="/">`가 정확히 `/`일 때만 매칭되어 `/videos`, `/playlist-setup` 같은 하위 경로에서는 `App`조차 렌더링되지 않는 문제도 함께 갖고 있었다.)

### 해결

**라우터는 한 곳(가장 바깥쪽, 여기서는 `App.jsx`)에만 두고, 그 외 진입점에서는 라우팅 관련 코드를 모두 제거한다.**

1. `main.jsx`에서 `<BrowserRouter>`/`<Routes>`/`<Route>`를 모두 제거하고 `<App />`만 렌더링하도록 정리.

   ```jsx
   // client/src/main.jsx
   import { StrictMode } from 'react'
   import { createRoot } from 'react-dom/client'
   import './index.css'
   import App from './App.jsx'

   createRoot(document.getElementById('root')).render(
     <StrictMode>
       <App />
     </StrictMode>,
   )
   ```

2. 기존에 `main.jsx`에서만 등록했던 라우트(`/oauth/success`, `/oauth/error` 등)는 `App.jsx`의 `<Routes>` 안으로 옮긴다.

   ```jsx
   // client/src/App.jsx (일부)
   <Routes>
     <Route path="/" element={<LandingPage />} />
     {/* ...기존 라우트... */}
     <Route path="/oauth/success" element={<OAuthSuccess />} />
     <Route path="/oauth/error" element={<OAuthError />} />
     <Route path="*" element={<LandingPage />} />
   </Routes>
   ```

3. `App.jsx`의 `<BrowserRouter>`는 그대로 유지 — 앱 전체에서 유일한 라우터가 된다.

### 재발 방지 체크리스트

- [ ] `<BrowserRouter>`(혹은 다른 `<Router>` 계열 컴포넌트)는 프로젝트 전체에서 **정확히 한 번**만 사용한다. `grep -r "BrowserRouter" client/src`로 주기적으로 확인해도 좋다.
- [ ] 새로운 페이지를 추가할 때는 반드시 `App.jsx`의 `<Routes>` 안에 `<Route>`를 추가한다. `main.jsx`나 다른 곳에 별도로 라우팅 로직을 만들지 않는다.
- [ ] 임시 테스트 페이지(예: OAuth 리다이렉트 확인용)를 추가할 때도 같은 `<Routes>`에 등록해서 라우터가 여러 개 생기지 않도록 한다.
