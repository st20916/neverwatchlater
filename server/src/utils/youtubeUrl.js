/**
 * 대량 링크 등록(PRD 5.1)에서 붙여넣은 텍스트로부터 유튜브 "영상" URL만 정규식으로
 * 추출/검증하는 순수 유틸리티. 서비스/저장소를 알지 못하므로 다른 도메인에서도
 * 재사용할 수 있다.
 *
 * 지원 형식: 일반 YouTube URL(watch?v=), youtu.be 단축 URL, YouTube Shorts URL.
 * 재생목록 URL(/playlist)이나 그 외 일반 URL은 videoId를 추출하지 못해 자동으로
 * "유효하지 않은 URL"로 분류된다(businesss rule: 재생목록/일반 URL은 등록 대상 아님).
 */

// 텍스트에서 http(s):// 로 시작하는 URL 후보를 통째로 뽑아낸다.
const URL_TOKEN_REGEX = /https?:\/\/[^\s"'<>)]+/gi;

// 문장 안에 URL이 섞여 있을 때 붙는 후행 구두점을 제거한다(예: "...봐주세요(링크).").
const TRAILING_PUNCTUATION_REGEX = /[)\]}>,.;:!?'"]+$/;

// 유튜브 영상 ID는 11자의 영숫자/하이픈/언더스코어 조합이다.
const VIDEO_ID_PATTERN = '[a-zA-Z0-9_-]{11}';

const WATCH_HOST_REGEX = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?/i;
const VIDEO_PARAM_REGEX = new RegExp(`[?&]v=(${VIDEO_ID_PATTERN})(?:[&#]|$)`);
const SHORTS_REGEX = new RegExp(`^https?:\\/\\/(?:www\\.|m\\.)?youtube\\.com\\/shorts\\/(${VIDEO_ID_PATTERN})(?:[/?#]|$)`, 'i');
const YOUTU_BE_REGEX = new RegExp(`^https?:\\/\\/youtu\\.be\\/(${VIDEO_ID_PATTERN})(?:[?#]|$)`, 'i');

/**
 * 붙여넣은 텍스트에서 URL로 보이는 토큰을 모두 추출한다(유효성 판단 이전 단계).
 * @returns {string[]}
 */
export function extractCandidateUrls(text) {
  if (typeof text !== 'string' || text.length === 0) return [];

  const matches = text.match(URL_TOKEN_REGEX) || [];
  return matches.map((raw) => raw.replace(TRAILING_PUNCTUATION_REGEX, ''));
}

/**
 * 하나의 URL 문자열이 유효한 유튜브 "영상" URL인지 검사하고, 맞다면 videoId를 반환한다.
 * 재생목록 URL, 채널 URL, 유튜브 외 일반 URL은 모두 null을 반환한다.
 * @returns {string | null}
 */
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
 * 텍스트에서 유효한 유튜브 영상 URL만 골라 { url, videoId } 형태로 반환한다.
 * 유효하지 않은 URL(재생목록/일반 URL 등)은 결과에 포함되지 않는다 — 호출부에서
 * candidateUrls와 이 함수의 결과를 비교해 "유효하지 않음"을 판정한다.
 */
export function extractValidVideoUrls(text) {
  return extractCandidateUrls(text)
    .map((url) => ({ url, videoId: extractVideoId(url) }))
    .filter((item) => item.videoId !== null);
}
