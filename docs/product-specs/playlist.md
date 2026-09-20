# 전용 재생목록 (Neverwatchlater) 스펙

> 기획 문서 "1.2 전용 재생목록 설정" 구현 내용을 기록합니다. 정책이나 데이터 모델을
> 바꿀 때는 이 문서를 갱신하세요. Google OAuth scope/토큰 관련 내용은
> [`docs/product-specs/auth.md`](./auth.md)를 함께 참고하세요.

## 정책

- 전용 재생목록의 이름은 **`Neverwatchlater`** 로 고정한다(`server/src/services/playlist.service.js`의
  `PLAYLIST_TITLE`).
- 사용자별 동기화 대상 전용 재생목록은 **1개만** 허용한다.
- 기본 유튜브 "나중에 볼 동영상" 재생목록은 조회·수정하지 않는다(API로 접근 불가하기도 함).
- 재생목록 확보는 **멱등적**이다: 이미 설정된 사용자가 다시 요청해도 기존 재생목록을 유지하고
  새로 만들지 않는다.
- 생성되는 재생목록의 공개 범위(`privacyStatus`)는 기본값 `private`으로 한다.

## 구현 위치 및 흐름

1. `server/src/providers/youtube.js` — YouTube Data API v3 REST 호출(추가 패키지 없이 `fetch` 사용).
   - `findPlaylistByTitle(accessToken, title)` — `GET /youtube/v3/playlists?mine=true` 페이지네이션
     순회로 제목이 정확히 일치하는 재생목록을 찾는다.
   - `createPlaylist(accessToken, title, options)` — `POST /youtube/v3/playlists`.
2. `server/src/store/userStore.js` — `googleId → { playlistId, playlistTitle, updatedAt }` 매핑을
   MongoDB `users` 컬렉션에 저장한다(아래 "저장소" 절 참고).
3. `server/src/services/googleSession.service.js` — 세션의 Google 액세스 토큰이 만료되었거나
   곧 만료되면 `providers/google-oauth.js`의 `refreshAccessToken`으로 갱신한다.
4. `server/src/services/playlist.service.js` — `ensureDedicatedPlaylist({ googleId, accessToken })`:
   저장소 조회 → (없으면) YouTube 조회 → (없으면) 생성 → 저장, 순서로 처리한다.
5. `server/src/controllers/playlist.controller.js` + `server/src/routes/playlist.route.js` —
   HTTP API로 노출.
6. `server/src/middlewares/requireAuth.js` — 로그인 세션이 없으면 401.

## API

모두 로그인 세션(`req.session.user`)이 필요하며, 없으면 `401 { message: "로그인이 필요합니다." }`.

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/api/playlists/setup` | 전용 재생목록을 확보한다(멱등). 응답: `{ playlistId, created }` |
| `GET` | `/api/playlists/me` | 저장소에 기록된 현재 상태만 조회(YouTube 재조회 없음). 응답: `{ playlist: { playlistId, playlistTitle, updatedAt } | null }` |

## 저장소 (MongoDB Atlas)

- 연결: `MONGODB_URI` (`server/src/config/env.js` → `server/src/config/mongo.js`).
  MongoDB Atlas `mongodb+srv://...` 연결 문자열을 사용한다(로컬 Mongo 기본값 없음).
- 컬렉션: `users`
- 문서 구조:
  ```json
  {
    "_id": "<googleId>",
    "playlistId": "PLxxxxxxxxxxxxxxxx",
    "playlistTitle": "Neverwatchlater",
    "updatedAt": "2026-09-14T00:00:00.000Z"
  }
  ```
- 토큰 등 민감 정보는 저장하지 않는다(`docs/security.md` 5절: 사용자 데이터 최소화). 액세스/
  리프레시 토큰은 계속 `express-session` 메모리 세션에만 유지된다.
- 같은 `googleId`에 대한 쓰기는 프로세스 내 큐로 직렬화한다.
- 기존 `server/data/users.json`이 있으면 `npm run migrate:json-to-mongo`로 이전할 수 있다.

### TODO(확정필요) — 운영 전 정리 필요

- `express-session` 기본 MemoryStore는 다중 인스턴스에 부적합하다. 운영 배포 전 Redis 등
  영속 세션 스토어로 교체가 필요하다.
- `findPlaylistByTitle`은 매 설정 요청마다 저장소에 기록이 없을 때만 YouTube를 조회한다.
  사용자가 YouTube에서 직접 재생목록 이름을 바꾸거나 삭제해도 로컬 기록은 갱신되지 않는다.
  필요하면 주기적 재검증(예: `GET /api/playlists/me`에서 YouTube에 실존 여부 확인) 로직을
  추가한다.
- 재생목록 연동 해제 시(계정 연결 해제) `docs/product-specs/auth.md` 3절과 연동해 저장된
  재생목록 매핑도 삭제할지 결정이 필요하다.

## 수동 테스트 절차 (전체 플로우)

자동화 테스트(`server/src/routes/playlist.route.test.js`)는 인증 가드(401)만 검증합니다.
실제 YouTube 연동까지 확인하려면:

1. `server/.env`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` 설정
   (`docs/product-specs/auth.md` 5절 참고).
2. `server`, `client` 모두 `npm run dev`로 기동.
3. 브라우저에서 `http://localhost:4000/api/auth/google` 접속 → Google 로그인 및 동의
   (scope에 YouTube 관리 권한이 새로 추가되었으므로, 기존에 로그인한 적이 있어도 다시
   동의 화면이 표시된다).
4. 로그인 성공 시 `client`의 `/oauth/success` 테스트 화면으로 리다이렉트되고, 화면에서
   자동으로 `POST /api/playlists/setup`을 호출해 결과(`playlistId`, 신규 생성 여부)를 표시한다.
5. 실제 Google 계정의 YouTube에서 `Neverwatchlater` 재생목록이 생성/확인되는지 확인한다.
6. 같은 계정으로 다시 `/api/auth/google`부터 반복해, 두 번째부터는 `created: false`로
   기존 재생목록이 재사용되는지 확인한다(멱등성 검증).

## 참고

- [`docs/product-specs/auth.md`](./auth.md) — Google OAuth scope, 토큰/세션 규칙
- [`docs/security.md`](../security.md) — 팀 공통 보안 규칙
- [`CONVENTIONS.md`](../../CONVENTIONS.md) — 팀 코딩 컨벤션
