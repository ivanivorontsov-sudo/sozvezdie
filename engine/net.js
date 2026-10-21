// Сетевая игра «Созвездие»: протокол синхронизации поверх любого транспорта
// (Bluetooth / локальная сеть через Android-мост, интернет через бесплатный публичный MQTT-брокер).
(function (root) {
  const S = root.Soz || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const VER = 1;
  // ---------- минимальный клиент MQTT 3.1.1 поверх WebSocket ----------
  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const enc = s => new TextEncoder().encode(s);
  function rlen(n) { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; }
  function str(s) { const b = enc(s); return [b.length >> 8, b.length & 255, ...b]; }
  function pkt(h, body) { return new Uint8Array([h, ...rlen(body.length), ...body]); }
  function MqttTransport(room, opts) {
    opts = opts || {}; const WS = opts.WebSocket || root.WebSocket;
    const self = { onmessage: null, onstatus: null, connected: false, id: 'c' + Math.random().toString(36).slice(2, 10) };
    let ws, bi = 0, ping, closed = false, buf = new Uint8Array(0);
    const topic = 'sozvezdie/v' + VER + '/' + room;
    function connect() {
      if (closed) return;
      const url = (opts.brokers || BROKERS)[bi % (opts.brokers || BROKERS).length];
      self.onstatus && self.onstatus('connecting', url);
      try { ws = new WS(url, 'mqtt'); } catch (e) { bi++; return setTimeout(connect, 1500); }
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        const body = [...str('MQTT'), 4, 2, 0, 30, ...str(self.id)];
        ws.send(pkt(0x10, body));
      };
      ws.onmessage = ev => {
        const d = new Uint8Array(ev.data); const nb = new Uint8Array(buf.length + d.length); nb.set(buf); nb.set(d, buf.length); buf = nb;
        while (buf.length >= 2) {
          let mul = 1, len = 0, i = 1, c;
          do { if (i >= buf.length) return; c = buf[i++]; len += (c & 127) * mul; mul *= 128; } while (c & 128);
          if (buf.length < i + len) return;
          const type = buf[0] >> 4, body = buf.slice(i, i + len); buf = buf.slice(i + len);
          if (type === 2) { // CONNACK
            ws.send(pkt(0x82, [0, 1, ...str(topic), 0]));
            self.connected = true; self.onstatus && self.onstatus('online', url);
            clearInterval(ping); ping = setInterval(() => { try { ws.send(new Uint8Array([0xC0, 0])); } catch (e) {} }, 20000);
          } else if (type === 3) { // PUBLISH
            const tl = (body[0] << 8) | body[1]; const payload = new TextDecoder().decode(body.slice(2 + tl));
            try { const m = JSON.parse(payload); if (m.from !== self.id) self.onmessage && self.onmessage(m); } catch (e) {}
          }
        }
      };
      const drop = () => { if (!self.connected && !closed) bi++; self.connected = false; clearInterval(ping);
        self.onstatus && self.onstatus('offline'); if (!closed) setTimeout(connect, 2000); };
      ws.onclose = drop; ws.onerror = () => { try { ws.close(); } catch (e) {} };
    }
    self.send = obj => { if (!self.connected) return false; obj.from = self.id;
      ws.send(pkt(0x30, [...str(topic), ...enc(JSON.stringify(obj))])); return true; };
    self.close = () => { closed = true; clearInterval(ping); try { ws.send(new Uint8Array([0xE0, 0])); ws.close(); } catch (e) {} };
    connect(); return self;
  }
  // ---------- основной интернет-транспорт: бесплатный ntfy.sh (HTTPS, порт 443, без ключей) ----------
  function NtfyTransport(room, opts) {
    opts = opts || {}; const WS = opts.WebSocket || root.WebSocket, F = opts.fetch || root.fetch.bind(root);
    const base = opts.base || 'https://ntfy.sh', topic = 'sozvezdie-v' + VER + '-' + room;
    const self = { onmessage: null, onstatus: null, connected: false, id: 'c' + Math.random().toString(36).slice(2, 10) };
    let ws, closed = false;
    function connect() {
      if (closed) return; self.onstatus && self.onstatus('connecting', base);
      ws = new WS(base.replace('https', 'wss') + '/' + topic + '/ws');
      ws.onmessage = ev => { try { const e = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
        if (e.event === 'open') { self.connected = true; self.onstatus && self.onstatus('online', base); }
        if (e.event === 'message') { const m = JSON.parse(e.message); if (m.from !== self.id) self.onmessage && self.onmessage(m); } } catch (x) {} };
      ws.onclose = () => { self.connected = false; self.onstatus && self.onstatus('offline'); if (!closed) setTimeout(connect, 2000); };
      ws.onerror = () => { try { ws.close(); } catch (x) {} };
    }
    self.send = obj => { if (!self.connected) return false; obj.from = self.id;
      F(base + '/' + topic, { method: 'POST', body: JSON.stringify(obj) }).catch(() => {}); return true; };
    self.close = () => { closed = true; try { ws.close(); } catch (x) {} };
    connect(); return self;
  }
  // ---------- мост к Android (Bluetooth RFCOMM / Wi-Fi TCP) ----------
  function AndroidTransport(kind) {
    const self = { onmessage: null, onstatus: null, connected: false };
    root.__netIn = s => { try { self.onmessage && self.onmessage(JSON.parse(s)); } catch (e) {} };
    root.__netStatus = (st, info) => { self.connected = st === 'online'; self.onstatus && self.onstatus(st, info); };
    self.send = o => { if (!self.connected) return false; root.AndroidNet.send(JSON.stringify(o)); return true; };
    self.close = () => root.AndroidNet.close();
    return self;
  }
  // ---------- сессия: журнал ходов, проверка, переподключение, реванш ----------
  // myColor: 1 у хозяина (ходит первым), -1 у гостя. Правило пирога в сети отключено для простоты? Нет — включено, обмен = ход {t:'swap'}.
  function Session(transport, role, opts) {
    opts = opts || {};
    const self = { role, game: S.newGame(), moves: [], round: 0, peer: false, onupdate: null, onevent: null };
    // хозяин начинает чётные партии, гость — нечётные (реванш = смена первого хода)
    self.startColorOf = () => ((self.round % 2 === 0) === (role === 'host')) ? 'first' : 'second';
    self.mySeat = () => self.startColorOf() === 'first' ? 0 : 1; // 0 — начинающий
    // кто ходит: место 0 играет цветом 1 (или -1 после обмена)
    self.seatToMove = () => { const g = self.game; const c = g.turn; const seat0Color = g.swapped ? -1 : 1; return c === seat0Color ? 0 : 1; };
    self.myTurn = () => !self.game.over && self.seatToMove() === self.mySeat();
    function valid(g, m) { return S.legalMoves(g).some(x => x.t === m.t && x.to === m.to && x.from === m.from); }
    function rebuild(list) { const g = S.newGame(); for (const m of list) { if (!valid(g, m)) return null; S.play(g, m); } return g; }
    const send = o => { o.ver = VER; o.round = self.round; transport.send(o); };
    self.sendState = () => send({type: 'state', moves: self.moves});
    self.move = m => {
      if (!self.myTurn() || !valid(self.game, m)) return false;
      const log = S.play(self.game, m); self.moves.push(m); send({type: 'move', n: self.moves.length, m});
      self.onupdate && self.onupdate(log, 'me'); return true;
    };
    self.rematch = () => { self.wantRematch = true; send({type: 'rematch'}); check(); };
    function check() { if (self.wantRematch && self.peerRematch) { self.round++; self.game = S.newGame(); self.moves = []; self.wantRematch = self.peerRematch = false; self.onevent && self.onevent('rematch'); self.onupdate && self.onupdate(null, 'reset'); } }
    transport.onmessage = msg => {
      if (msg.ver !== VER) return self.onevent && self.onevent('version');
      if (msg.type === 'hello') { self.peer = true; self.onevent && self.onevent('peer'); if (!msg.reply) send({type: 'hello', reply: true}); self.sendState(); return; }
      if (msg.round > self.round && msg.type === 'state') { self.round = msg.round; self.game = S.newGame(); self.moves = []; }
      if (msg.round !== self.round) return;
      if (msg.type === 'move') {
        if (msg.n === self.moves.length + 1 && !self.myTurn() && valid(self.game, msg.m)) {
          const log = S.play(self.game, msg.m); self.moves.push(msg.m); self.onupdate && self.onupdate(log, 'peer');
        } else if (msg.n > self.moves.length + 1) send({type: 'need'});
        else if (msg.n === self.moves.length + 1) self.onevent && self.onevent('cheat');
      } else if (msg.type === 'need') self.sendState();
      else if (msg.type === 'state') {
        // принимаем более длинный журнал, если он продолжает наш и проходит проверку
        const L = msg.moves || [];
        if (L.length > self.moves.length && JSON.stringify(L.slice(0, self.moves.length)) === JSON.stringify(self.moves)) {
          const g = rebuild(L); if (g) { self.game = g; self.moves = L.slice(); self.onupdate && self.onupdate(null, 'sync'); } else self.onevent && self.onevent('cheat');
        } else if (L.length < self.moves.length) self.sendState();
      } else if (msg.type === 'rematch') { self.peerRematch = true; self.onevent && self.onevent('peerRematch'); check(); }
    };
    const prevStatus = transport.onstatus;
    transport.onstatus = (st, info) => { if (st === 'online') send({type: 'hello'}); if (st !== 'online') self.peer = false; self.onevent && self.onevent(st, info); };
    // периодическая сверка: переживает потерю пакетов и обрыв связи
    self.timer = setInterval(() => { if (transport.connected) { send({type: 'state', moves: self.moves}); if (self.wantRematch) send({type: 'rematch'}); } }, opts.syncMs || 8000);
    self.close = () => { clearInterval(self.timer); transport.close(); };
    return self;
  }
  const newRoomCode = () => { const a = 'АБВГДЕЖИКЛМНПРСТУФХЦЧШЭЮЯ'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const roomId = code => Array.from(code.toUpperCase().replace(/\s/g, '')).map(ch => ch.charCodeAt(0).toString(16)).join('');
  const api = { NtfyTransport, MqttTransport, AndroidTransport, Session, newRoomCode, roomId, BROKERS, VER };
  if (typeof module !== 'undefined') module.exports = api; else root.SozNet = api;
})(typeof window !== 'undefined' ? window : globalThis);
