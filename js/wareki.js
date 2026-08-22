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
