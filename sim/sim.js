const S = require('../engine/engine.js');
let seed = +process.argv[4] || 1; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const n = +process.argv[2] || 100, lvl = +process.argv[3] || 2, pie = process.argv[5] === 'pie', capWin = +(process.argv[6] ?? 4), nz = process.argv[7] !== undefined ? +process.argv[7] : undefined;
let caps = 0, w1 = 0, w2 = 0, d = 0, len = [], swaps = 0, sunUse = 0, fall = 0, reloc = 0;
for (let k = 0; k < n; k++) {
  const g = S.newGame({pie, capWin, komi: +(process.env.KOMI??1)});
  // разнообразие: первый ход случайный в центральной зоне 4x4
  while (!g.over) {
    let m = g.ply === 0 ? (() => { const c = [7,8,9,10,13,14,15,16,19,20,21,22,25,26,27,28]; return {t:'star', to: c[Math.floor(rnd()*16)]}; })() : S.aiMove(g, lvl, rnd, nz);
    if (m.t === 'swap') swaps++; if (m.t === 'sun') sunUse++; if (m.t === 'move') reloc++;
    const lg = S.play(g, m); fall += lg.fell.length;
  }
  // победитель по ИГРОКАМ: игрок A начал. Если был обмен, A играет цветом -1
  const aColor = g.swapped ? -1 : 1;
  if (g.winner === 0) d++; else if (g.winner === aColor) w1++; else w2++;
  len.push(g.ply); if (g.byCapture) caps++;
}
len.sort((a,b)=>a-b);
console.log(JSON.stringify({games:n, level:lvl, pie, firstPlayerWins:w1, secondPlayerWins:w2, draws:d,
  firstWinRate:+(w1/(n-d||1)).toFixed(3), avgPlies:+(len.reduce((a,b)=>a+b,0)/n).toFixed(1), medianPlies:len[n>>1], minPlies:len[0], maxPlies:len[n-1],
  swaps, captureWins: caps, sunPerGame:+(sunUse/n).toFixed(2), fallsPerGame:+(fall/n).toFixed(2), relocPerGame:+(reloc/n).toFixed(2)}));
