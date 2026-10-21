const pp = require('puppeteer-core');
(async () => {
  const b = await pp.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], defaultViewport: { width: 412, height: 880 } });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const url = 'file:///workspace/sozvezdie/app/app/src/main/assets/index.html';
  await p.goto(url + '#tut'); const wait = ms => new Promise(r => setTimeout(r, ms));
  const T = [14, 14, 4, 1, 7, 21];
  for (let k = 0; k < 6; k++) { await p.click(`.cell[data-i="${T[k]}"]`); await wait(1000); const t = await p.$eval('#tutText', e => e.textContent); console.log('урок', k + 1, '→', t.slice(0, 60));
    if (k === 2) console.log('  трофеи золотых:', await p.evaluate(() => G.cap[1])); if (k === 4) console.log('  солнце удержало:', await p.evaluate(() => G.b[8] === -1 && G.b[9] === -2));
    if (k < 5) await p.click('#tutNext'); }
  await p.screenshot({ path: '/workspace/sozvezdie/shots/app-tut-win.png' });
  // партия вдвоём: случайные клики до конца
  await p.goto(url + '?a#x'); await p.evaluate(() => act.hotseat());
  let n = 0; while (n < 300 && !(await p.evaluate(() => G.over))) { const mv = await p.evaluate(() => { const m = Soz.legalMoves(G).filter(x => x.t !== 'swap'); return m[Math.floor(Math.random() * m.length)]; });
    if (mv.t === 'sun') await p.click(`#${await p.evaluate(()=>G.turn===1?'pBot':'pTop')} .chip[data-t="sun"]`); if (mv.t === 'move') await p.click(`.cell[data-i="${mv.from}"]`);
    await p.click(`.cell[data-i="${mv.to}"]`); await wait(420); n++; }
  console.log('вдвоём: кликов', n, 'итог', await p.evaluate(() => [G.over, G.winner, G.ply, G.line ? 'ряд' : G.byCapture ? 'трофеи' : 'ничья']));
  await wait(1500); await p.screenshot({ path: '/workspace/sozvezdie/shots/app-gameover.png' });
  // против Мастера: 4 хода человека
  await p.goto(url + '?b#x'); await p.evaluate(() => startAi(3));
  for (let k = 0; k < 4; k++) { const mv = await p.evaluate(() => Soz.legalMoves(G).find(x => x.t === 'star')); await p.click(`.cell[data-i="${mv.to}"]`); const t0 = Date.now(); await p.waitForFunction(() => !busy && G.turn === 1 || G.over, { timeout: 20000 }); console.log('ИИ-Мастер ответил за', Date.now() - t0, 'мс, ply', await p.evaluate(() => G.ply)); if (await p.evaluate(() => G.over)) break; }
  await wait(600); await p.screenshot({ path: '/workspace/sozvezdie/shots/app-vs-ai.png' });
  await p.click('#undoBtn'); console.log('после отмены ply', await p.evaluate(() => G.ply));
  console.log('ошибки JS:', errs.length ? errs : 'нет'); await b.close();
})();
