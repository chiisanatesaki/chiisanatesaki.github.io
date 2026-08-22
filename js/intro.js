// ヒーローのロゴを筆書き風に一度だけ再生する。
// 「視差効果を減らす」設定・JS無効・要素欠落時は何もしない（ロゴは通常表示のまま）。
const logo = document.querySelector('.hero-logo');
const sub = document.querySelector('.logo-sub');
const chars = [...document.querySelectorAll('.logo-main .ch')];
const saki = document.querySelector('.logo-saki');
const seal = document.querySelector('.seal');

const T = {
  subAt: 0, subDur: 420,
  charAt: 280, charGap: 330, charDur: 500,
  sakiDur: 360,
  sealDur: 720,
};
const inkEase = 'cubic-bezier(0.3, 0.7, 0.2, 1)';

async function run() {
  if (!logo || !sub || !saki || !seal || chars.length === 0) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  logo.classList.add('is-armed');
  try { await document.fonts.ready; } catch { /* フォント待ちに失敗しても再生する */ }

  // バックグラウンドタブで開かれた場合は、見えるようになってから書き始める
  if (document.visibilityState === 'hidden') {
    await new Promise((resolve) => {
      document.addEventListener('visibilitychange', function onVisible() {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          resolve();
        }
      });
    });
  }

  sub.animate(
    [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { delay: T.subAt, duration: T.subDur, easing: 'ease-out', fill: 'both' }
  );

  // 一文字ずつ、上から下へ墨がにじみながら現れる
  chars.forEach((ch, i) => {
    ch.animate(
      [
        { opacity: 1, clipPath: 'inset(0 0 100% 0)', filter: 'blur(5px)', transform: 'scale(1.035)' },
        { opacity: 1, clipPath: 'inset(0 0 34% 0)', filter: 'blur(2px)', transform: 'scale(1.02)', offset: 0.45 },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', filter: 'blur(0px)', transform: 'scale(1)' },
      ],
      { delay: T.charAt + i * T.charGap, duration: T.charDur, easing: inkEase, fill: 'both' }
    );
  });

  const writeEnd = T.charAt + (chars.length - 1) * T.charGap + T.charDur;

  const sakiAt = writeEnd - 140;
  saki.animate(
    [
      { opacity: 1, clipPath: 'inset(0 0 100% 0)', filter: 'blur(3px)' },
      { opacity: 1, clipPath: 'inset(0 0 0 0)', filter: 'blur(0px)' },
    ],
    { delay: sakiAt, duration: T.sakiDur, easing: inkEase, fill: 'both' }
  );

  // 落款は静かに沈み込むように定着する
  seal.animate(
    [
      { opacity: 0, transform: 'scale(1.05)', filter: 'blur(1.5px)' },
      { opacity: 0.9, transform: 'scale(1)', filter: 'blur(0px)' },
    ],
    { delay: sakiAt + T.sakiDur + 120, duration: T.sealDur, easing: 'cubic-bezier(0.25, 0.6, 0.2, 1)', fill: 'both' }
  );
}

run();
