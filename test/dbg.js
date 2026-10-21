const pp = require('puppeteer-core');
(async () => { const b = await pp.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], defaultViewport: { width: 412, height: 880 } });
 const p = await b.newPage(); await p.goto('file:///workspace/sozvezdie/app/app/src/main/assets/index.html#tut'); await p.click('.cell[data-i="14"]'); await new Promise(r=>setTimeout(r,1000));
 console.log(await p.evaluate(() => { const e=document.querySelector('#tutNext'); const r=e.getBoundingClientRect(); return [e.className, r.x,r.y,r.width,r.height, getComputedStyle(e).display]; })); await b.close(); })();
