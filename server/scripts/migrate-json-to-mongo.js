/**
 * server/data/*.json → MongoDB Atlas 일회성 마이그레이션 스크립트.
 *
 * 사용법 (server/ 에서, .env에 MONGODB_URI 설정 후):
 *   node scripts/migrate-json-to-mongo.js
 *
 * - users.json → users 컬렉션
 * - videos.json → videos 컬렉션
 * - 이미 같은 _id(googleId)가 있으면 덮어쓴다(upsert).
 * - JSON 파일이 없으면 해당 컬렉션은 건너뛴다.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { closeMongo, connectMongo, getDb } from '../src/config/mongo.js';
import { env } from '../src/config/env.js';

const DATA_DIR = path.join(process.cwd(), 'data');

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function migrateUsers(db) {
  const data = await readJsonIfExists(path.join(DATA_DIR, 'users.json'));
  if (!data || typeof data !== 'object') {
    console.log('users.json 없음 — users 마이그레이션 건너뜀');
    return 0;
  }

  const collection = db.collection('users');
  let count = 0;

  for (const [googleId, record] of Object.entries(data)) {
    if (!record?.playlistId) continue;
    await collection.updateOne(
      { _id: googleId },
      {
        $set: {
          playlistId: record.playlistId,
          playlistTitle: record.playlistTitle ?? '',
          updatedAt: record.updatedAt ?? new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    count += 1;
  }

  console.log(`users: ${count}건 반영`);
  return count;
}

async function migrateVideos(db) {
  const data = await readJsonIfExists(path.join(DATA_DIR, 'videos.json'));
  if (!data || typeof data !== 'object') {
    console.log('videos.json 없음 — videos 마이그레이션 건너뜀');
    return 0;
  }

  const collection = db.collection('videos');
  let count = 0;

  for (const [googleId, record] of Object.entries(data)) {
    await collection.updateOne(
      { _id: googleId },
      {
        $set: {
          lastSyncedAt: record?.lastSyncedAt ?? null,
          videos: Array.isArray(record?.videos) ? record.videos : [],
        },
      },
      { upsert: true }
    );
    count += 1;
  }

  console.log(`videos: ${count}건 반영`);
  return count;
}

async function main() {
  console.log(`MongoDB Atlas 연결: ${env.mongodb.dbName}`);
  await connectMongo();
  const db = getDb();

  await migrateUsers(db);
  await migrateVideos(db);

  await closeMongo();
  console.log('마이그레이션 완료');
}

main().catch(async (err) => {
  console.error('마이그레이션 실패:', err.message);
  await closeMongo().catch(() => undefined);
  process.exit(1);
});
