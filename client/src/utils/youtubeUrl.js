// 대량 링크 등록(붙여넣기) 화면에서 "등록" 버튼 활성화 여부를 판단하기 위한 클라이언트용
// 유효한 유튜브 영상 URL 미리 판별 유틸. 실제 등록 대상 판정과 결과는 서버
// (server/src/utils/youtubeUrl.js, services/videoBulkImport.service.js)가 최종적으로
// 수행하므로, 이 파일은 로직을 최대한 동일하게 맞추되 UI 반응성을 위한 용도로만 쓴다.

const URL_TOKEN_REGEX = /https?:\/\/[^\s"'<>)]+/gi;
const TRAILING_PUNCTUATION_REGEX = /[)\]}>,.;:!?'"]+$/;

const VIDEO_ID_PATTERN = '[a-zA-Z0-9_-]{11}';
const WATCH_HOST_REGEX = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?/i;
const VIDEO_PARAM_REGEX = new RegExp(`[?&]v=(${VIDEO_ID_PATTERN})(?:[&#]|$)`);
const SHORTS_REGEX = new RegExp(`^https?:\\/\\/(?:www\\.|m\\.)?youtube\\.com\\/shorts\\/(${VIDEO_ID_PATTERN})(?:[/?#]|$)`, 'i');
const YOUTU_BE_REGEX = new RegExp(`^https?:\\/\\/youtu\\.be\\/(${VIDEO_ID_PATTERN})(?:[?#]|$)`, 'i');

export function extractCandidateUrls(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const matches = text.match(URL_TOKEN_REGEX) || [];
  return matches.map((raw) => raw.replace(TRAILING_PUNCTUATION_REGEX, ''));
}

export function extractVideoId(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();

  if (WATCH_HOST_REGEX.test(url)) {
    const match = VIDEO_PARAM_REGEX.exec(url);
    return match ? match[1] : null;
  }

  const shortsMatch = SHORTS_REGEX.exec(url);
  if (shortsMatch) return shortsMatch[1];

  const shortMatch = YOUTU_BE_REGEX.exec(url);
  if (shortMatch) return shortMatch[1];

  return null;
}

/**
 * 붙여넣은 텍스트에 유효한 유튜브 영상 URL이 1개 이상 있는지(고유 videoId 기준) 센다.
 * "등록" 버튼 활성화 조건에 사용한다.
 */
export function countValidVideoUrls(text) {
  const ids = extractCandidateUrls(text)
    .map((url) => extractVideoId(url))
    .filter((id) => id !== null);
  return new Set(ids).size;
}
