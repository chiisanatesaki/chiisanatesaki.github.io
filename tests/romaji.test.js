import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRomaji } from '../js/romaji.js';

const cases = [
  ['りこ', 'Riko'],
  ['あおい', 'Aoi'],
  ['はるた', 'Haruta'],
  ['ひまり', 'Himari'],
  ['しょうた', 'Shota'],   // 拗音＋ou畳み
  ['ゆうと', 'Yuto'],      // uu畳み
  ['こうき', 'Koki'],      // ou畳み
  ['きっぺい', 'Kippei'],  // 促音
  ['けんいち', 'Kenichi'], // ん
  ['リコ', 'Riko'],        // カタカナ
];

for (const [kana, expected] of cases) {
  test(`${kana} → ${expected}`, () => {
    assert.equal(toRomaji(kana), expected);
  });
}

test('空文字は空を返す', () => {
  assert.equal(toRomaji(''), '');
});
