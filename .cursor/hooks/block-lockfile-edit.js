#!/usr/bin/env node
/**
 * preToolUse hook
 *
 * docs/security.md 6절 규칙을 실제로 강제한다:
 *   "락파일은 도구가 갱신한다. 손으로 편집하지 않는다 (훅이 차단)."
 *
 * Write/StrReplace 같은 편집 도구가 lock 파일(package-lock.json 등)을
 * 직접 대상으로 하면 차단한다. npm/pnpm/yarn 같은 셸 명령을 통한 갱신은
 * beforeShellExecution이 아니라 preToolUse만 검사하므로 영향받지 않는다.
 */

const LOCKFILE_PATTERNS = [
  /package-lock\.json$/i,
  /npm-shrinkwrap\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
];

function isLockfilePath(p) {
  if (!p) return false;
  const normalized = String(p).replace(/\\/g, '/');
  return LOCKFILE_PATTERNS.some((re) => re.test(normalized));
}

function extractPaths(input) {
  const args = input.tool_input || input.arguments || input.params || {};
  const candidates = [];

  if (typeof args.path === 'string') candidates.push(args.path);
  if (typeof args.file_path === 'string') candidates.push(args.file_path);
  if (Array.isArray(args.paths)) candidates.push(...args.paths);

  return candidates;
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
    console.log(JSON.stringify({ permission: 'allow' }));
    return;
  }

  const candidates = extractPaths(input);
  const blocked = candidates.filter(isLockfilePath);

  if (blocked.length > 0) {
    console.log(
      JSON.stringify({
        permission: 'deny',
        user_message: `락파일(${blocked.join(', ')})은 직접 수정할 수 없습니다. npm/pnpm/yarn install 등 패키지 매니저를 통해서만 갱신하세요. docs/security.md 6절 참고.`,
        agent_message: `docs/security.md 규칙에 의해 차단됨: 락파일 직접 편집 시도(${blocked.join(', ')}). 패키지 매니저 명령으로 갱신하세요.`,
      })
    );
    return;
  }

  console.log(JSON.stringify({ permission: 'allow' }));
});
