import crypto from 'node:crypto';

import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB URI 경로에서 DB 이름을 뽑는다. 경로가 비어 있으면 기본값을 쓴다.
 * 예: mongodb+srv://user:pass@cluster.mongodb.net/neverwatchlater → neverwatchlater
 */
function resolveMongoDbName(uri, fallback = 'neverwatchlater') {
  if (!uri) return fallback;
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, '');
    // 쿼리만 있는 경우 등 빈 경로면 기본 DB 이름을 쓴다.
    return pathname.split('?')[0] || fallback;
  } catch {
    return fallback;
  }
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback',
  },
  session: {
    // SESSION_SECRET이 없으면 개발/테스트 편의를 위해 임시 시크릿을 생성한다.
    // 이 경우 서버를 재시작하면 기존 세션이 모두 무효화된다. 운영 환경에서는
    // 반드시 SESSION_SECRET을 설정해야 한다 (아래 assertRequiredEnv에서 강제).
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  },
  mongodb: {
    // MongoDB Atlas 연결 문자열. 로컬 기본값은 두지 않는다 (.env.example 참고).
    uri: process.env.MONGODB_URI || '',
    dbName: resolveMongoDbName(process.env.MONGODB_URI || ''),
  },
};

export const isProduction = env.nodeEnv === 'production';

/**
 * 운영 환경에서 필수 시크릿이 비어있으면 즉시 기동을 중단한다.
 * 개발/테스트 환경에서는 경고만 남기고 계속 진행한다(예: 헬스체크만 확인하는 경우).
 */
export function assertRequiredEnv() {
  const missing = [];

  if (!env.google.clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!env.google.clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  // MongoDB Atlas 연결 문자열은 개발/운영 모두 필수다(로컬 Mongo 기본값 없음).
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');

  if (missing.length === 0) return;

  const message = `다음 환경변수가 설정되지 않았습니다: ${missing.join(', ')} (.env.example 참고)`;

  if (isProduction) {
    throw new Error(message);
  }

  console.warn(`⚠️  ${message} — Google 로그인 또는 MongoDB Atlas 연결이 정상 동작하지 않을 수 있습니다.`);
}
