# 팀 협업 규칙 & 코딩 컨벤션

> 이 문서는 `client`(React + Vite)와 `server`(Node.js + Express) 두 워크스페이스를 함께
> 사용하는 팀 프로젝트의 공통 규칙을 정리한 문서입니다. **코드를 작성/수정하기 전에 반드시
> 먼저 읽고, 여기 정의된 규칙을 기준으로 구현**해야 합니다.
>
> 프론트엔드 디자인/스타일 작업은 이 문서와 함께 [`client/docs/design.md`](./client/docs/design.md)
> (디자인 시스템)도 반드시 참조하세요.

---

## 1. 프로젝트 구조

```
project/
├── client/                # React + Vite 프론트엔드
│   ├── docs/design.md     # 디자인 시스템 문서 (색상/타이포/컴포넌트 스펙)
│   ├── src/
│   │   ├── assets/        # 이미지, 폰트 등 정적 리소스
│   │   ├── components/    # 재사용 가능한 UI 컴포넌트 (필요 시 생성)
│   │   ├── pages/         # 라우트 단위 페이지 (필요 시 생성)
│   │   ├── hooks/         # 커스텀 훅 (필요 시 생성)
│   │   ├── api/           # 서버 API 호출 모듈 (필요 시 생성)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── .oxlintrc.json     # 린트 설정
│
├── server/                 # Node.js + Express 백엔드
│   ├── data/               # 파일 기반 저장소 데이터 (gitignore, .gitkeep으로 폴더만 유지)
│   └── src/
│       ├── config/         # 환경변수 등 설정
│       ├── routes/         # 라우터 (URL ↔ 컨트롤러 연결)
│       ├── controllers/    # 요청/응답 처리 로직
│       ├── middlewares/    # 공통 미들웨어 (에러 처리, 인증 등)
│       ├── services/       # 비즈니스 로직 (예: services/playlist.service.js)
│       ├── providers/      # 외부 API 연동 모듈 (예: providers/google-oauth.js, providers/youtube.js)
│       ├── store/          # 데이터 저장소 접근 모듈 (예: store/userStore.js — 현재는 파일 기반,
│       │                   #   추후 DB로 교체 시 이 계층만 바꾸도록 분리)
│       ├── models/         # DB 모델/스키마 (실제 DB 도입 시 생성)
│       ├── app.js          # express 앱 설정
│       └── server.js       # 앱 실행 진입점
│
├── .cursor/rules/          # Cursor AI 작업 규칙
└── CONVENTIONS.md          # 본 문서
```

새 폴더를 추가할 때도 이 구조(관심사 분리: routes → controllers → services)를 최대한 따릅니다.

---

## 2. Git 컨벤션

### 2.1 브랜치 전략

| 브랜치 | 용도 |
|---|---|
| `main` | 배포 가능한 안정 버전 |
| `develop` | 다음 배포를 위한 통합 브랜치 |
| `feature/{issue-번호}-{내용}` | 기능 개발 (예: `feature/12-login-page`) |
| `fix/{issue-번호}-{내용}` | 버그 수정 |
| `refactor/{내용}` | 리팩터링 |
| `docs/{내용}` | 문서 작업 |

- 모든 작업은 `develop`에서 브랜치를 따고, 완료 후 `develop`으로 PR을 보냅니다.
- `main`은 `develop`에서만 병합합니다(배포 시점).

### 2.2 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <subject>

예)
feat(server): 회원가입 API 추가
fix(client): 로그인 폼 유효성 검사 오류 수정
docs: 협업 컨벤션 문서 추가
refactor(server): 에러 핸들러 공통화
```

| type | 의미 |
|---|---|
| `feat` | 새로운 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 코드 포맷팅, 세미콜론 등 (로직 변경 없음) |
| `refactor` | 기능 변경 없는 코드 개선 |
| `test` | 테스트 코드 추가/수정 |
| `chore` | 빌드, 패키지 매니저 등 기타 변경 |

- `scope`는 `client` 또는 `server`처럼 영향 범위를 적습니다.
- 제목은 명령형/현재형으로 간결하게, 마침표 없이 작성합니다.

### 2.3 Pull Request 규칙

- 제목: 커밋 컨벤션과 동일한 형식 사용 (`feat(client): ...`).
- 본문에 **변경 내용, 테스트 방법, 관련 이슈 번호**를 포함합니다.
- 최소 1명 이상의 리뷰 승인 후 병합합니다. Self-merge는 지양합니다.
- 병합 방식은 `Squash and merge`로 통일해 커밋 히스토리를 깔끔하게 유지합니다.
- `node_modules`, `.env`, 빌드 산출물(`dist/`)은 커밋하지 않습니다 (`.gitignore` 참고).

---

## 3. 공통 코딩 컨벤션 (client + server)

- **모듈 시스템**: 두 워크스페이스 모두 ESM(`"type": "module"`)을 사용합니다.
  `require`/`module.exports` 대신 `import`/`export`를 사용합니다.
- **들여쓰기**: 2 spaces. 탭 사용 금지.
- **문자열**: 단일 인용부호(`'...'`) 사용. JSX 속성은 이중 인용부호(`"..."`).
- **세미콜론**: 문장 끝에 항상 사용.
- **네이밍**
  - 변수, 함수: `camelCase`
  - 컴포넌트, 클래스: `PascalCase`
  - 상수(변경되지 않는 값): `UPPER_SNAKE_CASE`
  - 파일명: React 컴포넌트는 `PascalCase.jsx`, 그 외 모듈(유틸/훅/설정/라우트 등)은
    `camelCase.js` 또는 `역할.종류.js`(예: `health.route.js`, `health.controller.js`) 형식.
- **함수**: 화살표 함수(arrow function)를 기본으로 사용합니다. 단, 클래스 메서드는 예외.
- **비교 연산자**: `==` 대신 `===` 사용.
- **콘솔 로그**: 디버깅용 `console.log`는 커밋 전에 제거하거나 별도 로거로 대체합니다.
- **주석**: "왜(why)"를 설명하는 주석 위주로 작성하고, 코드만으로 알 수 있는 내용은 주석을 달지
  않습니다.
- **import 순서**: 1) 외부 라이브러리 → 2) 내부 모듈(설정/유틸 등) → 3) 상대 경로(같은 도메인)
  순으로 정렬하고, 그룹 사이에 빈 줄을 둡니다.

  ```js
  import cors from 'cors';
  import express from 'express';

  import { env } from './config/env.js';

  import { getHealth } from '../controllers/health.controller.js';
  ```

---

## 4. Client (React + Vite) 컨벤션

- **컴포넌트**: 함수형 컴포넌트 + Hooks만 사용합니다. 클래스 컴포넌트는 사용하지 않습니다.
- **Hooks 규칙**: `.oxlintrc.json`의 `react/rules-of-hooks`(error)를 반드시 지킵니다
  (조건문/반복문 안에서 Hook 호출 금지 등).
- **파일 구조**: 컴포넌트가 늘어나면 `src/components`(재사용 UI), `src/pages`(라우트 단위),
  `src/hooks`(커스텀 훅), `src/api`(서버 통신 모듈) 폴더를 생성해 분리합니다.
- **스타일링**: 컴포넌트별 CSS 파일(`ComponentName.css`)을 같은 폴더에 두거나 전역 스타일은
  `index.css`에 작성합니다. 인라인 스타일(`style={{ ... }}`)은 동적 값이 꼭 필요한 경우에만
  사용합니다.
- **디자인 시스템 준수**: 색상, 타이포그래피, spacing, radius 등은 반드시
  [`client/docs/design.md`](./client/docs/design.md)에 정의된 값을 사용하고, 임의의 값을
  새로 만들지 않습니다. (`.cursor/rules/frontend-design-system.mdc` 규칙과 동일)
- **API 호출**: 컴포넌트 안에서 직접 `fetch`/`axios`를 호출하지 않고, `src/api` 아래 모듈로
  분리한 뒤 컴포넌트에서는 해당 함수를 호출합니다.
- **props/state**: props는 필요한 만큼만 최소한으로 내려주고, 전역 상태가 필요해지면 팀 내
  합의 후 상태관리 라이브러리(Context API, Zustand 등)를 도입합니다.
- **Lint**: 커밋/PR 전에 반드시 실행합니다.

  ```bash
  cd client
  npm run lint
  ```

---

## 5. Server (Node.js + Express) 컨벤션

### 5.1 계층 구조 (관심사 분리)

```
routes → controllers → services → (providers | store | models)
```

- **routes**: URL과 컨트롤러를 연결만 합니다. 로직을 넣지 않습니다.
- **controllers**: `req`/`res`를 다루고, 실제 비즈니스 로직은 `services`에 위임합니다
  (로직이 단순할 때는 controller에 바로 작성해도 되지만, 복잡해지면 service로 분리).
- **services**: 비즈니스 로직. 외부 API(`providers`)나 저장소(`store`/`models`)를 조합해
  하나의 유스케이스를 완성합니다. 테스트하기 쉽도록 의존성을 매개변수로 주입받을 수 있게
  작성하는 것을 권장합니다(`services/playlist.service.js` 참고).
- **providers**: 외부 API(Google OAuth, YouTube Data API 등) 연동을 캡슐화합니다. 특정
  외부 서비스와 관련된 인증/요청 로직은 반드시 해당 provider 모듈 한 곳에만 둡니다.
- **store**: 데이터 저장소 접근을 캡슐화합니다. 지금은 파일 기반이지만, 추후 DB로 교체할 때
  이 계층의 구현만 바꾸면 되도록 `services`는 `store`의 내부 구현(파일/DB)을 알지 못하게
  합니다.
- **middlewares**: 인증, 유효성 검사, 에러 처리 등 여러 라우트에서 공통으로 쓰는 로직.
- **config**: 환경변수, DB 연결 등 설정 값.

### 5.2 라우트/네이밍 규칙

- REST 원칙을 따릅니다: URL은 명사(복수형), 행위는 HTTP 메서드로 표현합니다.

  | 행위 | 메서드 | 예시 |
  |---|---|---|
  | 목록 조회 | `GET` | `/api/users` |
  | 단건 조회 | `GET` | `/api/users/:id` |
  | 생성 | `POST` | `/api/users` |
  | 전체 수정 | `PUT` | `/api/users/:id` |
  | 부분 수정 | `PATCH` | `/api/users/:id` |
  | 삭제 | `DELETE` | `/api/users/:id` |

- 파일명은 도메인 단위로 `도메인.route.js`, `도메인.controller.js`,
  `도메인.service.js` 형식을 사용합니다 (`health.route.js` 참고).
- 모든 API는 `/api` 하위에 둡니다 (`src/routes/index.js`에서 통합).

### 5.3 응답/에러 포맷

- 성공 응답은 데이터 위주로 간결하게 반환하고, 에러 응답은 아래 형식을 기본으로 합니다.

  ```json
  {
    "message": "에러 설명",
    "stack": "개발 환경에서만 포함"
  }
  ```

- 컨트롤러/서비스에서 에러가 발생하면 직접 `res`를 다루지 말고 `next(error)`로 넘겨
  `middlewares/errorHandler.js`에서 일괄 처리합니다.
- 상태 코드가 필요한 커스텀 에러는 `error.statusCode`를 지정합니다.

  ```js
  const error = new Error('사용자를 찾을 수 없습니다.');
  error.statusCode = 404;
  next(error);
  ```

### 5.4 환경 변수

- 모든 환경변수는 `.env`(로컬, 커밋 금지)에 두고, 새 변수를 추가하면 `.env.example`에도
  키를 추가합니다(값은 예시/빈 값).
- 코드에서는 `process.env`를 직접 참조하지 않고 `src/config/env.js`를 통해서만 접근합니다.

### 5.5 비동기 처리

- `async/await`를 사용하고, 컨트롤러/서비스 함수는 반드시 `try/catch`로 감싸 에러를
  `next(error)`로 전달합니다.

---

## 6. 린트 & 테스트 규칙

### 6.1 린트 (oxlint)

- `client`, `server` 모두 [`oxlint`](https://oxc.rs)를 사용합니다. 워크스페이스 루트에
  `.oxlintrc.json`을 두고, 규칙을 바꿀 때는 반드시 이유를 커밋 메시지에 남깁니다.
- 코드를 수정한 뒤에는 해당 워크스페이스에서 아래 명령을 실행해 경고/에러가 없는지 확인합니다.

  ```bash
  cd client && npm run lint
  cd server && npm run lint
  ```

- lint 경고를 임시로 끄기 위한 `eslint-disable` 계열 주석은 사용하지 않습니다. 규칙이 정말
  맞지 않다면 `.oxlintrc.json`에서 규칙 자체를 조정하고 이유를 남깁니다.
- 사용하지 않는 함수 매개변수는 언더스코어(`_req`, `_next`)로 표시하거나 매개변수를
  제거해 경고를 없앱니다.

### 6.2 테스트

- **client**: [Vitest](https://vitest.dev) + [`@testing-library/react`](https://testing-library.com/react)
  를 사용합니다. 테스트 환경은 `jsdom`이며 `vite.config.js`의 `test` 옵션과
  `src/test/setup.js`(jest-dom matcher 등록)로 설정되어 있습니다.
- **server**: 별도 프레임워크 없이 Node.js 내장 테스트 러너(`node:test` +
  `node:assert/strict`)를 사용합니다. 외부 요청 검증에는 Node의 전역 `fetch`와
  `app.listen(0)`(임의 포트)로 서버를 띄우는 방식을 사용합니다.
- **테스트 파일 위치/네이밍**: 테스트 대상 파일과 같은 폴더에 `대상파일명.test.js`(또는
  `.jsx`)로 둡니다 (예: `health.controller.js` → `health.controller.test.js`).
- **작성 기준**: 새로운 API 라우트/컨트롤러, 그리고 로직이 있는 React 컴포넌트(단순 마크업만
  있는 컴포넌트는 예외)를 추가하면 최소 1개 이상의 테스트를 함께 작성합니다.
  - server 컨트롤러: 정상 케이스 + 주요 에러 케이스(4xx/5xx)를 각각 검증합니다.
  - server 라우트(app 단위): 실제 HTTP 요청/응답(status code, body)을 검증합니다.
  - client 컴포넌트: 사용자 관점의 렌더링 결과와 상호작용(클릭, 입력 등)을 검증하고,
    구현 세부사항(내부 state 등)은 테스트하지 않습니다.
- 코드를 수정한 뒤에는 해당 워크스페이스에서 아래 명령을 실행해 모든 테스트가 통과하는지
  확인합니다.

  ```bash
  cd client && npm run test
  cd server && npm run test
  ```

  개발 중에는 `npm run test:watch`로 변경 시마다 자동 재실행할 수 있습니다.

---

## 7. 커밋 전 체크리스트

- [ ] `client`: `npm run lint` 통과
- [ ] `client`: `npm run test` 통과
- [ ] `server`: `npm run lint` 통과
- [ ] `server`: `npm run test` 통과, 서버가 에러 없이 기동되는지 확인 (`npm run dev`)
- [ ] `.env`, `node_modules`, 빌드 산출물이 diff에 포함되지 않았는지 확인
- [ ] 커밋 메시지가 Conventional Commits 형식을 따르는지 확인
- [ ] 새로 추가한 환경변수를 `.env.example`에도 반영했는지 확인
- [ ] 새 API 라우트/컨트롤러나 로직이 있는 컴포넌트를 추가했다면 테스트도 함께 추가했는지 확인

---

## 8. 참고 문서

- [`client/docs/design.md`](./client/docs/design.md) — 프론트엔드 디자인 시스템 (색상, 타이포, 컴포넌트 스펙)
- [`docs/security.md`](./docs/security.md) — 보안 규칙 (시크릿, OAuth, 토큰, 세션, 로그)
- `.cursor/rules/` — Cursor AI 작업 시 자동으로 적용되는 규칙 모음
