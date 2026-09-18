/**
 * Gemini API 연동을 담당하는 모듈. 유튜브 영상 URL을 직접 전달해 핵심 3줄 요약을 생성한다.
 *
 * 예전에는 자막을 직접 스크래핑해 텍스트로 요약했지만, 유튜브가 자막(timedtext) 엔드포인트에
 * PoToken(BotGuard 기반 봇 검증)을 요구하기 시작하면서(2025~2026년경) 서버에서 직접 자막을
 * 받아오는 방식이 막혔다(200 OK + 빈 본문). 대신 Gemini의 유튜브 URL 직접 분석 기능
 * (contents.parts에 fileData/fileUri로 유튜브 링크를 넣는 방식)을 사용해, 자막 없이도
 * Gemini가 영상을 직접 보고 요약하게 한다.
 *
 * 추가 SDK 없이 fetch로 REST를 직접 호출한다(docs/security.md 6절과 동일한 이유 —
 * providers/youtube.js도 같은 방식).
 * responseSchema로 "정확히 3개의 문자열 배열"을 강제해, 번호/불릿 등 형식이 섞여 들어오는
 * 문제와 후처리 파싱 부담을 줄인다.
 */
import { env } from '../config/env.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SUMMARY_PROMPT = `너는 YouTube 영상의 핵심 내용을 정리하는 요약 에이전트다.

요구사항:
- 영상 내용에 근거해서 핵심 내용 3줄을 만든다.
- 각 항목은 자연스럽고 완결된 한국어 한 문장으로 작성한다.
- 번호, 불릿 기호, 따옴표, 이모지, 서론과 부연 설명을 넣지 않는다.
- 세 문장은 서로 다른 핵심 내용을 담는다.`;

/**
 * 유튜브 영상을 직접 분석해 정확히 3개의 문자열 배열로 요약을 반환한다.
 * @param {string} videoId
 * @returns {Promise<string[]>}
 */
export async function summarizeVideo(videoId, { apiKey, model } = {}) {
  const key = apiKey ?? env.gemini.apiKey;
  const modelName = model ?? env.gemini.model;

  if (!key) {
    const err = new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
    err.statusCode = 500;
    throw err;
  }

  const res = await fetch(`${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}` } },
            { text: SUMMARY_PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          minItems: 3,
          maxItems: 3,
        },
      },
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = body?.error?.message || `Gemini API 요청이 실패했습니다 (status: ${res.status})`;
    const err = new Error(message);
    err.statusCode = 502;
    throw err;
  }

  const rawText = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini 응답에서 요약 텍스트를 찾을 수 없습니다.');
  }

  let summary;
  try {
    summary = JSON.parse(rawText);
  } catch {
    throw new Error('Gemini 응답을 파싱할 수 없습니다.');
  }

  const isValid =
    Array.isArray(summary) &&
    summary.length === 3 &&
    summary.every((line) => typeof line === 'string' && line.trim().length > 0);

  if (!isValid) {
    throw new Error('Gemini 응답이 3줄 요약 형식이 아닙니다.');
  }

  return summary.map((line) => line.trim());
}
