import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toWareki } from '../js/wareki.js';

const NOW = new Date(2026, 7, 22); // 2026-08-22 固定

test('令和の通常日付を変換する', () => {
  assert.deepEqual(toWareki('2026-08-01', NOW), { text: '令和8年8月1日', warning: null });
});

test('令和元年は「元年」と表記する', () => {
  assert.deepEqual(toWareki('2019-05-01', NOW), { text: '令和元年5月1日', warning: null });
});

test('令和より前は西暦表記＋警告', () => {
  const r = toWareki('2019-04-30', NOW);
  assert.equal(r.text, '2019年4月30日');
  assert.match(r.warning, /令和より前/);
});

test('未来日は変換しつつ警告', () => {
  const r = toWareki('2027-01-01', NOW);
  assert.equal(r.text, '令和9年1月1日');
  assert.match(r.warning, /未来/);
});

test('当日は警告なし', () => {
  assert.equal(toWareki('2026-08-22', NOW).warning, null);
});

test('空文字はnullを返す', () => {
  assert.deepEqual(toWareki('', NOW), { text: null, warning: null });
});
