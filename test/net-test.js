// Тест протокола: две сессии, ИИ играет за обе стороны.
// Режим mem: транспорт в памяти с потерей 30% пакетов и обрывом связи. Режим mqtt: настоящий публичный брокер.
const S = require('../engine/engine.js'); globalThis.Soz = S; const N = require('../engine/net.js');
const mode = process.argv[2] || 'mem';
function memPair(loss) {
  const a = {connected: true}, b = {connected: true};
  const deliver = (to, o) => { if (!to.connected || Math.random() < loss) return; const s = JSON.stringify(o); setTimeout(() => to.onmessage && to.onmessage(JSON.parse(s)), 5 + Math.random() * 30); };
  a.send = o => { if (!a.connected) return false; deliver(b, o); return true; }; b.send = o => { if (!b.connected) return false; deliver(a, o); return true; };
  a.close = b.close = () => {}; return [a, b];
}
(async () => {
  let ta, tb;
  if (mode === 'mem') [ta, tb] = memPair(0.3);
  else { const room = N.roomId(N.newRoomCode()) + Date.now(); const WS = require('ws');
    ta = N.NtfyTransport(room, {WebSocket: WS}); tb = N.NtfyTransport(room, {WebSocket: WS}); }
  const A = N.Session(ta, 'host', {syncMs: mode === 'mem' ? 200 : 8000}), B = N.Session(tb, 'guest', {syncMs: mode === 'mem' ? 200 : 8000});
  const ev = []; A.onevent = e => ev.push('A:' + e); B.onevent = e => ev.push('B:' + e);
  if (mode === 'mem') { ta.onstatus('online'); tb.onstatus('online'); }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let round = 0; round < 2; round++) {
    let t0 = Date.now(), dropped = false;
    while (!(A.game.over && B.game.over && A.moves.length === B.moves.length) && Date.now() - t0 < 240000) {
      for (const P of [A, B]) if (P.myTurn() && P.moves.length === (P === A ? B : A).moves.length || P.myTurn() && mode === 'mem') {
        if (P.myTurn()) P.move(S.aiMove(P.game, 1));
      }
      if (mode === 'mem' && !dropped && A.moves.length > 6 && mode==='mem') { dropped = true; tb.connected = false; await wait(300); tb.connected = true; ev.push('обрыв B на 300 мс'); }
      await wait(mode === 'mem' ? 20 : 300);
    }
    const same = JSON.stringify(A.moves) === JSON.stringify(B.moves) && JSON.stringify(A.game.b) === JSON.stringify(B.game.b);
    console.log(`[${mode}] партия ${round + 1}: ходов ${A.moves.length}, итог одинаков у обоих: ${same}, победитель-цвет ${A.game.winner}, A начинал: ${A.mySeat() === 0}`);
    A.rematch(); B.rematch(); await wait(mode === 'mem' ? 500 : 4000);
    console.log(`  после реванша: round A=${A.round} B=${B.round}, A начинает: ${A.mySeat() === 0}, B начинает: ${B.mySeat() === 0}`);
  }
  console.log('события:', [...new Set(ev)].join(', '));
  A.close(); B.close(); setTimeout(() => process.exit(0), 300);
})();
