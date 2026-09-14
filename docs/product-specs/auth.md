# Auth (Google OAuth) 스펙

> [`docs/security.md`](../security.md) 2절(Google OAuth) 규칙을 실제로 적용하며 발생하는
> 결정 사항을 기록하는 문서입니다. OAuth scope를 추가/변경하거나 토큰 저장·갱신 방식을 정할 때
> 이 문서를 갱신하세요.

## 상태

기본 로그인 플로우(인증 코드 교환, 세션 저장, 로그아웃)는 구현되었습니다.
운영 배포 전 처리해야 할 항목은 `TODO(확정필요)`로 표시했습니다.

## 구현 위치

- `server/src/providers/google-oauth.js` — 토큰 교환/갱신/폐기를 담당하는 유일한 모듈.
- `server/src/controllers/auth.controller.js` — OAuth 플로우 컨트롤러.
- `server/src/routes/auth.route.js` — `/api/auth/*` 라우트.
  - `GET /api/auth/google` — Google 동의 화면으로 리다이렉트.
  - `GET /api/auth/google/callback` — 인증 코드 교환 + 세션 생성. 성공 시
    `CLIENT_ORIGIN/oauth/success`, 실패 시 `CLIENT_ORIGIN/oauth/error?reason=<코드>`로
    리다이렉트한다(`reason`: `oauth_denied` | `invalid_state` | `profile_fetch_failed` |
    `token_exchange_failed`).
  - `GET /api/auth/me` — 현재 로그인 사용자 조회.
  - `POST /api/auth/logout` — 토큰 폐기(best-effort) + 세션 삭제.

## 1. 요청 Scope

| Scope | 추가 이유 | 추가일 |
|---|---|---|
| `openid` | 표준 OIDC 로그인, `id_token` 발급에 필요 | 2026-09-13 |
| `.../auth/userinfo.email` | 사용자 식별(이메일) | 2026-09-13 |
| `.../auth/userinfo.profile` | 표시 이름/프로필 사진 | 2026-09-13 |
| `.../auth/youtube` | 전용 재생목록(`Neverwatchlater`) 조회·생성·관리 (`playlists.list`, `playlists.insert`). [`docs/product-specs/playlist.md`](./playlist.md) 참고 | 2026-09-14 |

> 규칙: 필요한 최소 범위만 요청한다. 새 scope를 추가할 때는 반드시 이 표에 이유를 남긴다
> (`docs/security.md` 2절).

> ⚠️ **마이그레이션 안내**: `.../auth/youtube` scope가 추가되면서, 이 변경 이전에 이미
> 로그인해 세션을 발급받은 사용자는 새 scope에 대한 동의가 없는 상태입니다. 재생목록
> 기능을 쓰려면 로그아웃 후 **다시 로그인(재동의)** 해야 합니다. `generateAuthUrl`에
> `prompt: 'consent'`가 이미 설정되어 있어 재로그인 시 새 scope를 포함한 동의 화면이
> 다시 표시됩니다.

## 2. 토큰 저장 & 암호화

- 액세스/리프레시 토큰은 현재 `express-session`(서버 메모리, `MemoryStore`)에만 저장한다.
  `server/src/app.js`의 세션 쿠키는 `HttpOnly`, `SameSite=Lax`, 운영 환경에서는 `Secure`.
- `TODO(확정필요)`:
  - 운영 배포 전 `MemoryStore`를 Redis 등 영속 세션 스토어로 교체한다
    (재시작/스케일아웃 시 세션 유지 필요).
  - 리프레시 토큰을 세션이 아닌 별도 저장소에 **암호화(예: AES-256-GCM)** 하여 보관할지
    결정한다. 현재는 세션에만 있어 세션 만료 시 함께 사라진다.
- 토큰 갱신 로직은 `providers/google-oauth.js`(`refreshAccessToken`) 한 곳에만 둔다.
  도메인 코드(컨트롤러 등)는 Google API를 직접 호출해 갱신하지 않는다.

## 3. 연동 해제

- `POST /api/auth/logout` 호출 시 액세스 토큰을 `revokeToken`으로 폐기(best-effort)하고
  세션(`req.session`)을 삭제한다. 토큰 폐기가 실패해도 로그아웃 자체는 계속 진행한다.
- `TODO(확정필요)`: "연동 해제"와 "단순 로그아웃"을 구분할지 결정한다. 현재는 로그아웃 시
  액세스 토큰만 폐기하며, 별도 파생 데이터(예: 요약 캐시)는 아직 없어 삭제 대상이 없다.

## 4. 세션 & CSRF

- 세션 쿠키 옵션: `HttpOnly`, `Secure`(운영), `SameSite=Lax` (`server/src/app.js`).
- OAuth 콜백은 세션에 저장한 랜덤 `state` 값과 콜백 파라미터의 `state`를 대조해 CSRF를
  방지한다 (`redirectToGoogle`/`handleGoogleCallback`).
- `CLIENT_ORIGIN`만 CORS를 허용하고 `credentials: true`로 제한해 다른 origin의 요청을
  차단한다.
- 로그인 성공/로그아웃은 `console.info('[audit] ...')`로 구조적 감사 로그를 남기며, 토큰
  값은 로그에 남기지 않는다. `TODO(확정필요)`: 실제 운영에서는 전용 로거(파일/외부 로그
  수집기)로 교체한다.

## 5. 환경변수

`server/.env.example` 참고:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
SESSION_SECRET=
```

- Google Cloud Console에서 발급받은 OAuth 클라이언트(`client_secret*.json`)의 `client_id`,
  `client_secret`, `redirect_uris` 값을 각자의 로컬 `.env`에 옮겨 적는다.
- `client_secret*.json` 파일 자체는 절대 저장소에 커밋하지 않는다 (`docs/security.md` 1절,
  `.cursor/hooks/block-secrets.js`가 에이전트의 직접 접근을 차단).

## 6. 참고

- [`docs/security.md`](../security.md) — 팀 공통 보안 규칙
- [`CONVENTIONS.md`](../../CONVENTIONS.md) — 팀 코딩 컨벤션
