import { isProduction } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error(err);

  res.status(statusCode).json({
    message: err.message || '서버 내부 오류가 발생했습니다.',
    // 정해진 reason 코드만 노출한다(docs/security.md 4절: 상세 원인은 로그에만).
    ...(err.reason ? { reason: err.reason } : {}),
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
