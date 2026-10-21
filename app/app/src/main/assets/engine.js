// «Созвездие» — движок правил. Работает в браузере (window.Soz) и в Node (module.exports).
(function (root) {
  const N = 6, CELLS = 36, STARS = 10, MAX_PLY = 100;
  const DIRS = [[0,1],[1,0],[0,-1],[-1,0]];
  // все линии по 4 клетки
  const LINES = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const er = r + 3*dr, ec = c + 3*dc;
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      LINES.push([0,1,2,3].map(k => (r+k*dr)*N + (c+k*dc)));
    }
  function newGame(opts) {
    opts = opts || {};
    return { b: new Array(CELLS).fill(0), res: { 1: {s: STARS, sun: 1}, '-1': {s: STARS, sun: 1} },
             turn: 1, ply: 0, cap: {1: 0, '-1': opts.komi === undefined ? 1 : opts.komi}, capWin: opts.capWin === undefined ? 5 : opts.capWin, winner: 0, over: false, last: null, pie: !!opts.pie, swapped: false };
  }
  function clone(g) { return { b: g.b.slice(), res: { 1: {...g.res[1]}, '-1': {...g.res[-1]} }, turn: g.turn, ply: g.ply, cap: {1: g.cap[1], '-1': g.cap[-1]}, capWin: g.capWin,
    winner: g.winner, over: g.over, last: g.last, pie: g.pie, swapped: g.swapped }; }
  const owner = v => v > 0 ? 1 : v < 0 ? -1 : 0;
  // Ход: {t:'star'|'sun'|'move'|'swap', to, from}
  function legalMoves(g, noSwap) {
    if (g.over) return [];
    const p = g.turn, R = g.res[p], mv = [];
    if (!noSwap && g.pie && g.ply === 1 && !g.swapped) mv.push({t:'swap'});
    const empt = []; for (let i = 0; i < CELLS; i++) if (g.b[i] === 0) empt.push(i);
    for (const to of empt) {
      if (R.s > 0) mv.push({t:'star', to});
      if (R.sun > 0 && g.ply >= 2) mv.push({t:'sun', to}); // Солнце нельзя ставить первым ходом
    }
    if (R.s === 0) for (let f = 0; f < CELLS; f++) if (g.b[f] === p)
      for (const to of empt) mv.push({t:'move', from: f, to});
    return mv;
  }
  function hasLine(b, p) {
    for (const L of LINES) if (owner(b[L[0]])===p && owner(b[L[1]])===p && owner(b[L[2]])===p && owner(b[L[3]])===p) return L;
    return null;
  }
  // применяет ход, возвращает журнал анимации
  function play(g, m) {
    const log = { placed: null, pushes: [], fell: [] };
    const p = g.turn;
    if (m.t === 'swap') { // правило пирога: второй игрок забирает цвет первого; доска не меняется, ходит цвет -1 (им теперь играет начавший)
      g.swapped = true; g.ply++; g.last = {t:'swap'}; return log;
    }
    if (m.t === 'move') { g.b[m.from] = 0; }
    else if (m.t === 'star') g.res[p].s--; else g.res[p].sun--;
    g.b[m.to] = (m.t === 'sun' ? 2 : 1) * p;
    log.placed = { to: m.to, from: m.from, v: g.b[m.to] };
    const r0 = Math.floor(m.to / N), c0 = m.to % N;
    for (const [dr, dc] of DIRS) {
      const chain = []; let r = r0 + dr, c = c0 + dc;
      while (r >= 0 && r < N && c >= 0 && c < N && g.b[r*N+c] !== 0) { chain.push(r*N+c); r += dr; c += dc; }
      if (!chain.length || chain.some(i => Math.abs(g.b[i]) === 2)) continue;
      const off = !(r >= 0 && r < N && c >= 0 && c < N);
      for (let k = chain.length - 1; k >= 0; k--) {
        const i = chain[k], v = g.b[i]; g.b[i] = 0;
        const nr = Math.floor(i/N) + dr, nc = i % N + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) { if (owner(v) === p || !g.capWin) g.res[owner(v)].s++; else g.cap[p]++; log.fell.push({from: i, v, dr, dc, captured: owner(v) !== p && !!g.capWin}); }
        else { g.b[nr*N+nc] = v; log.pushes.push({from: i, to: nr*N+nc, v}); }
      }
    }
    g.ply++; g.last = m;
    const mine = hasLine(g.b, p), theirs = hasLine(g.b, -p);
    if (mine) { g.over = true; g.winner = p; g.line = mine; }
    else if (g.capWin && g.cap[p] >= g.capWin) { g.over = true; g.winner = p; g.byCapture = true; }
    else if (theirs) { g.over = true; g.winner = -p; g.line = theirs; }
    else if (g.ply >= MAX_PLY) { g.over = true; g.winner = 0; }
    g.turn = -p;
    return log;
  }
  // оценка позиции для игрока p
  const W = [0, 1, 6, 40, 0];
  function evaluate(g, p) {
    if (g.over) return g.winner === p ? 1e6 : g.winner === 0 ? 0 : -1e6;
    let s = 0;
    for (const L of LINES) {
      let a = 0, o = 0;
      for (const i of L) { const w = owner(g.b[i]); if (w === p) a++; else if (w === -p) o++; }
      if (o === 0) s += W[a]; if (a === 0) s -= W[o] * 1.1;
    }
    for (let i = 0; i < CELLS; i++) { const r = Math.floor(i/N), c = i%N; const cen = (r>0&&r<5&&c>0&&c<5) ? 1 : 0;
      if (owner(g.b[i]) === p) s += cen; else if (owner(g.b[i]) === -p) s -= cen; }
    s += (g.res[p].sun - g.res[-p].sun) * 3;
    if (g.capWin) s += (g.cap[p] - g.cap[-p]) * 30 + (g.cap[p] === g.capWin - 1 ? 40 : 0) - (g.cap[-p] === g.capWin - 1 ? 40 : 0);
    return s;
  }
  function negamax(g, d, a, b, ctx) {
    if (g.over || d === 0) return evaluate(g, g.turn);
    let mv = legalMoves(g, true);
    if (mv.length > 60 && ctx.prune) { // сокращаем перестановки: берём лучшие по быстрой оценке
      mv = mv.map(m => { const h = clone(g); play(h, m); return [m, -evaluate(h, h.turn)]; })
             .sort((x, y) => y[1] - x[1]).slice(0, 40).map(x => x[0]);
    }
    let best = -Infinity;
    for (const m of mv) {
      const h = clone(g); play(h, m);
      const v = -negamax(h, d - 1, -b, -a, ctx) * 0.999;
      if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
    }
    return best;
  }
  // уровни: 1 — новичок, 2 — любитель, 3 — мастер
  function aiMove(g, level, rnd, noiseOverride) {
    rnd = rnd || Math.random;
    const depth = level === 1 ? 1 : level === 2 ? 2 : 3, noise = level === 1 ? 25 : level === 2 ? 10 : 0.5;
    const nz = noiseOverride !== undefined ? noiseOverride : noise;
    let mv = legalMoves(g, true);
    const scored = mv.map(m => { const h = clone(g); play(h, m); return [m, h]; });
    const win = scored.find(([m, h]) => h.over && h.winner === g.turn); if (win) return win[0];
    let cand = scored.map(([m, h]) => [m, h, -evaluate(h, h.turn)]).sort((x, y) => y[2] - x[2]);
    if (depth >= 2) cand = cand.slice(0, depth === 3 ? 24 : 30);
    let best = null, bv = -Infinity;
    for (const [m, h] of cand) {
      const v = -negamax(h, depth - 1, -Infinity, Infinity, {prune: true}) + rnd() * nz;
      if (v > bv) { bv = v; best = m; }
    }
    // правило пирога: если позиция для цвета -1 хуже нуля — меняемся (новичок не меняется)
    if (g.pie && g.ply === 1 && !g.swapped && level > 1) {
      const v = -negamax(g, 1, -Infinity, Infinity, {prune: true}) ; // оценка для текущего (−1) — грубо
      if (evaluate(g, g.turn) + (level===3?0:rnd()*4-2) < -2) return {t:'swap'};
    }
    return best;
  }
  const api = { N, CELLS, STARS, MAX_PLY, LINES, newGame, clone, legalMoves, play, hasLine, evaluate, aiMove, owner };
  if (typeof module !== 'undefined') module.exports = api; else root.Soz = api;
})(typeof window !== "undefined" ? window : globalThis);
