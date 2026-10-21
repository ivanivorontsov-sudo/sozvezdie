'use strict';
const S = window.Soz, NET = window.SozNet, $ = s => document.querySelector(s);
const isAndroid = !!window.AndroidNet;
// звёздное небо
(() => { const sky = $('#sky'); for (let i = 0; i < 70; i++) { const e = document.createElement('i'); e.style.left = Math.random() * 100 + '%'; e.style.top = Math.random() * 100 + '%'; e.style.animationDelay = Math.random() * 3 + 's'; sky.appendChild(e); } })();
if (!isAndroid) document.querySelectorAll('.android').forEach(e => e.classList.add('hidden'));

const COLORS = { 1: ['#FFD66B', '#FF9E3D'], '-1': ['#8EC5FF', '#7A6BFF'] };
function svg(v) {
  const [a, b] = COLORS[v > 0 ? 1 : -1], id = 'g' + Math.random().toString(36).slice(2, 7);
  const grad = `<defs><radialGradient id="${id}" cx="35%" cy="30%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>`;
  if (Math.abs(v) === 2) { let rays = ''; for (let k = 0; k < 12; k++) { const t = k * Math.PI / 6; rays += `<line x1="${50 + 30 * Math.cos(t)}" y1="${50 + 30 * Math.sin(t)}" x2="${50 + 46 * Math.cos(t)}" y2="${50 + 46 * Math.sin(t)}" stroke="${b}" stroke-width="6" stroke-linecap="round"/>`; }
    return `<svg viewBox="0 0 100 100">${grad}${rays}<circle cx="50" cy="50" r="27" fill="url(#${id})" stroke="#fff" stroke-width="3"/><circle cx="50" cy="50" r="9" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/></svg>`; }
  let p = ''; for (let k = 0; k < 10; k++) { const r = k % 2 ? 19 : 46, t = -Math.PI / 2 + k * Math.PI / 5; p += `${50 + r * Math.cos(t)},${52 + r * Math.sin(t)} `; }
  return `<svg viewBox="0 0 100 100">${grad}<polygon points="${p}" fill="url(#${id})" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
// ---------- навигация ----------
let back = null;
function go(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); back = id === 'menu' ? null : (id === 'game' ? () => act.quit() : () => go('menu')); }
window.onBack = () => { if (!$('#overlay').classList.contains('hidden')) { hideOv(); return true; } if (back) { back(); return true; } return false; };
document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.go) go(b.dataset.go); if (b.dataset.act) act[b.dataset.act](b); if (b.dataset.ai) startAi(+b.dataset.ai); });
function ov(title, text, btns) { $('#ovTitle').textContent = title; $('#ovText').innerHTML = text; const box = $('#ovBtns'); box.innerHTML = '';
  for (const [label, fn] of btns) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { hideOv(); fn && fn(); }; box.appendChild(b); } $('#overlay').classList.remove('hidden'); }
function hideOv() { $('#overlay').classList.add('hidden'); }

// ---------- партия ----------
let G, mode, sel = 'star', from = null, pieces = {}, busy = false, history = [];
const names = { 1: 'Золотые', '-1': 'Лазурные' };
function bottomColor() { if (mode.kind === 'net') return mode.session.mySeat() === 0 ? 1 : -1; if (mode.kind === 'ai') return -mode.aiColor; return 1; }
function nameOf(c) { if (mode.kind === 'ai') return c === mode.aiColor ? 'ИИ · ' + ['', 'Новичок', 'Любитель', 'Мастер'][mode.level] : 'Ты'; if (mode.kind === 'net') return c === bottomColor() ? 'Ты' : 'Соперник'; return names[c]; }
function canAct() { if (busy || G.over) return false; if (mode.kind === 'ai') return G.turn !== mode.aiColor; if (mode.kind === 'net') return mode.session.myTurn() && mode.session.peer; return true; }

function buildBoard() { const b = $('#board'); b.innerHTML = ''; pieces = {};
  for (let i = 0; i < 36; i++) { const c = document.createElement('div'); c.className = 'cell'; c.dataset.i = i; c.onclick = () => tap(i); b.appendChild(c); } }
function pos(el, i, dr = 0, dc = 0) { const r = Math.floor(i / 6) + dr, c = i % 6 + dc; el.style.left = (3 + c * 16.1) + '%'; el.style.top = (3 + r * 16.1) + '%'; }
function makePiece(i, v, anim) { const el = document.createElement('div'); el.className = 'pc' + (anim ? ' new' : ''); el.innerHTML = svg(v); pos(el, i); $('#board').appendChild(el); pieces[i] = el; return el; }
function renderAll() { Object.values(pieces).forEach(e => e.remove()); pieces = {}; G.b.forEach((v, i) => { if (v) makePiece(i, v); }); panels(); }
function animate(log) {
  if (!log || !log.placed) { renderAll(); return; }
  const p = log.placed;
  if (p.from !== undefined && pieces[p.from]) { const el = pieces[p.from]; delete pieces[p.from]; pieces[p.to] = el; pos(el, p.to); }
  else makePiece(p.to, p.v, true);
  setTimeout(() => {
    const moved = {};
    for (const f of log.fell) { const el = pieces[f.from]; if (!el) continue; delete pieces[f.from]; pos(el, f.from, f.dr, f.dc); el.classList.add('gone'); setTimeout(() => el.remove(), 350); }
    for (const m of log.pushes) { const el = pieces[m.from]; if (!el) continue; delete pieces[m.from]; moved[m.to] = el; pos(el, m.to); }
    Object.assign(pieces, moved);
    vibrate(log.fell.length ? 40 : 12);
  }, 120);
}
function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
function panels() {
  const bc = bottomColor();
  for (const [el, c] of [[$('#pBot'), bc], [$('#pTop'), -bc]]) {
    const R = G.res[c], mine = canAct() && G.turn === c;
    el.classList.toggle('turn', !G.over && G.turn === c);
    el.innerHTML = `<div class="name">${nameOf(c)}</div><div class="trophy">🏆 ${G.cap[c]}/5</div><div class="res">
      <div class="chip ${mine && sel === 'star' ? 'sel' : ''}" data-t="star">${svg(c)}<b>${R.s}</b></div>
      <div class="chip ${mine && sel === 'sun' ? 'sel' : ''}" data-t="sun">${R.sun ? svg(2 * c) : ''}<b>${R.sun}</b></div></div>`;
    el.querySelectorAll('.chip').forEach(ch => ch.onclick = () => { if (G.turn === c && canAct()) { sel = ch.dataset.t; from = null; panels(); hints(); } });
  }
  let m = '';
  if (G.over) m = G.winner ? `Победа: ${nameOf(G.winner)}` : 'Ничья';
  else if (mode.kind === 'net' && !mode.session.peer) m = mode.status || 'Ждём соперника…';
  else if (busy && mode.kind === 'ai') m = 'ИИ думает…';
  else if (G.res[G.turn].s === 0 && sel !== 'sun') m = from === null ? 'Звёзды кончились: выбери свою звезду на поле, чтобы переставить' : 'Куда переставить?';
  else m = canAct() ? (sel === 'sun' ? 'Поставь Солнце' : 'Поставь звезду') : 'Ход соперника';
  if (sel === 'sun' && G.ply < 2 && canAct()) m = 'Солнце можно ставить со второго хода';
  $('#msg').textContent = m; $('#undoBtn').style.visibility = (mode.kind === 'hot' || mode.kind === 'ai') ? 'visible' : 'hidden';
}
function hints() { document.querySelectorAll('.cell').forEach(c => c.classList.remove('hint', 'target'));
  { const h = mode.kind === "tut" && mode.step && document.querySelector(`.cell[data-i="${mode.step.target}"]`); if (h) h.classList.add("hint"); }
  if (from !== null) document.querySelector(`.cell[data-i="${from}"]`).classList.add('target'); }
function tap(i) {
  if (!canAct()) return;
  const p = G.turn; let m;
  if (sel === 'sun') { if (G.res[p].sun === 0) { sel = 'star'; return panels(); } m = { t: 'sun', to: i }; }
  else if (G.res[p].s === 0) {
    if (G.b[i] === p) { from = i; panels(); hints(); return; }
    if (from === null) return; m = { t: 'move', from, to: i };
  } else m = { t: 'star', to: i };
  const ok = S.legalMoves(G).some(x => x.t === m.t && x.to === m.to && x.from === m.from);
  if (!ok) { vibrate(60); return; }
  if (mode.kind === 'tut' && mode.step.target !== undefined && i !== mode.step.target) { $('#msg').textContent = 'Попробуй клетку с подсказкой'; return; }
  commit(m);
}
function commit(m) {
  from = null;
  if (mode.kind === 'net') { const was = mode.session.moves.length; if (!mode.session.move(m)) return; return; }
  history.push(S.clone(G)); const log = S.play(G, m); afterMove(log);
}
function afterMove(log) {
  animate(log); sel = 'star';
  if (G.res[G.turn] && G.res[G.turn].s === 0 && G.res[G.turn].sun === 0) sel = 'star';
  panels(); hints();
  if (mode.kind === 'tut') return setTimeout(tutDone, 700);
  if (G.over) return setTimeout(finish, 650);
  if (mode.kind === 'ai' && G.turn === mode.aiColor) aiTurn();
}
function aiTurn() { busy = true; panels(); setTimeout(() => { const m = S.aiMove(G, mode.level); busy = false; history.push(S.clone(G)); afterMove(S.play(G, m)); }, 450); }
function finish() {
  if (G.line) G.line.forEach(i => pieces[i] && pieces[i].classList.add('win'));
  const how = G.line ? 'Четыре в ряд!' : G.byCapture ? 'Пять звёзд соперника сбито с неба!' : 'Партия длилась 50 ходов — ничья.';
  const t = G.winner ? (mode.kind === 'hot' ? `Победили ${nameOf(G.winner)}` : nameOf(G.winner) === 'Ты' ? 'Ты победил!' : (mode.kind === 'net' ? 'Соперник победил' : 'ИИ победил')) : 'Ничья';
  setTimeout(() => ov(t, how, [['Ещё партию', () => act.rematch()], ['В меню', () => act.quit(true)]]), 600);
}
function startGame(m) { mode = m; G = S.newGame(); history = []; sel = 'star'; from = null; busy = false; buildBoard(); go('game'); renderAll(); hints();
  $('#tut').classList.add('hidden'); $('#title').textContent = { hot: 'Вдвоём', ai: 'Против ИИ', net: 'По сети', tut: 'Обучение' }[m.kind];
  if (m.kind === 'ai' && G.turn === m.aiColor) aiTurn(); }
function startAi(level) { startGame({ kind: 'ai', level, aiColor: $('#aiFirst').checked ? 1 : -1 }); }

// ---------- обучение ----------
const LESSONS = [
  { text: 'Это поле 6×6. Ты играешь золотыми. Поставь звезду на подсвеченную клетку.', setup: [], target: 14, after: 'Отлично! За ход ставится одна фишка на любую пустую клетку.' },
  { text: 'Новая фишка ОТТАЛКИВАЕТ соседей по 4 сторонам (не по диагонали). Поставь звезду рядом с лазурной.', setup: [[15, -1]], target: 14, after: 'Лазурная звезда отъехала на клетку. Отталкиваются и чужие, и свои фишки.' },
  { text: 'Если фишку вытолкнуть за край поля, чужая звезда становится твоим трофеем 🏆. Столкни лазурную звезду!', setup: [[5, -1]], target: 4, after: 'Трофей! Собери 5 трофеев — и победишь.' },
  { text: 'Толкается вся сплошная цепочка. Поставь звезду слева от пары лазурных.', setup: [[2, -1], [3, -1]], target: 1, after: 'Обе звезды сдвинулись разом.' },
  { text: 'Солнце — якорь: его нельзя сдвинуть, и цепочка с Солнцем стоит на месте. Попробуй толкнуть.', setup: [[8, -1], [9, -2]], target: 7, after: 'Ничего не сдвинулось — Солнце держит линию. У каждого одно Солнце, береги его для защиты.' },
  { text: 'Главная цель — 4 своих фишки в ряд по горизонтали, вертикали или диагонали. Заверши диагональ!', setup: [[0, 1], [7, 1], [14, 1]], target: 21, after: 'Созвездие сложено — победа! Помни: второй игрок начинает с одним трофеем.' },
];

function tutLoad(k) {
  const L = LESSONS[k]; mode.step = L; G = S.newGame(); G.cap[-1] = 0; G.ply = 2;
  for (const [i, v] of L.setup) { G.b[i] = v; } renderAll(); hints();
  $('#tut').classList.remove('hidden'); $('#tutText').textContent = `Урок ${k + 1}/${LESSONS.length}. ` + L.text; $('#tutNext').classList.add('hidden');
}
function tutDone() { const L = mode.step; $('#tutText').textContent = L.after; mode.step = { ...L, target: -1 }; hints(); G.over = true; panels();
  const nb = $('#tutNext'); nb.classList.remove('hidden');
  nb.textContent = mode.k + 1 < LESSONS.length ? 'Дальше' : 'Сыграть с ИИ';
  nb.onclick = () => { if (mode.k + 1 < LESSONS.length) { mode.k++; G.over = false; tutLoad(mode.k); } else { try { localStorage.tutDone = 1; } catch (e) {} startAi(1); } }; }
// ---------- сеть ----------
function startNet(transport, role, info) {
  const s = NET.Session(transport, role);
  startGame({ kind: 'net', session: s, status: info }); G = s.game; renderAll();
  s.onupdate = (log, who) => { G = s.game; if (who === 'reset') { hideOv(); renderAll(); hints(); return; } if (log) afterMove(log); else { renderAll(); if (G.over) finish(); } };
  s.onevent = (e, inf) => {
    if (e === 'peer') { mode.status = ''; vibrate(30); }
    if (e === 'offline' || e === 'connecting') mode.status = inf || 'Связь потеряна, переподключаюсь…';
    if (e === 'waiting') mode.status = inf; if (e === 'error') { mode.status = inf; }
    if (e === 'peerRematch') $('#msg').textContent = 'Соперник хочет реванш';
    if (e === 'version') ov('Разные версии', 'У соперника другая версия игры. Обновите приложение.', [['OK']]);
    if (e === 'cheat') $('#msg').textContent = 'Получен неверный ход — запрошена сверка';
    panels();
  };
}
window.__netEvent = (name, data) => {
  const box = name === 'btDevices' ? $('#btList') : $('#lanList'); box.innerHTML = data.length ? '' : '<p>Пока ничего не найдено…</p>';
  for (const d of data) { const b = document.createElement('button'); b.textContent = d.name + (d.host ? ' · ' + d.host : '');
    b.onclick = () => { if (name === 'btDevices') { startNet(NET.AndroidTransport('bt'), 'guest', 'Подключаюсь…'); AndroidNet.btJoin(d.address); } else { startNet(NET.AndroidTransport('lan'), 'guest', 'Подключаюсь…'); AndroidNet.lanJoin(d.host); } };
    box.appendChild(b); }
};
const act = {
  hotseat: () => startGame({ kind: 'hot' }),
  tutorial: () => { startGame({ kind: 'tut', k: 0 }); tutLoad(0); },
  undo: () => { if (busy) return; if (mode.kind === 'ai') { while (history.length && (history.length > 0)) { G = history.pop(); if (G.turn !== mode.aiColor) break; } } else if (history.length) G = history.pop(); renderAll(); hints(); },
  quit: (force) => { const leave = () => { if (mode && mode.kind === 'net') mode.session.close(); $('#tut').classList.add('hidden'); go('menu'); };
    if (force === true || !G || G.over || mode.kind === 'tut') return leave(); ov('Выйти из партии?', '', [['Выйти', leave], ['Остаться']]); },
  rematch: () => { if (mode.kind === 'net') { mode.session.rematch(); $('#msg').textContent = 'Ждём согласия соперника на реванш…'; } else if (mode.kind === 'ai') startGame({ ...mode, aiColor: -mode.aiColor }); else startGame(mode); },
  inetHost: () => { const code = NET.newRoomCode(); startNet(NET.NtfyTransport(NET.roomId(code)), 'host', 'Код игры: ' + code + ' — скажи его сопернику');
    ov('Код игры', `<span style="font-size:34px;letter-spacing:6px;color:#FFD66B">${code}</span><br>Соперник вводит его в «Войти».`, [['OK']]); },
  inetJoin: () => { const code = $('#code').value.trim().toUpperCase(); if (code.length !== 5) return ov('Нужен код', 'Код состоит из 5 букв.', [['OK']]);
    startNet(NET.NtfyTransport(NET.roomId(code)), 'guest', 'Подключаюсь к игре ' + code + '…'); },
  btHost: () => { startNet(NET.AndroidTransport('bt'), 'host', 'Жду подключения по Bluetooth…'); AndroidNet.btHost(); },
  btScan: () => { $('#btList').innerHTML = '<p>Ищу телефоны…</p>'; AndroidNet.btScan(); },
  lanHost: () => { startNet(NET.AndroidTransport('lan'), 'host', 'Мой адрес: ' + AndroidNet.myIp()); AndroidNet.lanHost(); },
  lanScan: () => { $('#lanList').innerHTML = '<p>Ищу игры в сети…</p>'; AndroidNet.lanScan(); },
  lanJoin: () => { const ip = $('#ip').value.trim(); if (!ip) return; startNet(NET.AndroidTransport('lan'), 'guest', 'Подключаюсь…'); AndroidNet.lanJoin(ip); },
};
go('menu');
try { if (!localStorage.tutDone && !location.hash) setTimeout(() => ov('Добро пожаловать!', 'Правила учатся за 3 минуты. Пройти обучение?', [['Да', act.tutorial], ['Позже']]), 500); } catch (e) {}
// режимы для скриншотов/проверки: #demo, #tut, #rules, #net
if (location.hash === '#demo') { hideOv(); startGame({ kind: 'hot' }); for (const m of [{t:'star',to:14},{t:'star',to:15},{t:'star',to:21},{t:'sun',to:20},{t:'star',to:8},{t:'star',to:27}]) S.play(G, m); renderAll(); }
if (location.hash === '#tut') { hideOv(); act.tutorial(); }
if (location.hash === '#rules') { hideOv(); go('rules'); }
if (location.hash === '#net') { hideOv(); go('net'); }
