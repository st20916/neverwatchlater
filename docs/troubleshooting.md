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

---

## 2. YouTube API `403 Request had insufficient authentication scopes`

### 증상

`POST /api/playlists/setup` 호출 시 서버 로그에 다음과 같은 에러가 남고 클라이언트는 502를 받는다.

```
Request had insufficient authentication scopes.
    at youtubeFetch (.../server/src/providers/youtube.js:33:17)
    at async Module.findPlaylistByTitle (.../server/src/providers/youtube.js:58:18)
    at async ensureDedicatedPlaylist (.../server/src/services/playlist.service.js:40:17)
    at async setupPlaylist (.../server/src/controllers/playlist.controller.js:14:20) {
  statusCode: 502,
  youtubeStatus: 403
}
POST /api/playlists/setup 502 90.067 ms - 756
```

### 원인

`https://www.googleapis.com/auth/youtube` scope는 로그인 기능이 먼저 구현된 뒤에 추가되었다
([`docs/product-specs/auth.md`](./product-specs/auth.md) 1절 참고). 그 **scope 추가 이전에 이미
로그인해 만들어진 세션**은 이 scope에 대한 동의가 없는 액세스 토큰을 갖고 있어, YouTube Data
API(`GET /youtube/v3/playlists`)를 호출하면 403이 발생한다.

### 해결

**1) 즉시 해결(사용자)**: 로그아웃 후 다시 로그인한다. `providers/google-oauth.js`의
`generateAuthUrl`에 `prompt: 'consent'`가 설정되어 있어 재로그인 시 `youtube` scope를
포함한 동의 화면이 다시 표시된다.

**2) 재발 방지(서버 로직)**: YouTube API를 호출하기 전에 세션에 저장된 scope를 먼저 검증해,
불필요하게 YouTube API를 호출하지 않고 더 명확한 에러로 재로그인을 안내하도록 했다.

- `server/src/controllers/auth.controller.js`: 로그인 콜백에서 Google 토큰 응답의
  `scope`(공백 구분 문자열)를 `req.session.googleTokens.scope`에 저장.
- `server/src/services/googleSession.service.js`: `hasYoutubeScope(req)` /
  `assertYoutubeScope(req)` 추가. 세션 scope에 `YOUTUBE_SCOPE`
  (`providers/google-oauth.js`에서 export)가 없으면 `statusCode: 403`,
  `reason: 'insufficient_scope'` 에러를 던진다. 토큰 리프레시 시에도 기존 scope를
  유지한다.
- `server/src/controllers/playlist.controller.js`: `setupPlaylist`에서
  `getValidAccessToken` 전에 `assertYoutubeScope(req)`를 호출해 YouTube API 호출 전에
  걸러낸다.
- `server/src/middlewares/errorHandler.js`: `err.reason`이 있으면 JSON 응답에
  `reason` 필드로 그대로 내려준다(민감 정보 없이 정해진 코드만 노출, `docs/security.md`
  4절).
- `client/src/api/playlistApi.js`: 응답의 `reason`을 `Error.reason`에 담아 그대로 전달.
- `client/src/pages/PlaylistSetupPage.jsx`: `err.reason === 'insufficient_scope'`이면
  "재생목록 설정 재시도" 버튼(재시도로는 해결 안 됨) 대신 로그인 필요 `ConfirmDialog`를
  띄워 재로그인으로 안내한다.

### 재발 방지 체크리스트

- [ ] 새 Google OAuth scope를 추가할 때는 `docs/product-specs/auth.md` 1절에 마이그레이션
  안내를 남기고, 필요하면 `googleSession.service.js`에 해당 scope에 대한 검증 함수를
  추가한다.
- [ ] YouTube(또는 다른 Google API)를 호출하는 새 기능을 만들 때는 실제 API를 호출하기 전에
  세션 scope를 검증해, 모호한 502 대신 명확한 재로그인 안내를 내려준다.

---

## 3. YouTube API `404 Channel not found`

### 증상

`POST /api/playlists/setup` 호출 시 서버 로그에 다음과 같은 에러가 남고 클라이언트는 502를 받는다.

```
Error: Channel not found.
    at youtubeFetch (.../server/src/providers/youtube.js:33:17)
    at async Module.findPlaylistByTitle (.../server/src/providers/youtube.js:58:18)
    at async ensureDedicatedPlaylist (.../server/src/services/playlist.service.js:40:17)
    at async setupPlaylist (.../server/src/controllers/playlist.controller.js:19:20) {
  statusCode: 502,
  youtubeStatus: 404
}
POST /api/playlists/setup 502 437.700 ms - 698
```

### 원인

`playlists.list`를 `mine=true`로 호출하면 YouTube는 **로그인한 Google 계정에 연결된 YouTube
채널**을 대상으로 조회한다. 로그인에 사용한 Google 계정에 **YouTube 채널이 아예 없으면**(한
번도 YouTube를 사용하지 않은 계정 등) 조회 대상 채널 자체가 없어 404 "Channel not found."가
발생한다.

### 해결

채널 생성은 YouTube Data API로 대신할 수 없다(`channels.insert`는 일반 개발자에게 공개되어
있지 않음). 따라서 서버는 이 케이스를 구분해 명확한 reason 코드를 내려주고, 클라이언트는
YouTube의 채널 생성 화면으로 안내한다(2번 항목의 `insufficient_scope`와 동일한 패턴).

- `server/src/services/playlist.service.js`: `ensureDedicatedPlaylist`가
  `youtube.findPlaylistByTitle`/`youtube.createPlaylist` 호출을 래핑해, `youtubeStatus
  === 404`이고 메시지에 "channel"이 포함된 경우에만(다른 404와 구분) `statusCode: 404`,
  `reason: 'no_channel'` 에러로 변환한다(`toDomainError`).
- `client/src/pages/PlaylistSetupPage.jsx`: `err.reason === 'no_channel'`이면
  `ConfirmDialog`로 "YouTube 채널이 없습니다. 채널을 만드시겠습니까?"를 묻는다.
  - "예" → `window.open('https://www.youtube.com/create_channel', ...)`로 채널 생성
    화면을 새 탭에 열고, 다이얼로그를 닫은 뒤 "채널 생성 후 재생목록 설정 재시도" 버튼을
    보여준다(채널 생성은 사용자가 새 탭에서 직접 완료해야 한다).
  - "아니오" → 메인 화면(`/`)으로 이동한다.

### 재발 방지 체크리스트

- [ ] Google API가 계정 상태(채널/조직 등)에 의존하는 404를 반환할 수 있는 기능을 만들 때는
  일반적인 502로 뭉뚱그리지 말고, 서버에서 원인을 구분해 `reason` 코드로 클라이언트에
  전달한다.
- [ ] 사용자가 앱 밖에서 직접 완료해야 하는 작업(채널 생성 등)은 API로 대신하려 하지 말고,
  해당 작업을 할 수 있는 Google 화면으로 안내(새 탭 이동)한다.
