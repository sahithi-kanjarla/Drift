// Tiny dependency-free server: serves the app and stores bottles in a JSON file.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SEEDS } = require('./public/seeds.js');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'bottles.json');
const MAX_TEXT = 600, MAX_SIGN = 40, MAX_REPLIES = 3;

let db = { bottles: [] };
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { /* first run */ }
if (!db.bottles.length) {
  db.bottles = SEEDS.map((s) => ({
    id: crypto.randomUUID(), author: 'seed', text: s.text, sign: s.sign,
    at: Date.now() - s.days * 864e5, replies: [],
  }));
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFile(DATA_FILE, JSON.stringify(db), () => {});
  }, 200);
}
save();

const hits = new Map();
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 20;
}
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const pub = (b) => ({ id: b.id, text: b.text, sign: b.sign, at: b.at });

function body(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 10000) { reject(new Error('big')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { reject(e); } });
  });
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

async function api(req, res, url) {
  const ip = req.socket.remoteAddress;
  if (url.pathname === '/api/ping') return send(res, 200, { ok: true });

  if (url.pathname === '/api/drift' && req.method === 'GET') {
    const me = url.searchParams.get('me') || '';
    const n = Math.min(10, +url.searchParams.get('n') || 5);
    const pool = db.bottles
      .filter((b) => b.author !== me && b.replies.length < MAX_REPLIES && !b.replies.some((r) => r.author === me))
      .map((b) => ({ b, k: Math.random() + (b.replies.length === 0 ? 0.5 : 0) }))
      .sort((a, c) => c.k - a.k).slice(0, n).map((x) => pub(x.b));
    return send(res, 200, pool);
  }

  if (url.pathname === '/api/mine' && req.method === 'GET') {
    const me = url.searchParams.get('me') || '';
    return send(res, 200, db.bottles.filter((b) => b.author === me).sort((a, c) => c.at - a.at).map((b) => ({
      ...pub(b), replies: b.replies.map((r) => ({ id: r.id, text: r.text, sign: r.sign, at: r.at })),
    })));
  }

  if (url.pathname === '/api/bottles' && req.method === 'POST') {
    if (limited(ip)) return send(res, 429, { error: 'slow down' });
    const d = await body(req);
    const text = clean(d.text, MAX_TEXT);
    if (!text || !d.me) return send(res, 400, { error: 'empty' });
    const b = { id: crypto.randomUUID(), author: String(d.me).slice(0, 80), text, sign: clean(d.sign, MAX_SIGN), at: Date.now(), replies: [] };
    db.bottles.push(b); save();
    return send(res, 201, pub(b));
  }

  const m = url.pathname.match(/^\/api\/bottles\/([\w-]+)\/replies$/);
  if (m && req.method === 'POST') {
    if (limited(ip)) return send(res, 429, { error: 'slow down' });
    const d = await body(req);
    const b = db.bottles.find((x) => x.id === m[1]);
    const text = clean(d.text, MAX_TEXT);
    if (!b || !text || !d.me || b.author === d.me) return send(res, 400, { error: 'invalid' });
    if (b.replies.some((r) => r.author === d.me) || b.replies.length >= MAX_REPLIES) return send(res, 409, { error: 'already answered' });
    b.replies.push({ id: crypto.randomUUID(), author: String(d.me).slice(0, 80), text, sign: clean(d.sign, MAX_SIGN), at: Date.now() });
    save();
    return send(res, 201, { ok: true });
  }
  send(res, 404, { error: 'not found' });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p.endsWith(path.sep) || p === '.') p = path.join(p, 'index.html');
    const file = path.join(PUBLIC, p);
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  } catch (e) { send(res, 400, { error: 'bad request' }); }
}).listen(PORT, () => console.log(`Drift is floating at http://localhost:${PORT}`));
