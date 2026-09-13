#!/usr/bin/env node
/**
 * preToolUse / beforeReadFile hook
 *
 * docs/security.md 1절 규칙을 실제로 강제한다:
 *   "에이전트는 .env, *.pem, client_secret*.json 을 열거나 수정할 수 없다 (훅이 차단)."
 *
 * 파일을 읽거나(Read) 쓰는(Write, StrReplace, EditNotebook 등) 도구가
 * 시크릿 파일 패턴에 해당하는 경로를 대상으로 하면 차단한다.
 * (.env.example 처럼 "예시" 파일은 허용한다.)
 */

const SECRET_PATTERNS = [
  /(^|[/\\])\.env(\.[^/\\]+)?$/i, // .env, .env.local, .env.production ...
  /\.pem$/i,
  /(^|[/\\])client_secret.*\.json$/i,
];

const ALLOWLIST_PATTERNS = [
  /\.env\.example$/i,
  /\.env\.sample$/i,
];

function isBlockedPath(p) {
  if (!p) return false;
  const normalized = String(p).replace(/\\/g, '/');
  if (ALLOWLIST_PATTERNS.some((re) => re.test(normalized))) return false;
  return SECRET_PATTERNS.some((re) => re.test(normalized));
}

function extractPaths(input) {
  const tool = input.tool_name || input.toolName || '';
  const args = input.tool_input || input.arguments || input.params || {};
  const candidates = [];

  if (typeof args.path === 'string') candidates.push(args.path);
  if (typeof args.file_path === 'string') candidates.push(args.file_path);
  if (typeof args.target_notebook === 'string') candidates.push(args.target_notebook);
  if (Array.isArray(args.paths)) candidates.push(...args.paths);

  return { tool, candidates };
}

let raw = '';
process.stdin.on('data', (chunk) => {
  raw += chunk;
});

process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    // 파싱 실패 시에는 안전하게 통과시킨다 (failClosed 미설정이면 fail-open).
    console.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  const { candidates } = extractPaths(input);
  const blocked = candidates.filter(isBlockedPath);

  if (blocked.length > 0) {
    console.log(
      JSON.stringify({
        permission: 'deny',
        user_message: `보안 정책상 시크릿 파일(${blocked.join(', ')})은 에이전트가 직접 열거나 수정할 수 없습니다. docs/security.md 1절 참고. 값이 필요하면 사용자에게 직접 요청하세요.`,
        agent_message: `docs/security.md 규칙에 의해 차단됨: 시크릿 파일 접근 시도(${blocked.join(', ')}). 이 파일은 직접 읽거나 수정할 수 없습니다.`,
      })
    );
    return;
  }

  console.log(JSON.stringify({ permission: 'allow' }));
});
