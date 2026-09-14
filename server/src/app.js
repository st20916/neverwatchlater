import cors from 'cors';
import express from 'express';
import session from 'express-session';
import morgan from 'morgan';

import { env, isProduction } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import routes from './routes/index.js';

const app = express();

// 배포 환경에서 리버스 프록시(HTTPS 종료) 뒤에 있을 때 secure 쿠키가 정상 동작하도록 설정.
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// docs/security.md 3절: HttpOnly, Secure(운영), SameSite=Lax 이상.
// TODO(확정필요, docs/product-specs/auth.md 2절): 기본 MemoryStore는 운영에 부적합하다.
// 운영 배포 전 Redis 등 영속 세션 스토어로 교체해야 한다.
app.use(
  session({
    name: 'sid',
    secret: env.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24시간
    },
  })
);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
