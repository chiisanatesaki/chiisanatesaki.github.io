import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcPrice, isValidCombo } from '../js/pricing.js';

const base = { frame: false, wrapping: false, paperType: 'washi', canvasSize: 'f0' };
const cases = [
  [{ ...base, size: 'hagaki', material: 'paper' }, 2000],
  [{ ...base, size: 'hagaki', material: 'paper', frame: true }, 3000],
  [{ ...base, size: 'hagaki', material: 'canvas', canvasSize: 'f0' }, 2500],
  [{ ...base, size: 'a4', material: 'paper' }, 2500],
  [{ ...base, size: 'a4', material: 'paper', frame: true }, 3500],
  [{ ...base, size: 'a4', material: 'canvas', canvasSize: 'f3' }, 3000],
];

for (const [sel, expected] of cases) {
  test(`${sel.size}/${sel.material}/frame=${sel.frame} は ${expected}円`, () => {
    assert.equal(calcPrice(sel), expected);
  });
}

test('紙の種類: 和紙系・パステル二色は追加料金なし', () => {
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'paper', paperType: 'pattern1' }), 2000);
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'paper', paperType: 'pattern2' }), 2000);
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'paper', paperType: 'pastel' }), 2000);
  assert.equal(calcPrice({ ...base, size: 'a4', material: 'paper', paperType: 'pattern2' }), 2500);
});

test('A4にパステルは選べない(null)', () => {
  assert.equal(calcPrice({ ...base, size: 'a4', material: 'paper', paperType: 'pastel' }), null);
  assert.equal(isValidCombo({ size: 'a4', material: 'paper', frame: false, paperType: 'pastel' }), false);
});

test('プレゼント包装は+300円', () => {
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'paper', wrapping: true }), 2300);
  assert.equal(calcPrice({ ...base, size: 'a4', material: 'paper', frame: true, wrapping: true }), 3800);
});

test('キャンバスはF0=2,500円／F3=3,000円（サイズ欄と独立）', () => {
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'canvas', canvasSize: 'f0' }), 2500);
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'canvas', canvasSize: 'f3' }), 3000);
  assert.equal(calcPrice({ ...base, size: 'a4', material: 'canvas', canvasSize: 'f3', wrapping: true }), 3300);
});

test('キャンバス×フレームは販売しない(null)', () => {
  assert.equal(isValidCombo({ size: 'a4', material: 'canvas', frame: true, canvasSize: 'f0' }), false);
  assert.equal(calcPrice({ ...base, size: 'a4', material: 'canvas', frame: true }), null);
});

test('キャンバスのサイズ未指定・不明はnull', () => {
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'canvas', canvasSize: 'f10' }), null);
  assert.equal(calcPrice({ frame: false, wrapping: false, paperType: 'washi', size: 'hagaki', material: 'canvas' }), null);
});

test('キャンバスは紙の種類の影響を受けない', () => {
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'canvas', canvasSize: 'f0', paperType: 'pastel' }), 2500);
});

test('不明なサイズ・不明な紙はnull', () => {
  assert.equal(calcPrice({ ...base, size: 'b5', material: 'paper' }), null);
  assert.equal(calcPrice({ ...base, size: 'hagaki', material: 'paper', paperType: 'gold' }), null);
});
