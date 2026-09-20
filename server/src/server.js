import app from './app.js';
import { assertRequiredEnv, env } from './config/env.js';
import { connectMongo } from './config/mongo.js';

assertRequiredEnv();

try {
  await connectMongo();
  console.log(`🗄️  MongoDB Atlas 연결 완료 (${env.mongodb.dbName})`);
} catch (err) {
  console.error('MongoDB Atlas 연결에 실패했습니다. MONGODB_URI와 Atlas Network Access(IP allowlist)를 확인하세요.');
  console.error(err.message);
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`🚀 서버가 http://localhost:${env.port} 에서 실행 중입니다. (${env.nodeEnv})`);
});
