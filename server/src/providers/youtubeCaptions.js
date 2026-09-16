/**
 * YouTube 영상의 자막(캡션) 텍스트를 가져오는 모듈.
 *
 * YouTube Data API v3의 captions.download는 원칙적으로 "영상을 소유한 채널"만 자막을
 * 내려받을 수 있어, 사용자가 저장한 임의의 공개 영상 자막을 가져오는 용도로는 쓸 수 없다.
 * 대신 영상 시청 페이지에 내장된 자막 트랙 목록(플레이어 데이터의 captionTracks)을 읽어
 * 공개 자막(수동 자막 + 자동 생성 자막) URL을 얻고, 그 URL에서 자막 텍스트를 가져온다.
 *
 * 이 방식은 비공식이라 YouTube가 페이지 구조를 바꾸면 동작하지 않을 수 있다 — 그 경우
 * 예외를 던지지 않고 null을 반환해 상위 로직이 "자막 없음"으로 안전하게 처리하게 한다
 * (일시적 네트워크 오류처럼 재시도해야 하는 경우에는 예외를 던진다. 아래 getTranscript 참고).
 */

const PREFERRED_LANGS = ['ko', 'en'];

async function fetchWatchPageHtml(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  });

  if (!res.ok) {
    throw new Error(`영상 페이지를 불러오지 못했습니다 (status: ${res.status})`);
  }

  return res.text();
}

/**
 * HTML 안에서 `"key":[...]` 형태의 JSON 배열 부분만 괄호 짝을 세어 안전하게 추출한다.
 * 정규식만으로는 배열 안의 중첩 구조 때문에 깨지기 쉬워 직접 스캔한다.
 */
function extractJsonArrayAfterKey(source, key) {
  const marker = `"${key}":`;
  const startIdx = source.indexOf(marker);
  if (startIdx === -1) return null;

  let i = startIdx + marker.length;
  while (i < source.length && source[i] !== '[') i++;
  if (source[i] !== '[') return null;

  let depth = 0;
  let end = i;
  for (; end < source.length; end++) {
    if (source[end] === '[') depth++;
    else if (source[end] === ']') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }

  try {
    return JSON.parse(source.slice(i, end));
  } catch {
    return null;
  }
}

/**
 * 자막 트랙 목록에서 한국어 → 영어 순으로 사용 가능한 트랙을 고른다.
 * 수동 자막과 자동 생성 자막(kind: 'asr') 모두 대상에 포함한다.
 */
function selectTrack(tracks) {
  if (!Array.isArray(tracks)) return null;

  for (const lang of PREFERRED_LANGS) {
    const track = tracks.find((t) => (t.languageCode || '').toLowerCase().startsWith(lang));
    if (track) return track;
  }

  return null;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function parseTranscriptXml(xml) {
  const lines = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match = regex.exec(xml);

  while (match) {
    const decoded = decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim();
    if (decoded) lines.push(decoded);
    match = regex.exec(xml);
  }

  return lines.join(' ');
}

/**
 * 영상의 자막 텍스트를 가져온다.
 * @returns {Promise<string | null>} 자막 텍스트, 자막 트랙 자체가 없으면 null
 * @throws 영상 페이지/자막 데이터 요청이 네트워크 오류 등으로 실패한 경우(일시적 오류 —
 *   호출부에서 재시도 가능한 실패로 처리해야 한다)
 */
export async function getTranscript(videoId) {
  const html = await fetchWatchPageHtml(videoId);

  const tracks = extractJsonArrayAfterKey(html, 'captionTracks');
  const track = selectTrack(tracks);
  if (!track?.baseUrl) return null;

  const res = await fetch(track.baseUrl);
  if (!res.ok) {
    throw new Error(`자막 데이터를 가져오지 못했습니다 (status: ${res.status})`);
  }

  const xml = await res.text();
  const text = parseTranscriptXml(xml);

  return text.length > 0 ? text : null;
}
