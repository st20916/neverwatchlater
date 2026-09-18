import assert from 'node:assert/strict';
import { test } from 'node:test';

import { publish, subscribe } from './summaryEvents.js';

test('subscribe한 googleId로 publish하면 구독자가 이벤트를 받는다', () => {
  const received = [];
  const unsubscribe = subscribe('user-1', (payload) => received.push(payload));

  publish('user-1', { videoId: 'v1', summaryStatus: 'done', summary: ['a', 'b', 'c'] });

  assert.deepEqual(received, [{ videoId: 'v1', summaryStatus: 'done', summary: ['a', 'b', 'c'] }]);
  unsubscribe();
});

test('다른 googleId로 publish된 이벤트는 받지 않는다', () => {
  const received = [];
  const unsubscribe = subscribe('user-1', (payload) => received.push(payload));

  publish('user-2', { videoId: 'v1', summaryStatus: 'done', summary: [] });

  assert.deepEqual(received, []);
  unsubscribe();
});

test('unsubscribe 이후에는 이벤트를 받지 않는다', () => {
  const received = [];
  const unsubscribe = subscribe('user-1', (payload) => received.push(payload));
  unsubscribe();

  publish('user-1', { videoId: 'v1', summaryStatus: 'done', summary: [] });

  assert.deepEqual(received, []);
});

test('구독자가 없는 googleId로 publish해도 에러가 나지 않는다', () => {
  assert.doesNotThrow(() => publish('nobody-subscribed', { videoId: 'v1' }));
});
