/**
 * 글로벌 내비에 노출하는 서비스 단위 진입점.
 * 인증 로딩·연결 실패 화면은 랜딩 CTA에서 이어지는 흐름으로만 진입한다.
 */
export const PRIMARY_NAV = [
  { path: '/', hash: 'intro', label: '서비스 소개' },
  { path: '/videos', label: '정리 목록' },
  { path: '/playlist-setup', label: '재생목록 설정' },
];

export const getNavTo = (item) =>
  item.hash ? { pathname: item.path, hash: item.hash } : item.path;
