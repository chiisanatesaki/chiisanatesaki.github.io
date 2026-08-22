// 価格は設計書§3の確定値。変更時はテストも合わせて更新する
export const BASE_PRICES = { hagaki: 2000, a4: 2500 };
export const OPTION_PRICES = { frame: 1000, wrapping: 300 };

// 紙の種類（素材が「紙」のときのみ選択。パステル系はハガキ限定）
export const PAPER_TYPES = {
  washi:        { label: '和紙',               price: 0,   sizes: ['hagaki', 'a4'] },
  pattern1:     { label: '和紙（模様あり１）', price: 0,   sizes: ['hagaki', 'a4'] },
  pattern2:     { label: '和紙（模様あり２）', price: 0,   sizes: ['hagaki', 'a4'] },
  pastel:       { label: 'パステルカラー',     price: 0,   sizes: ['hagaki'] },
};

// キャンバスは専用のサイズ体系（F3はF0の+500円）
export const CANVAS_SIZES = {
  f0: { label: 'F0（14×18cm）',   price: 2500 },
  f3: { label: 'F3（22×27.3cm）', price: 3000 },
};

export function isValidCombo({ size, material, frame, paperType, canvasSize }) {
  if (material === 'canvas') {
    // キャンバス×フレームは販売しない
    return !frame && !!CANVAS_SIZES[canvasSize];
  }
  const pt = PAPER_TYPES[paperType];
  return !!pt && pt.sizes.includes(size);
}

export function calcPrice({ size, material, frame, wrapping, paperType, canvasSize }) {
  if (!isValidCombo({ size, material, frame, paperType, canvasSize })) return null;
  let price;
  if (material === 'canvas') {
    price = CANVAS_SIZES[canvasSize].price;
  } else {
    const base = BASE_PRICES[size];
    if (base === undefined) return null;
    price = base + PAPER_TYPES[paperType].price;
    if (frame) price += OPTION_PRICES.frame;
  }
  if (wrapping) price += OPTION_PRICES.wrapping;
  return price;
}
