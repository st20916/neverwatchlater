# Auth (Google OAuth) 스펙

> [`docs/security.md`](../security.md) 2절(Google OAuth) 규칙을 실제로 적용하며 발생하는
> 결정 사항을 기록하는 문서입니다. OAuth scope를 추가/변경하거나 토큰 저장·갱신 방식을 정할 때
> 이 문서를 갱신하세요.

## 상태

`TODO(확정필요)` — 아직 실제 OAuth 연동이 구현되지 않았습니다. 아래 항목은 구현 시점에 채워야
합니다.

## 1. 요청 Scope

| Scope | 추가 이유 | 추가일 |
|---|---|---|
| _(예: `openid`, `email`, `profile`)_ | _아직 미정_ | - |

> 규칙: 필요한 최소 범위만 요청한다. 새 scope를 추가할 때는 반드시 이 표에 이유를 남긴다
> (`docs/security.md` 2절).

## 2. 토큰 저장 & 암호화

- 액세스 토큰: 단기 보관 (`TODO(확정필요)`: 저장 위치 — 메모리 / Redis / DB 세션 등)
- 리프레시 토큰: 암호화 저장 (`TODO(확정필요)`: 암호화 방식 — 예: AES-256-GCM, KMS 등, 저장소)
- 토큰 갱신 로직은 `providers/google-oauth` 모듈 한 곳에만 둔다. 도메인 코드는 갱신 로직을
  직접 호출하지 않는다.

## 3. 연동 해제

- 사용자가 연동을 해제하면 저장된 액세스/리프레시 토큰과 파생 데이터를 즉시 삭제한다.
- 해제 처리 엔드포인트/흐름: `TODO(확정필요)`.

## 4. 세션

- 세션 쿠키 옵션: `HttpOnly`, `Secure`, `SameSite=Lax` 이상 (`docs/security.md` 3절).
- 상태 변경 요청(로그인/로그아웃/권한 변경 등)에는 CSRF 방어가 있어야 한다.
- 로그인·로그아웃·권한 변경은 구조적 감사 로그로 남기고, 토큰 값 자체는 로그에 남기지 않는다.

## 5. 참고

- [`docs/security.md`](../security.md) — 팀 공통 보안 규칙
- [`CONVENTIONS.md`](../../CONVENTIONS.md) — 팀 코딩 컨벤션
