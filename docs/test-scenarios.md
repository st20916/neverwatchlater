# 개발 테스트 시나리오

> 지금까지 구현한 기능(서버 헬스체크, Google OAuth 로그인, 유튜브 전용 재생목록 설정)에
> 대해 실제로 수행한 자동화 테스트와 수동 테스트 시나리오를 정리한 문서입니다. 회귀 확인이
> 필요할 때 이 문서를 따라 재현하세요.
>
> 관련 문서: [`CONVENTIONS.md`](../CONVENTIONS.md) 6절(린트 & 테스트 규칙),
> [`docs/product-specs/auth.md`](./product-specs/auth.md),
> [`docs/product-specs/playlist.md`](./product-specs/playlist.md)(수동 테스트 절차 포함).

---

## 1. 자동화 테스트 커버리지

`server`는 Node 내장 테스트 러너(`node --test`), `client`는 Vitest를 사용합니다.

```bash
cd server && npm run lint && npm test
cd client && npm run lint && npm test
```

### server (`node --test`, 총 24개 테스트)

| 기능 | 테스트 파일 | 검증 내용 |
|---|---|---|
| 헬스체크 | [`server/src/controllers/health.controller.test.js`](../server/src/controllers/health.controller.test.js) | `getHealth` 컨트롤러가 200과 `{ status: 'ok', uptime, timestamp }` 형태를 반환하는지 |
| 헬스체크(통합) / 404 | [`server/src/app.test.js`](../server/src/app.test.js) | `GET /api/health` 200 응답, 정의되지 않은 라우트에 대한 404 응답 |
| Google OAuth 로그인/콜백 | [`server/src/routes/auth.route.test.js`](../server/src/routes/auth.route.test.js) | `GET /api/auth/google`이 `accounts.google.com`으로 302 리다이렉트(+ `state` 포함)하는지, 비로그인 시 `GET /api/auth/me`가 401을 반환하는지, `code`/`state` 누락 시 `/oauth/error?reason=invalid_state`로, Google이 에러를 전달하면 `/oauth/error?reason=oauth_denied`로 리다이렉트하는지 |
| YouTube API 연동 | [`server/src/providers/youtube.test.js`](../server/src/providers/youtube.test.js) | `fetch`를 모킹해 `findPlaylistByTitle`의 페이지네이션 순회/일치 항목 탐색/미일치 시 `null` 반환, `createPlaylist`의 요청 바디(`title`, `privacyStatus`) 및 응답 매핑, YouTube API 에러 응답 시 예외 처리 |
| MongoDB 사용자 저장소 | [`server/src/store/userStore.test.js`](../server/src/store/userStore.test.js) | `mongodb-memory-server`로 격리해 기록 없음(`null`) 조회, 저장 후 조회, 여러 사용자 독립 저장, 동시 쓰기 직렬화 |
| 전용 재생목록 서비스 | [`server/src/services/playlist.service.test.js`](../server/src/services/playlist.service.test.js) | 가짜 store/provider를 주입해 "이미 저장된 기록 있음(YouTube 미호출)", "YouTube에 이미 존재(생성 안 함)", "둘 다 없음(신규 생성)" 3가지 분기 검증 |
| 세션 토큰 갱신 헬퍼 | [`server/src/services/googleSession.service.test.js`](../server/src/services/googleSession.service.test.js) | 세션 없음 → 401, 만료 전 토큰은 그대로 반환, 만료 임박+refreshToken 없음 → 401 |
| 재생목록 API 인증 가드 | [`server/src/routes/playlist.route.test.js`](../server/src/routes/playlist.route.test.js) | 비로그인 상태에서 `POST /api/playlists/setup`, `GET /api/playlists/me` 모두 401 |

### client (Vitest, 총 2개 테스트)

| 기능 | 테스트 파일 | 검증 내용 |
|---|---|---|
| 기본 페이지 렌더링 | [`client/src/App.test.jsx`](../client/src/App.test.jsx) | "Get started" 텍스트 렌더링, 카운터 버튼 클릭 시 값 증가 |

> 참고: OAuth 콜백의 **성공** 경로(`exchangeCodeForTokens` 이후)와 재생목록 설정의
> **전체 성공** 플로우는 실제 Google 계정/브라우저 상호작용이 필요해 자동화 테스트로
> 재현하지 않았습니다. 아래 "수동 테스트 시나리오"로 확인합니다.

---

## 2. 수동 테스트 시나리오

아래는 이번 개발 과정에서 실제로 실행해 확인한 시나리오입니다. 로컬에서 그대로 재현할 수
있습니다.

### 사전 준비

```bash
cd server && npm install && npm run dev   # http://localhost:4000
cd client && npm install && npm run dev   # http://localhost:5173
```

Google 로그인이 포함된 시나리오(2.2, 2.4)는 `server/.env`에 아래 값이 설정되어 있어야
합니다 (`docs/product-specs/auth.md` 5절 참고).

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
SESSION_SECRET=...
```

### 2.1 헬스체크

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing
```

**기대 결과**: `200 OK`, 본문 `{"status":"ok","uptime":...,"timestamp":"..."}`.

### 2.2 Google 로그인 시작 (리다이렉트 확인)

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/auth/google" -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
```

**기대 결과**: `302 Found`, `Location` 헤더가
`https://accounts.google.com/o/oauth2/v2/auth?...&scope=openid...auth/youtube&state=...`
형태(요청한 scope와 CSRF 방지용 `state` 값 포함).

### 2.3 Google 로그인 실패/거부 리다이렉트

**케이스 A — 사용자가 동의 거부(`error=access_denied`)**:

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/auth/google/callback?error=access_denied" -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
```

**기대 결과**: `302`, `Location: http://localhost:5173/oauth/error?reason=oauth_denied`.

**케이스 B — `code`/`state` 없이 콜백 직접 호출(위조/만료된 요청)**:

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/auth/google/callback" -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
```

**기대 결과**: `302`, `Location: http://localhost:5173/oauth/error?reason=invalid_state`.

**케이스 C — 브라우저에서 실제 오류 화면 렌더링 확인**:

1. 브라우저에서 `http://localhost:5173/oauth/error?reason=oauth_denied` 접속.
2. 화면에 "❌ 로그인 실패 (테스트 화면)" 제목, `reason: oauth_denied`, "사용자가 Google
   로그인 동의를 거부했습니다." 안내 문구가 표시되는지 확인.

### 2.4 Google 로그인 성공 + 전용 재생목록 설정 (전체 플로우)

1. 브라우저에서 `http://localhost:4000/api/auth/google` 접속.
2. Google 계정 선택 후 요청된 권한(로그인 정보 + YouTube 관리 권한)에 동의.
   - 이전에 `youtube` scope 없이 로그인한 적이 있다면, `prompt: 'consent'` 설정으로 인해
     다시 동의 화면이 표시됩니다.
3. 로그인 성공 시 `http://localhost:5173/playlist-setup`(PlaylistSetupPage)로 리다이렉트됨을 확인.
4. 화면에 연결된 계정 이메일이 표시되고, 이어서 자동으로 `POST /api/playlists/setup`이
   호출되어 각 단계(계정 연결/재생목록 생성/동기화 대상 지정)가 "완료"로 바뀌며 완료
   문구와 "정리 목록으로 이동" 버튼이 표시되는지 확인.
5. 실제 Google 계정의 YouTube에서 `Neverwatchlater` 재생목록이 생성되었는지 확인.
6. 같은 계정으로 2~4단계를 반복 실행 — 두 번째부터는 `신규 생성 여부: 기존 재생목록 사용`
   (`created: false`)으로 표시되어 멱등성이 유지되는지 확인.

### 2.5 로그인 상태에서의 화면 확인 (브라우저 서브에이전트로 수행)

로그인 세션이 없는 상태에서 `/playlist-setup`, `/oauth/error` 화면 자체가 깨지지 않고
적절한 안내를 보여주는지 브라우저로 직접 확인했습니다.

- `http://localhost:5173/oauth/error?reason=oauth_denied` → 실패 화면과 사유 문구 정상 표시.
- `http://localhost:5173/playlist-setup` → 세션이 없어 `GET /api/auth/me` 호출이 401로
  실패하고, "계정 연결" 단계가 "실패"로 표시되며 오류 메시지와 "재생목록 설정 재시도"
  버튼이 표시됨(예상된 동작).

---

## 3. 알려진 제한사항

- OAuth 콜백의 **성공** 경로와 재생목록 **신규 생성/기존 재사용** 전체 플로우는 실제 Google
  계정과 브라우저 상호작용이 필요해 `node:test`로 자동화하지 못했습니다. 2.4절의 수동 절차로
  검증합니다.
- 재생목록/영상 데이터는 MongoDB Atlas(`users`, `videos` 컬렉션)에 저장한다.
  `server/.env`의 `MONGODB_URI`(Atlas `mongodb+srv://...`)가 설정되어 있어야 서버가 기동된다.
  세션은 여전히 MemoryStore라 다중 인스턴스 운영 시 별도 세션 스토어가 필요하다
  (`docs/product-specs/playlist.md` "TODO(확정필요)" 참고).
- `client/src/pages/OAuthSuccess.jsx`, `OAuthError.jsx`, `OAuthTest.css`,
  `client/src/api/authApi.js`는 테스트 전용 화면으로, 정식 UI가 만들어지면 삭제될 예정입니다.
