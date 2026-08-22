import { toWareki } from './wareki.js';
import { calcPrice, PAPER_TYPES } from './pricing.js';
import { buildOrderText } from './order-text.js';
import { toRomaji } from './romaji.js';
import { productUrl } from './config.js';

const $ = (id) => document.getElementById(id);
const form = $('builder-form');
const frameCheck = $('option-frame');
const birthCheck = $('option-birth');
const paperEl = $('meimei-paper');

// パステル紙のプレビュー用カラー（淡い水彩の色味）
const PASTEL_HEX = {
  'ピンク': '#f4cdd7',
  'みずいろ': '#c5e0ee',
  'きいろ': '#f6e9b3',
  'みどり': '#cfe5c4',
  'むらさき': '#dcd2ea',
  'オレンジ': '#f8dcbe',
};

function selection() {
  return {
    size: form.querySelector('input[name="size"]:checked').value,
    material: form.querySelector('input[name="material"]:checked').value,
    frame: frameCheck.checked,
    frameColor: form.querySelector('input[name="frame-color"]:checked').value,
    wrapping: $('option-wrapping').checked,
    paperType: form.querySelector('input[name="paper-type"]:checked').value,
    canvasSize: form.querySelector('input[name="canvas-size"]:checked').value,
    includeBirth: birthCheck.checked,
    includeHw: $('option-hw').checked,
    height: $('input-height').value.trim(),
    weight: $('input-weight').value.trim(),
    pastelColors: [$('pastel-color1').value, $('pastel-color2').value],
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

function syncConstraints(sel) {
  // キャンバス選択時: フレーム不可・紙の種類は対象外・サイズはF0/F3体系（設計書§3）
  const isCanvas = sel.material === 'canvas';
  if (isCanvas) {
    frameCheck.checked = false;
    frameCheck.disabled = true;
    sel.frame = false;
  } else {
    frameCheck.disabled = false;
  }
  $('fs-paper').hidden = isCanvas;
  form.querySelectorAll('.size-paper').forEach((el) => { el.hidden = isCanvas; });
  form.querySelectorAll('.size-canvas').forEach((el) => { el.hidden = !isCanvas; });

  // パステル系はハガキのみ。A4選択時は選べないようにし、選択中なら和紙へ戻す
  const hagakiOnly = sel.size !== 'hagaki';
  form.querySelectorAll('.hagaki-only input[name="paper-type"]').forEach((input) => {
    input.disabled = hagakiOnly;
  });
  $('paper-note').hidden = !hagakiOnly;
  if (hagakiOnly && !PAPER_TYPES[sel.paperType].sizes.includes(sel.size)) {
    form.querySelector('input[name="paper-type"][value="washi"]').checked = true;
    sel.paperType = 'washi';
  }

  // フレーム付きのときだけ色の選択を出す
  $('frame-colors').hidden = !(sel.frame && !isCanvas);

  // パステルカラー選択時のみ二色セレクトを表示
  $('pastel-colors').hidden = !(sel.material === 'paper' && sel.paperType === 'pastel');

  // 生年月日はチェックを入れたときだけ入力欄を出す（身長・体重と同じ方式）
  $('birth-inputs').hidden = !sel.includeBirth;

  // 身長・体重はチェックを入れたときだけ入力欄を出す
  $('hw-inputs').hidden = !sel.includeHw;
  return sel;
}

function renderPaper(sel) {
  const classes = ['meimei-paper'];
  if (sel.material === 'canvas') {
    classes.push('paper-canvas', `size-${sel.canvasSize}`);
  } else {
    classes.push(`paper-${sel.paperType}`, `size-${sel.size}`);
    if (sel.paperType === 'pastel') {
      paperEl.style.setProperty('--pc1', PASTEL_HEX[sel.pastelColors[0]]);
      paperEl.style.setProperty('--pc2', PASTEL_HEX[sel.pastelColors[1]]);
    }
  }
  if (sel.frame) classes.push('framed', `frame-${sel.frameColor}`);
  paperEl.className = classes.join(' ');
}

function render() {
  const sel = syncConstraints(selection());

  const name = $('input-name').value.trim();
  const nameEl = $('preview-name');
  nameEl.textContent = name || 'お名前';
  const nameBox = nameEl.parentElement;
  nameBox.classList.toggle('len-4', name.length >= 4 && name.length < 6);
  nameBox.classList.toggle('len-6', name.length >= 6);

  $('preview-sign').textContent = toRomaji($('input-furigana').value.trim());

  const wareki = sel.includeBirth ? toWareki($('input-birth').value) : { text: null, warning: null };

  // サインの下に「1998.05.21 48cm 3200g」の形式で並べる（注文テキストは従来どおり和暦）
  const birthDot = sel.includeBirth && $('input-birth').value
    ? $('input-birth').value.replaceAll('-', '.') : '';
  const hTxt = sel.includeHw && sel.height ? `${sel.height}cm` : '';
  const wTxt = sel.includeHw && sel.weight ? `${sel.weight}g` : '';
  $('preview-birth').textContent = birthDot;
  $('preview-height').textContent = hTxt;
  $('preview-weight').textContent = wTxt;
  $('preview-detail').hidden = !(birthDot || hTxt || wTxt);
  const warnEl = $('preview-warning');
  warnEl.hidden = !wareki.warning;
  warnEl.textContent = wareki.warning || '';

  renderPaper(sel);

  const price = calcPrice(sel);
  $('price-total').textContent = price === null ? '—' : price.toLocaleString('ja-JP');

  // キャンバスは専用商品「命名書 キャンバス」（F0/F3バリエーション）へ誘導する
  const productKey = sel.material === 'canvas' ? 'canvas' : sel.size;
  $('store-link').href = productUrl(productKey);
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
