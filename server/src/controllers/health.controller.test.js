import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getHealth } from './health.controller.js';

test('getHealth는 200과 함께 상태 정보를 반환한다', () => {
  let statusCode;
  let body;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
    },
  };

  getHealth({}, res);

  assert.equal(statusCode, 200);
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.uptime, 'number');
  assert.equal(typeof body.timestamp, 'string');
});
