import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { env, isProduction } from './config/env.js';
import { createSessionMiddleware } from './config/session.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import routes from './routes/index.js';

/** Express 앱을 생성한다. 세션은 express-session 기본 MemoryStore를 사용한다. */
export function createApp() {
  const app = express();

  // 배포 환경에서 리버스 프록시(HTTPS 종료) 뒤에 있을 때 secure 쿠키가 정상 동작하도록 설정.
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  // docs/security.md 3절: HttpOnly, Secure(운영), SameSite=None(운영)/Lax(로컬).
  app.use(createSessionMiddleware());

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
