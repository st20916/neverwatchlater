import { isProduction } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error(err);

  res.status(statusCode).json({
    message: err.message || '서버 내부 오류가 발생했습니다.',
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
