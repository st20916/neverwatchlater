import app from './app.js';
import { assertRequiredEnv, env } from './config/env.js';

assertRequiredEnv();

app.listen(env.port, () => {
  console.log(`🚀 서버가 http://localhost:${env.port} 에서 실행 중입니다. (${env.nodeEnv})`);
});
