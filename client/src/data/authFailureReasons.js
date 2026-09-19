export const AUTH_FAILURE_FALLBACK = {
  title: 'Google 계정을 연결하지 못했습니다',
  detail: '알 수 없는 이유로 로그인이 중단되었습니다. 다시 시도해 주세요.',
};

export const AUTH_FAILURE_COPY = {
  oauth_denied: {
    title: '권한 동의가 취소되었습니다',
    detail:
      '유튜브 재생목록 권한에 동의하지 않으면 서비스를 시작할 수 없습니다.',
  },
  invalid_state: {
    title: '인증 요청이 만료되었거나 유효하지 않습니다',
    detail: '보안을 위해 로그인 요청을 다시 시작해 주세요.',
  },
  profile_fetch_failed: {
    title: '계정 정보를 확인하지 못했습니다',
    detail:
      'Google 프로필을 가져오는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.',
  },
  token_exchange_failed: {
    title: '로그인 연결이 중단되었습니다',
    detail: '인증 도중 네트워크 오류 또는 응답 시간 초과가 발생했습니다.',
  },
};

export function getAuthFailureCopy(reason) {
  return AUTH_FAILURE_COPY[reason] ?? AUTH_FAILURE_FALLBACK;
}
