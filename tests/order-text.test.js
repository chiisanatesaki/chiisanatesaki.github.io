import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderText } from '../js/order-text.js';

test('紙・包装なしの注文テキスト', () => {
  const text = buildOrderText({
    name: '陽葵', furigana: 'ひまり', birthText: '令和8年8月1日',
    size: 'a4', material: 'paper', frame: true, wrapping: false, paperType: 'washi',
  });
  assert.equal(text, [
    '【お名前】陽葵（ひまり）',
    '【生年月日】令和8年8月1日',
    '【身長・体重】記載しない',
    '【サイズ】A4　【素材】紙　【フレーム】あり（黒）',
    '【紙の種類】和紙',
    '【プレゼント包装】なし',
  ].join('\n'));
});

test('パステルカラーは選んだ二色を書き添える', () => {
  const text = buildOrderText({
    name: '麗心', furigana: 'りこ', birthText: '令和8年8月20日',
    size: 'hagaki', material: 'paper', frame: false, wrapping: false,
    paperType: 'pastel', pastelColors: ['ピンク', 'みずいろ'],
  });
  assert.match(text, /【紙の種類】パステルカラー（ピンク × みずいろ）/);
});

test('生年月日を入れない場合は「記載しない」', () => {
  const text = buildOrderText({
    name: '蒼依', furigana: 'あおい', birthText: '', includeBirth: false,
    size: 'a4', material: 'paper', frame: false, wrapping: false, paperType: 'pattern1',
  });
  assert.match(text, /【生年月日】記載しない/);
  assert.match(text, /【紙の種類】和紙（模様あり１）/);
});

test('キャンバスはF0/F3サイズ表記になり、紙の種類の行を出さない', () => {
  const text = buildOrderText({
    name: '蒼', furigana: 'あおい', birthText: '令和8年8月20日',
    size: 'hagaki', material: 'canvas', frame: false, wrapping: true, paperType: 'washi',
    canvasSize: 'f0',
  });
  assert.equal(text, [
    '【お名前】蒼（あおい）',
    '【生年月日】令和8年8月20日',
    '【身長・体重】記載しない',
    '【サイズ】F0（14×18cm）　【素材】キャンバス　【フレーム】なし',
    '【プレゼント包装】あり',
    '※プレゼント包装(300円)も一緒にカートへお入れください',
  ].join('\n'));
});

test('キャンバスF3のサイズ表記', () => {
  const text = buildOrderText({
    name: '珀', furigana:'はく', birthText: '令和8年8月20日',
    size: 'a4', material: 'canvas', frame: false, wrapping: false, canvasSize: 'f3',
  });
  assert.match(text, /【サイズ】F3（22×27\.3cm）　【素材】キャンバス/);
});

test('身長・体重を入れる場合は値つきで書く', () => {
  const text = buildOrderText({
    name: '陽葵', furigana: 'ひまり', birthText: '令和8年8月1日',
    includeHw: true, height: '49.5', weight: '3250',
    size: 'hagaki', material: 'paper', frame: false, wrapping: false, paperType: 'washi',
  });
  assert.match(text, /【身長・体重】49\.5cm／3,250g/);
});

test('身長・体重オンで未入力なら（未入力）', () => {
  const text = buildOrderText({
    name: '陽葵', furigana: 'ひまり', birthText: '令和8年8月1日',
    includeHw: true,
    size: 'hagaki', material: 'paper', frame: false, wrapping: false, paperType: 'washi',
  });
  assert.match(text, /【身長・体重】（未入力）／（未入力）/);
});

test('フレームの色が注文テキストに入る', () => {
  const text = buildOrderText({
    name: '陽葵', furigana: 'ひまり', birthText: '令和8年8月1日',
    size: 'hagaki', material: 'paper', frame: true, frameColor: 'white',
    wrapping: false, paperType: 'washi',
  });
  assert.match(text, /【フレーム】あり（白（木目））/);
});
