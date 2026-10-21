const S = require('../engine/engine.js'); let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
let strong = 0, weak = 0, d = 0; const n = +process.argv[2] || 60;
for (let k = 0; k < n; k++) { const g = S.newGame(); const sc = k % 2 ? 1 : -1;
  while (!g.over) { const m = g.ply === 0 ? {t:'star', to:[14,15,20,21][Math.floor(rnd()*4)]} : S.aiMove(g, g.turn === sc ? 3 : 2, rnd, g.turn === sc ? 4 : 3); S.play(g, m); }
  if (!g.winner) d++; else if (g.winner === sc) strong++; else weak++; }
console.log(JSON.stringify({games:n, masterWins:strong, amateurWins:weak, draws:d}));
