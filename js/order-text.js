import { PAPER_TYPES, CANVAS_SIZES } from './pricing.js';

export const SIZE_LABELS = { hagaki: 'ハガキ', a4: 'A4' };
export const MATERIAL_LABELS = { paper: '紙', canvas: 'キャンバス' };
export const FRAME_COLOR_LABELS = {
  black: '黒', white: '白（木目）', brown: '茶（木目）', lightbrown: '薄茶（木目）',
};

function paperLine({ material, paperType, pastelColors }) {
  if (material !== 'paper') return null;
  const pt = PAPER_TYPES[paperType];
  if (!pt) return null;
  if (paperType === 'pastel' && pastelColors && pastelColors.length === 2) {
    return `【紙の種類】${pt.label}（${pastelColors[0]} × ${pastelColors[1]}）`;
  }
  return `【紙の種類】${pt.label}`;
}

function hwLine({ includeHw, height, weight }) {
  if (!includeHw) return '【身長・体重】記載しない';
  const h = height ? `${height}cm` : '（未入力）';
  const w = weight ? `${Number(weight).toLocaleString('ja-JP')}g` : '（未入力）';
  return `【身長・体重】${h}／${w}`;
}

export function buildOrderText({
  name, furigana, birthText, includeBirth = true,
  includeHw = false, height = '', weight = '',
  size, material, frame, frameColor = 'black', wrapping, paperType, pastelColors, canvasSize,
}) {
  const sizeLabel = material === 'canvas'
    ? (CANVAS_SIZES[canvasSize]?.label ?? '')
    : SIZE_LABELS[size];
  const lines = [
    `【お名前】${name}（${furigana}）`,
    includeBirth ? `【生年月日】${birthText}` : '【生年月日】記載しない',
    hwLine({ includeHw, height, weight }),
    `【サイズ】${sizeLabel}　【素材】${MATERIAL_LABELS[material]}　【フレーム】${frame ? `あり（${FRAME_COLOR_LABELS[frameColor] ?? ''}）` : 'なし'}`,
  ];
  const paper = paperLine({ material, paperType, pastelColors });
  if (paper) lines.push(paper);
  lines.push(`【プレゼント包装】${wrapping ? 'あり' : 'なし'}`);
  if (wrapping) lines.push('※プレゼント包装(300円)も一緒にカートへお入れください');
  return lines.join('\n');
}
