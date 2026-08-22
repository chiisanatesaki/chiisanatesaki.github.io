# 命名書サイト「小さな手Saki」実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手書き命名書の紹介＋プレビュー＋STORES誘導を行う静的1ページサイトを構築し、GitHub Pagesで公開できる状態にする。

**Architecture:** vanilla HTML/CSS/JS の静的サイト。ロジック（和暦変換・価格計算・注文テキスト生成）は純粋関数のESモジュールに分離し、Node組み込みテストランナーでTDD。DOM配線は `app.js` に集約し、ブラウザで動作確認する。決済はSTORES（https://chiisanatesaki.stores.jp）へのリンク誘導。

**Tech Stack:** HTML5 / CSS3（writing-mode縦書き）/ ES Modules / Node組み込み `node --test`（依存パッケージゼロ）/ Google Fonts（Yuji Syuku・Shippori Mincho）

## Global Constraints

- ビルドツール・npm依存は使わない（`package.json` は `"type": "module"` 指定のためだけに置く）
- 1ページ構成・モバイルファースト（基準幅375px、コンテンツ最大幅680px）
- 価格は次の6通り＋包装のみ: ハガキ紙2,000円／ハガキ紙+フレーム3,000円／ハガキキャンバス2,500円／A4紙2,500円／A4紙+フレーム3,500円／A4キャンバス3,000円／プレゼント包装+300円
- **キャンバス×フレームは販売しない**（UIで選択不可にし、価格計算はnullを返す）
- 和暦は令和のみ（2019-05-01以降）。それ以前・未来日は警告表示するが入力は妨げない
- 個人情報はサイトから一切送信しない（プレビュー入力はブラウザ内のみ、localStorage含め保存もしない）
- ストアURL: `https://chiisanatesaki.stores.jp`（商品ページURLは未確定。`js/config.js` の `PRODUCT_URLS` が null の間はストアトップへ誘導）
- 作業ブランチ: `feature/site-design`（main直コミット禁止、pushはユーザー操作）
- 文言はすべて日本語。医療・効能的な表現は不要（化粧品ではない）だが、誇大表現は避ける

## ファイル構成

```
小さな手Saki/
├── index.html              … 全セクションのHTML＋文言
├── css/style.css           … デザイン（和・上品・清潔感）
├── js/config.js            … ストアURL・商品URL設定（唯一の後日差し替え点）
├── js/wareki.js            … 和暦変換（純粋関数）
├── js/pricing.js           … 価格計算（純粋関数）
├── js/order-text.js        … 注文テキスト生成（純粋関数）
├── js/app.js               … DOM配線（プレビュー・コピー・リンク）
├── assets/placeholder-hagaki.svg / placeholder-a4.svg … 仮画像
├── tests/wareki.test.js / pricing.test.js / order-text.test.js
├── package.json            … {"type":"module"} のみ
├── README.md               … 公開手順（GitHub Pages）
└── STORES設定手順書.md      … ユーザー向け設定手順
```

---

### Task 1: プロジェクト骨格＋和暦変換モジュール

**Files:**
- Create: `package.json`, `js/wareki.js`, `tests/wareki.test.js`

**Interfaces:**
- Produces: `toWareki(isoDate: string, now?: Date)` → `{ text: string|null, warning: string|null }`
  - `isoDate` は `<input type="date">` の値（`"YYYY-MM-DD"`）。空文字なら `{text: null, warning: null}`
  - 令和元年は「令和元年5月1日」表記。令和以前は西暦表記のまま warning を付ける

- [ ] **Step 1: Node確認とpackage.json作成**

Run: `node --version`（`~/.zshenv` でPATH設定済みのNodeが応答すること）

`package.json`:
```json
{
  "name": "chiisanate-saki-site",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/wareki.test.js`:
```js
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
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `node --test tests/wareki.test.js`
Expected: FAIL（`Cannot find module .../js/wareki.js`）

- [ ] **Step 4: 実装**

`js/wareki.js`:
```js
// 生年月日(YYYY-MM-DD)を令和表記へ変換する。令和以前・未来日は警告つきで返す
const REIWA_START = new Date(2019, 4, 1);

export function toWareki(isoDate, now = new Date()) {
  if (!isoDate) return { text: null, warning: null };
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return { text: null, warning: '日付の形式が正しくありません' };
  const date = new Date(y, m - 1, d);
  if (date < REIWA_START) {
    return { text: `${y}年${m}月${d}日`, warning: '令和より前の日付です。お間違いないかご確認ください' };
  }
  const reiwaYear = y - 2018;
  const text = `令和${reiwaYear === 1 ? '元' : reiwaYear}年${m}月${d}日`;
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const warning = date > endOfToday ? '未来の日付です。お間違いないかご確認ください' : null;
  return { text, warning };
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `node --test tests/wareki.test.js`
Expected: PASS（6件）

- [ ] **Step 6: Commit**

```bash
git add package.json js/wareki.js tests/wareki.test.js
git commit -m "feat: 和暦変換モジュールを追加"
```

---

### Task 2: 価格計算モジュール

**Files:**
- Create: `js/pricing.js`, `tests/pricing.test.js`

**Interfaces:**
- Consumes: なし
- Produces:
  - 選択状態の型（全モジュール共通）: `{ size: 'hagaki'|'a4', material: 'paper'|'canvas', frame: boolean, wrapping: boolean }`
  - `calcPrice(selection)` → `number | null`（キャンバス×フレームなど不正な組み合わせは `null`）
  - `isValidCombo({material, frame})` → `boolean`

- [ ] **Step 1: 失敗するテストを書く**

`tests/pricing.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcPrice, isValidCombo } from '../js/pricing.js';

const cases = [
  [{ size: 'hagaki', material: 'paper',  frame: false, wrapping: false }, 2000],
  [{ size: 'hagaki', material: 'paper',  frame: true,  wrapping: false }, 3000],
  [{ size: 'hagaki', material: 'canvas', frame: false, wrapping: false }, 2500],
  [{ size: 'a4',     material: 'paper',  frame: false, wrapping: false }, 2500],
  [{ size: 'a4',     material: 'paper',  frame: true,  wrapping: false }, 3500],
  [{ size: 'a4',     material: 'canvas', frame: false, wrapping: false }, 3000],
];

for (const [sel, expected] of cases) {
  test(`${sel.size}/${sel.material}/frame=${sel.frame} は ${expected}円`, () => {
    assert.equal(calcPrice(sel), expected);
  });
}

test('プレゼント包装は+300円', () => {
  assert.equal(calcPrice({ size: 'hagaki', material: 'paper', frame: false, wrapping: true }), 2300);
  assert.equal(calcPrice({ size: 'a4', material: 'paper', frame: true, wrapping: true }), 3800);
});

test('キャンバス×フレームは販売しない(null)', () => {
  assert.equal(isValidCombo({ material: 'canvas', frame: true }), false);
  assert.equal(calcPrice({ size: 'a4', material: 'canvas', frame: true, wrapping: false }), null);
});

test('不明なサイズはnull', () => {
  assert.equal(calcPrice({ size: 'b5', material: 'paper', frame: false, wrapping: false }), null);
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test tests/pricing.test.js`
Expected: FAIL（module not found）

- [ ] **Step 3: 実装**

`js/pricing.js`:
```js
// 価格は設計書§3の確定値。変更時はテストも合わせて更新する
export const BASE_PRICES = { hagaki: 2000, a4: 2500 };
export const OPTION_PRICES = { frame: 1000, canvas: 500, wrapping: 300 };

export function isValidCombo({ material, frame }) {
  return !(material === 'canvas' && frame);
}

export function calcPrice({ size, material, frame, wrapping }) {
  const base = BASE_PRICES[size];
  if (base === undefined || !isValidCombo({ material, frame })) return null;
  let price = base;
  if (material === 'canvas') price += OPTION_PRICES.canvas;
  if (frame) price += OPTION_PRICES.frame;
  if (wrapping) price += OPTION_PRICES.wrapping;
  return price;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test tests/pricing.test.js`
Expected: PASS（9件）

- [ ] **Step 5: Commit**

```bash
git add js/pricing.js tests/pricing.test.js
git commit -m "feat: 価格計算モジュールを追加"
```

---

### Task 3: 注文テキスト生成モジュール

**Files:**
- Create: `js/order-text.js`, `tests/order-text.test.js`

**Interfaces:**
- Consumes: Task 2の選択状態型、Task 1の和暦テキスト
- Produces: `buildOrderText({ name, furigana, birthText, size, material, frame, wrapping })` → `string`（STORES備考欄に貼る整形テキスト）

- [ ] **Step 1: 失敗するテストを書く**

`tests/order-text.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderText } from '../js/order-text.js';

test('包装なしの注文テキスト', () => {
  const text = buildOrderText({
    name: '陽葵', furigana: 'ひまり', birthText: '令和8年8月1日',
    size: 'a4', material: 'paper', frame: true, wrapping: false,
  });
  assert.equal(text, [
    '【お名前】陽葵（ひまり）',
    '【生年月日】令和8年8月1日',
    '【サイズ】A4　【素材】紙　【フレーム】あり',
    '【プレゼント包装】なし',
  ].join('\n'));
});

test('包装ありは案内行を付ける', () => {
  const text = buildOrderText({
    name: '蒼', furigana: 'あおい', birthText: '令和8年8月20日',
    size: 'hagaki', material: 'canvas', frame: false, wrapping: true,
  });
  assert.equal(text, [
    '【お名前】蒼（あおい）',
    '【生年月日】令和8年8月20日',
    '【サイズ】ハガキ　【素材】キャンバス　【フレーム】なし',
    '【プレゼント包装】あり',
    '※プレゼント包装(300円)も一緒にカートへお入れください',
  ].join('\n'));
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test tests/order-text.test.js`
Expected: FAIL（module not found）

- [ ] **Step 3: 実装**

`js/order-text.js`:
```js
export const SIZE_LABELS = { hagaki: 'ハガキ', a4: 'A4' };
export const MATERIAL_LABELS = { paper: '紙', canvas: 'キャンバス' };

export function buildOrderText({ name, furigana, birthText, size, material, frame, wrapping }) {
  const lines = [
    `【お名前】${name}（${furigana}）`,
    `【生年月日】${birthText}`,
    `【サイズ】${SIZE_LABELS[size]}　【素材】${MATERIAL_LABELS[material]}　【フレーム】${frame ? 'あり' : 'なし'}`,
    `【プレゼント包装】${wrapping ? 'あり' : 'なし'}`,
  ];
  if (wrapping) lines.push('※プレゼント包装(300円)も一緒にカートへお入れください');
  return lines.join('\n');
}
```

- [ ] **Step 4: 全テストが通ることを確認**

Run: `node --test`
Expected: PASS（17件）

- [ ] **Step 5: Commit**

```bash
git add js/order-text.js tests/order-text.test.js
git commit -m "feat: 注文テキスト生成モジュールを追加"
```

---

### Task 4: HTML構造・文言・設定・仮画像

**Files:**
- Create: `index.html`, `js/config.js`, `assets/placeholder-hagaki.svg`, `assets/placeholder-a4.svg`

**Interfaces:**
- Consumes: なし（app.jsは後続タスクで読み込むが、このタスク時点で `<script>` タグは記述しておく）
- Produces: app.js が参照するDOM要素のid（下記HTML内の `id` 属性がそのまま契約）:
  `input-name / input-furigana / input-birth / builder-form / preview-name / preview-furigana / preview-birth / preview-warning / price-total / copy-button / copy-feedback / fallback-text / store-link / option-frame / option-wrapping`
  ラジオは `name="size"`（値 `hagaki|a4`）、`name="material"`（値 `paper|canvas`）
- `js/config.js`: `STORE_URL: string`, `PRODUCT_URLS: {hagaki, a4, wrapping}`, `productUrl(size)` → `string`

- [ ] **Step 1: config.jsを作成**

`js/config.js`:
```js
export const STORE_URL = 'https://chiisanatesaki.stores.jp';
// 商品登録が済んだら各商品ページURLに差し替える（nullの間はストアトップへ誘導）
export const PRODUCT_URLS = { hagaki: null, a4: null, wrapping: null };

export function productUrl(size) {
  return PRODUCT_URLS[size] || STORE_URL;
}
```

- [ ] **Step 2: 仮画像SVGを作成**

`assets/placeholder-hagaki.svg`（A4版は `viewBox` と表記のみ差し替え）:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 444" role="img" aria-label="ハガキサイズ命名書の見本写真（準備中）">
  <rect width="300" height="444" fill="#f7f3ea"/>
  <rect x="10" y="10" width="280" height="424" fill="none" stroke="#d8cfba" stroke-width="2"/>
  <text x="150" y="130" text-anchor="middle" font-size="34" fill="#2b2825" font-family="serif">命名</text>
  <text x="150" y="240" text-anchor="middle" font-size="52" fill="#2b2825" font-family="serif">花</text>
  <text x="150" y="400" text-anchor="middle" font-size="14" fill="#9a917e" font-family="sans-serif">見本写真は準備中です</text>
</svg>
```

`assets/placeholder-a4.svg`: 同じ内容で `viewBox="0 0 300 424"`、aria-labelを「A4サイズ〜」に変更。

- [ ] **Step 3: index.htmlを作成**

`index.html`（全文。文言は初稿としてこのまま使い、公開前にユーザーが調整できる）:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>小さな手Saki｜手書きの命名書オーダー</title>
<meta name="description" content="お子さまのお名前を、一枚ずつ心を込めて毛筆でお書きする手書き命名書の専門店。ハガキサイズ2,000円から。">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600&family=Yuji+Syuku&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<header class="hero">
  <p class="hero-en">Handwritten Naming Calligraphy</p>
  <h1 class="site-title">小さな手<span class="title-saki">Saki</span></h1>
  <p class="hero-copy">お子さまの、はじめての宝物。<br>お名前を一枚ずつ、毛筆で丁寧にお書きします。</p>
  <a class="btn btn-primary" href="#builder">命名書をつくってみる</a>
</header>

<main>
<section class="features" aria-labelledby="features-title">
  <h2 id="features-title">小さな手Sakiのこだわり</h2>
  <ul class="features-list">
    <li><b>すべて手書き</b><span>印刷ではなく、一枚ずつ筆でお書きします。にじみやかすれも、その子だけの表情です。</span></li>
    <li><b>選べる仕立て</b><span>ハガキサイズとA4サイズ。紙のほかキャンバス地、フレーム付きもご用意しています。</span></li>
    <li><b>ご出産祝いにも</b><span>プレゼント包装を承ります。贈りものにもお選びいただけます。</span></li>
  </ul>
</section>

<section class="lineup" aria-labelledby="lineup-title">
  <h2 id="lineup-title">商品ラインナップ</h2>
  <div class="lineup-cards">
    <figure class="card">
      <img src="assets/placeholder-hagaki.svg" alt="ハガキサイズ命名書の見本" loading="lazy">
      <figcaption><h3>ハガキサイズ</h3><p class="price">2,000<span>円〜</span></p><p>飾りやすい小さめサイズ。ベビーベッドのそばにも。</p></figcaption>
    </figure>
    <figure class="card">
      <img src="assets/placeholder-a4.svg" alt="A4サイズ命名書の見本" loading="lazy">
      <figcaption><h3>A4サイズ</h3><p class="price">2,500<span>円〜</span></p><p>お披露目やお写真と一緒に飾るのにちょうどよい定番サイズ。</p></figcaption>
    </figure>
  </div>
  <table class="option-table">
    <caption>オプション</caption>
    <tbody>
      <tr><th>フレーム付き</th><td>+1,000円</td></tr>
      <tr><th>キャンバス地に変更</th><td>+500円（フレームなしのみ）</td></tr>
      <tr><th>プレゼント包装</th><td>+300円</td></tr>
    </tbody>
  </table>
</section>

<section class="builder" id="builder" aria-labelledby="builder-title">
  <h2 id="builder-title">命名書プレビュー</h2>
  <p class="builder-lead">お名前を入力すると、仕上がりのイメージをご覧いただけます。</p>

  <form id="builder-form" autocomplete="off">
    <div class="field"><label for="input-name">お名前（漢字）</label>
      <input type="text" id="input-name" maxlength="10" placeholder="例：陽葵"></div>
    <div class="field"><label for="input-furigana">ふりがな</label>
      <input type="text" id="input-furigana" maxlength="20" placeholder="例：ひまり"></div>
    <div class="field"><label for="input-birth">生年月日</label>
      <input type="date" id="input-birth"></div>

    <fieldset><legend>サイズ</legend>
      <label><input type="radio" name="size" value="hagaki" checked> ハガキ（2,000円）</label>
      <label><input type="radio" name="size" value="a4"> A4（2,500円）</label>
    </fieldset>
    <fieldset><legend>素材</legend>
      <label><input type="radio" name="material" value="paper" checked> 紙</label>
      <label><input type="radio" name="material" value="canvas"> キャンバス（+500円）</label>
    </fieldset>
    <fieldset><legend>オプション</legend>
      <label><input type="checkbox" id="option-frame"> フレーム付き（+1,000円）</label>
      <label><input type="checkbox" id="option-wrapping"> プレゼント包装（+300円）</label>
    </fieldset>
  </form>

  <div class="preview-wrap">
    <div class="meimei-paper" aria-hidden="true">
      <div class="meimei-title">命名</div>
      <div class="meimei-name"><ruby><span id="preview-name">お名前</span><rt id="preview-furigana"></rt></ruby></div>
      <div class="meimei-birth" id="preview-birth"></div>
    </div>
    <p class="preview-note">プレビューはイメージです。実物は一枚ずつ手書きでお仕上げします。<br>環境依存の漢字（渡邉・髙など）は表示できない場合があります。ご注文時に備考欄でお知らせください。</p>
    <p class="warning" id="preview-warning" hidden></p>
  </div>

  <div class="order-box">
    <p class="total">合計 <strong id="price-total">2,000</strong> 円 <span class="total-note">（送料別）</span></p>
    <button type="button" class="btn" id="copy-button">① 注文内容をコピー</button>
    <p id="copy-feedback" class="copy-feedback" hidden>コピーしました。STORESの備考欄に貼り付けてください。</p>
    <textarea id="fallback-text" class="fallback-text" rows="6" readonly hidden></textarea>
    <a class="btn btn-primary" id="store-link" href="https://chiisanatesaki.stores.jp" target="_blank" rel="noopener">② STORESで注文する</a>
  </div>
</section>

<section class="flow" aria-labelledby="flow-title">
  <h2 id="flow-title">ご注文の流れ</h2>
  <ol class="flow-list">
    <li><b>プレビューで確認</b><span>お名前・生年月日・仕立てを選び、イメージをご確認ください。</span></li>
    <li><b>注文内容をコピー</b><span>「注文内容をコピー」ボタンを押します。</span></li>
    <li><b>STORESでご購入</b><span>ご購入手続きの備考欄に、コピーした内容を貼り付けてください。お届け先はご購入画面でご入力いただきます。</span></li>
    <li><b>執筆・発送</b><span>ご入金確認後、心を込めてお書きし、お届けします。</span></li>
  </ol>
</section>

<section class="faq" aria-labelledby="faq-title">
  <h2 id="faq-title">よくあるご質問</h2>
  <details><summary>届くまでどのくらいかかりますか？</summary><p>ご注文から7日以内の発送を目安にしています。お急ぎの場合はご相談ください。</p></details>
  <details><summary>特殊な漢字（旧字体など）にも対応できますか？</summary><p>はい。プレビューで表示できない字体も、ご注文時の備考欄にお書き添えいただければ正しくお書きします。</p></details>
  <details><summary>書き直し・キャンセルはできますか？</summary><p>一枚ずつの受注制作のため、執筆開始後のキャンセルはご容赦ください。万一お名前の誤りがあった場合はお書き直しいたします。</p></details>
  <details><summary>備考欄への記入を忘れてしまいました</summary><p>ご安心ください。STORESのメッセージ機能からこちらよりご連絡し、内容を確認いたします。</p></details>
</section>
</main>

<footer class="footer">
  <p class="footer-title">小さな手Saki</p>
  <p><a href="https://chiisanatesaki.stores.jp" target="_blank" rel="noopener">オンラインストア（STORES）</a></p>
  <p class="footer-legal">特定商取引法に基づく表記は<a href="https://chiisanatesaki.stores.jp" target="_blank" rel="noopener">ストアページ</a>をご覧ください。</p>
  <p class="copyright">&copy; 2026 小さな手Saki</p>
</footer>

<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add index.html js/config.js assets/
git commit -m "feat: サイトHTML構造・文言・仮画像を追加"
```

---

### Task 5: CSS（和・上品・モバイルファースト）

**Files:**
- Create: `css/style.css`

**Interfaces:**
- Consumes: Task 4のHTML構造（クラス名）
- Produces: `.meimei-name` の文字数別縮小クラス `len-4` / `len-6`（app.jsが名前の長さに応じて付与する）

- [ ] **Step 1: スタイルシートを作成**

`css/style.css`（全文）:
```css
:root {
  --paper: #f7f3ea;       /* 生成り */
  --paper-deep: #efe8d8;
  --ink: #2b2825;         /* 墨 */
  --ink-soft: #5c554c;
  --accent: #a63e2c;      /* 落ち着いた朱 */
  --line: #d8cfba;
  --serif: "Shippori Mincho", "Hiragino Mincho ProN", serif;
  --brush: "Yuji Syuku", "Hiragino Mincho ProN", serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--serif);
  color: var(--ink);
  background: var(--paper);
  line-height: 1.9;
  letter-spacing: 0.06em;
}
main, .hero, .footer { padding-inline: 20px; }
section { max-width: 680px; margin: 0 auto; padding-block: 56px; }
h2 {
  font-size: 1.35rem; font-weight: 600; text-align: center; margin-bottom: 32px;
}
h2::after {
  content: ""; display: block; width: 36px; height: 2px;
  background: var(--accent); margin: 14px auto 0;
}

/* ヒーロー */
.hero {
  text-align: center; padding-block: 72px 64px;
  background: linear-gradient(var(--paper-deep), var(--paper));
}
.hero-en { font-size: 0.7rem; letter-spacing: 0.3em; color: var(--ink-soft); text-transform: uppercase; }
.site-title { font-family: var(--brush); font-size: 2.6rem; font-weight: 400; margin: 12px 0 20px; }
.title-saki { font-size: 1.6rem; margin-left: 0.2em; color: var(--accent); }
.hero-copy { margin-bottom: 32px; }

/* ボタン */
.btn {
  display: inline-block; padding: 14px 32px; border: 1px solid var(--ink);
  background: #fff; color: var(--ink); text-decoration: none; font-family: var(--serif);
  font-size: 1rem; letter-spacing: 0.1em; cursor: pointer; border-radius: 2px;
  transition: opacity 0.2s;
}
.btn:hover { opacity: 0.75; }
.btn-primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }

/* こだわり・流れ */
.features-list, .flow-list { list-style: none; display: grid; gap: 24px; }
.flow-list { counter-reset: step; }
.features-list li, .flow-list li {
  background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 20px 24px;
}
.features-list b, .flow-list b { display: block; margin-bottom: 6px; font-size: 1.05rem; }
.flow-list li::before {
  counter-increment: step; content: counter(step);
  float: left; margin: 4px 14px 0 0; width: 30px; height: 30px; border-radius: 50%;
  background: var(--accent); color: #fff; text-align: center; line-height: 30px; font-size: 0.9rem;
}
.features-list span, .flow-list span { font-size: 0.92rem; color: var(--ink-soft); }

/* ラインナップ */
.lineup-cards { display: grid; gap: 28px; }
.card { background: #fff; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
.card img { width: 100%; max-width: 100%; display: block; background: var(--paper-deep); }
.card figcaption { padding: 18px 20px 22px; }
.card h3 { font-size: 1.1rem; }
.price { font-size: 1.5rem; color: var(--accent); margin: 4px 0 8px; }
.price span { font-size: 0.9rem; }
.card p:last-child { font-size: 0.9rem; color: var(--ink-soft); }
.option-table { width: 100%; margin-top: 28px; border-collapse: collapse; background: #fff; }
.option-table caption { font-weight: 600; margin-bottom: 10px; }
.option-table th, .option-table td {
  border: 1px solid var(--line); padding: 12px 16px; font-weight: 400; text-align: left;
}
.option-table td { text-align: right; color: var(--accent); }

/* 注文ビルダー */
.builder-lead { text-align: center; margin-bottom: 28px; font-size: 0.95rem; }
#builder-form { display: grid; gap: 18px; margin-bottom: 36px; }
.field label { display: block; font-size: 0.88rem; margin-bottom: 6px; color: var(--ink-soft); }
.field input {
  width: 100%; padding: 12px 14px; border: 1px solid var(--line); border-radius: 3px;
  font-family: var(--serif); font-size: 1.05rem; background: #fff; color: var(--ink);
}
.field input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
fieldset { border: 1px solid var(--line); border-radius: 3px; padding: 12px 16px 14px; background: #fff; }
legend { font-size: 0.85rem; color: var(--ink-soft); padding-inline: 6px; }
fieldset label { display: inline-block; margin-right: 18px; font-size: 0.98rem; }
fieldset input { accent-color: var(--accent); margin-right: 4px; }
fieldset label:has(input:disabled) { opacity: 0.4; }

/* 命名書プレビュー（縦書き） */
.preview-wrap { text-align: center; }
.meimei-paper {
  writing-mode: vertical-rl; margin: 0 auto;
  width: min(78vw, 300px); aspect-ratio: 100 / 148;
  background: #fffdf8; border: 1px solid var(--line);
  box-shadow: 0 6px 24px rgba(43, 40, 37, 0.12);
  padding: 8%; display: flex; justify-content: space-between; align-items: center;
  font-family: var(--brush);
}
.meimei-title { font-size: clamp(1.2rem, 5.5vw, 1.6rem); letter-spacing: 0.5em; }
.meimei-name { font-size: clamp(2.4rem, 11vw, 3.2rem); line-height: 1; }
.meimei-name.len-4 { font-size: clamp(2rem, 9vw, 2.6rem); }
.meimei-name.len-6 { font-size: clamp(1.5rem, 7vw, 2rem); }
.meimei-name rt { font-size: 0.28em; letter-spacing: 0.2em; color: var(--ink-soft); }
.meimei-birth { font-size: clamp(0.85rem, 3.8vw, 1rem); color: var(--ink-soft); }
.preview-note { font-size: 0.78rem; color: var(--ink-soft); margin-top: 18px; }
.warning { color: var(--accent); font-size: 0.85rem; margin-top: 8px; }

/* 注文ボックス */
.order-box {
  margin-top: 32px; padding: 26px 22px; background: #fff;
  border: 1px solid var(--line); border-radius: 4px;
  display: grid; gap: 14px; text-align: center;
}
.total { font-size: 1.05rem; }
.total strong { font-size: 1.9rem; color: var(--accent); font-weight: 600; }
.total-note { font-size: 0.8rem; color: var(--ink-soft); }
.copy-feedback { font-size: 0.85rem; color: #2e6e46; }
.fallback-text { width: 100%; font-size: 0.85rem; padding: 10px; border: 1px solid var(--line); }

/* FAQ */
.faq details { background: #fff; border: 1px solid var(--line); border-radius: 4px; margin-bottom: 12px; }
.faq summary { padding: 16px 20px; cursor: pointer; font-size: 0.98rem; }
.faq details p { padding: 0 20px 16px; font-size: 0.92rem; color: var(--ink-soft); }

/* フッター */
.footer {
  text-align: center; padding-block: 48px; border-top: 1px solid var(--line);
  font-size: 0.85rem; color: var(--ink-soft);
}
.footer-title { font-family: var(--brush); font-size: 1.3rem; color: var(--ink); margin-bottom: 10px; }
.footer a { color: var(--ink-soft); }
.copyright { margin-top: 16px; font-size: 0.75rem; }

/* タブレット以上 */
@media (min-width: 640px) {
  .lineup-cards { grid-template-columns: 1fr 1fr; }
  .site-title { font-size: 3.2rem; }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: サイト全体のスタイルを追加"
```

---

### Task 6: app.js（DOM配線）

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes: `toWareki`（Task 1）、`calcPrice`（Task 2）、`buildOrderText`（Task 3）、`productUrl`（Task 4）、Task 4のDOM id契約、Task 5の `len-4`/`len-6` クラス

- [ ] **Step 1: 実装**

`js/app.js`（全文）:
```js
import { toWareki } from './wareki.js';
import { calcPrice } from './pricing.js';
import { buildOrderText } from './order-text.js';
import { productUrl } from './config.js';

const $ = (id) => document.getElementById(id);
const form = $('builder-form');
const frameCheck = $('option-frame');

function selection() {
  return {
    size: form.querySelector('input[name="size"]:checked').value,
    material: form.querySelector('input[name="material"]:checked').value,
    frame: frameCheck.checked,
    wrapping: $('option-wrapping').checked,
  };
}

function currentOrderText(sel, wareki) {
  return buildOrderText({
    name: $('input-name').value.trim() || '（未入力）',
    furigana: $('input-furigana').value.trim() || '（未入力）',
    birthText: wareki.text || '（未入力）',
    ...sel,
  });
}

function render() {
  const sel = selection();

  // キャンバス選択時はフレーム販売なし（設計書§3）
  if (sel.material === 'canvas') {
    frameCheck.checked = false;
    frameCheck.disabled = true;
    sel.frame = false;
  } else {
    frameCheck.disabled = false;
  }

  const name = $('input-name').value.trim();
  const nameEl = $('preview-name');
  nameEl.textContent = name || 'お名前';
  nameEl.parentElement.parentElement.classList.toggle('len-4', name.length >= 4 && name.length < 6);
  nameEl.parentElement.parentElement.classList.toggle('len-6', name.length >= 6);
  $('preview-furigana').textContent = $('input-furigana').value.trim();

  const wareki = toWareki($('input-birth').value);
  $('preview-birth').textContent = wareki.text || '';
  const warnEl = $('preview-warning');
  warnEl.hidden = !wareki.warning;
  warnEl.textContent = wareki.warning || '';

  const price = calcPrice(sel);
  $('price-total').textContent = price === null ? '—' : price.toLocaleString('ja-JP');

  $('store-link').href = productUrl(sel.size);
  return { sel, wareki };
}

async function copyOrder() {
  const { sel, wareki } = render();
  const text = currentOrderText(sel, wareki);
  const feedback = $('copy-feedback');
  const fallback = $('fallback-text');
  try {
    await navigator.clipboard.writeText(text);
    feedback.hidden = false;
    fallback.hidden = true;
  } catch {
    // clipboard非対応・拒否時は手動コピー用に表示する
    fallback.value = text;
    fallback.hidden = false;
    fallback.select();
    feedback.hidden = true;
  }
}

form.addEventListener('input', render);
$('copy-button').addEventListener('click', copyOrder);
render();
```

- [ ] **Step 2: 全テストが通ることを確認（回帰）**

Run: `node --test`
Expected: PASS（17件・変化なし）

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: プレビュー・価格・コピー・STORESリンクのDOM配線"
```

---

### Task 7: ブラウザ動作確認と仕上げ

**Files:**
- Modify: 前タスクまでの成果物（確認で見つかった不具合の修正）

**Interfaces:**
- Consumes: サイト全体

- [ ] **Step 1: ローカルサーバーで表示**

`.claude/launch.json` を作成してプレビューを起動（`python3 -m http.server 4173` をプロジェクト直下で）:
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "meimeisho-site", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "4173"], "port": 4173 }
  ]
}
```

- [ ] **Step 2: 設計書§8のチェックリストを実施（モバイル幅375px→デスクトップの順）**

- 全セクションが表示され、崩れがない
- プレビュー: 「陽葵／ひまり／2026-08-01」→ 縦書きで「命名・陽葵（ひまり）・令和8年8月1日」
- 長い名前（6文字）で文字が紙からはみ出さない
- 2019-04-30 と 未来日で警告文が出る
- 6通り＋包装で合計金額が価格表と一致
- キャンバス選択時にフレームが無効化・解除される
- コピーで注文テキストが取得でき、書式がTask 3のテストと一致
- STORESリンクが `https://chiisanatesaki.stores.jp` を新規タブで開く

- [ ] **Step 3: デザイン仕上げ**

`high-end-visual-design` スキル（なければ `frontend-design`）を読み込み、その基準でヒーロー・余白・影・フォントサイズを微調整する。修正はすべて `css/style.css` 内で完結させる。

- [ ] **Step 4: 見つかった問題を修正して再確認**

Run: `node --test`（ロジックに触れた場合の回帰確認）
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: 実機確認に基づく表示調整"
```

---

### Task 8: STORES設定手順書とREADME

**Files:**
- Create: `STORES設定手順書.md`, `README.md`

**Interfaces:**
- Consumes: 設計書§4（STORES登録構成）

- [ ] **Step 1: STORES設定手順書.mdを作成**

内容（この構成で具体的に書く。管理画面のメニュー名は変わることがある旨を冒頭に注記）:

1. **商品登録（2商品）**
   - 「命名書 ハガキサイズ」: バリエーション「紙 2,000円／紙・フレーム付き 3,000円／キャンバス 2,500円」
   - 「命名書 A4サイズ」: バリエーション「紙 2,500円／紙・フレーム付き 3,500円／キャンバス 3,000円」
   - バリエーションごとの価格設定手順（STORES公式FAQ 28161389685273 のリンクを記載）
   - 商品説明文の下書き（コピペで使える文面を含める。「ご購入手続きの備考欄に、サイトでコピーした注文内容を貼り付けてください」の一文を必ず入れる）
2. **オプション商品「プレゼント包装」300円** の登録
3. **備考欄を必須に設定**: 案内文「お子さまのお名前・ふりがな・生年月日をご記入ください。サイトの『注文内容をコピー』をご利用いただくと便利です」
4. **特定商取引法の表記**: 住所・電話番号の非公開設定を有効化する手順
5. **送料設定**: フレームなし（紙）はクリックポスト等の全国一律、フレーム付き・キャンバスは宅配便を推奨。金額欄は空欄にしてユーザーが決めて記入する形式
6. **設定後にやること**: 各商品ページのURLをClaudeに共有 →`js/config.js` の `PRODUCT_URLS` を差し替えて再公開

- [ ] **Step 2: README.mdを作成**

内容: プロジェクト概要（1段落）／ローカル確認方法（`python3 -m http.server 4173`）／テスト実行（`node --test`）／公開手順（GitHubリポジトリ作成 → `feature/site-design` をpush → PR → mainへマージ → Settings > Pages で `main /(root)` を指定）／写真差し替え方法（`assets/` のSVGを同名のJPG等に置き換え、`index.html` の `src` を更新）

- [ ] **Step 3: Commit**

```bash
git add STORES設定手順書.md README.md
git commit -m "docs: STORES設定手順書と公開手順を追加"
```

---

## 完了条件

- `node --test` が全件PASS
- 設計書§8の動作確認チェックリストが全項目クリア（Task 7）
- ユーザーへの引き継ぎ物: 動作確認手順、STORES設定手順書、公開手順（README）
- ユーザー確認待ちとして報告する事項: FAQの文言（納期「7日以内」・キャンセルポリシー）が実運用と合っているか、価格・文言の最終チェック
