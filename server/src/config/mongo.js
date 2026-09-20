/**
 * MongoDB Atlas 연결을 담당하는 모듈.
 *
 * store 계층만 이 모듈을 통해 DB에 접근한다. services는 store 인터페이스만 사용한다
 * (CONVENTIONS.md 5.1: store 구현을 교체해도 services는 내부 저장 방식을 알지 못함).
 */
import { MongoClient } from 'mongodb';

import { env } from './env.js';

let client = null;
let db = null;

/**
 * MongoDB Atlas에 연결하고 기본 DB 핸들을 준비한다. 이미 연결되어 있으면 재사용한다.
 * @returns {Promise<import('mongodb').Db>}
 */
export async function connectMongo() {
  if (db) return db;

  if (!env.mongodb.uri) {
    throw new Error(
      'MONGODB_URI가 비어 있습니다. Atlas 연결 문자열을 server/.env에 설정하세요 (.env.example 참고).'
    );
  }

  client = new MongoClient(env.mongodb.uri);
  await client.connect();
  db = client.db(env.mongodb.dbName);

  return db;
}

/**
 * 연결된 DB 핸들을 반환한다. connectMongo() 이전에 호출하면 에러를 던진다.
 * @returns {import('mongodb').Db}
 */
export function getDb() {
  if (!db) {
    throw new Error('MongoDB가 연결되지 않았습니다. 서버 기동 시 connectMongo()를 먼저 호출하세요.');
  }
  return db;
}

/**
 * 연결을 종료한다(테스트/마이그레이션 스크립트용).
 */
export async function closeMongo() {
  if (client) {
    await client.close();
  }
  client = null;
  db = null;
}

/**
 * 테스트에서 외부 DB 핸들을 주입할 때 사용한다. 운영 코드에서는 호출하지 않는다.
 * @param {import('mongodb').Db | null} nextDb
 */
export function setDbForTests(nextDb) {
  db = nextDb;
  if (!nextDb) {
    client = null;
  }
}
