(() => {
'use strict';

/* ───────────── helpers ───────────── */
const $ = (s) => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normAng = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, k) => (typeof a === 'number' ? a + (b - a) * k : a.map((v, i) => mix(v, b[i], k)));
const shade = (c, f) => c.map((v) => clamp(v * f, 0, 255));
const ago = (ts) => {
  const s = (Date.now() - ts) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
let me = ls.get('mib.me', null);
if (!me) { me = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2); ls.set('mib.me', me); }

/* ───────────── data layer (live server, or demo sea in the browser) ───────────── */
const post = (o) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
const jfetch = async (url, opt) => { const r = await fetch(url, opt); if (!r.ok) throw new Error(r.status); return r.json(); };

const localDrift = (n) => {
  const answered = new Set(ls.get('mib.answered', []));
  let pool = SEEDS.map((s, i) => ({ id: 'seed-' + i, text: s.text, sign: s.sign, at: Date.now() - s.days * 864e5 }));
  const fresh = pool.filter((b) => !answered.has(b.id));
  if (fresh.length >= 3) pool = fresh; else ls.set('mib.answered', []);
  return pool.sort(() => Math.random() - 0.5).slice(0, n);
};
const localSend = (text, sign) => {
  const all = ls.get('mib.local', []);
  const b = { id: 'l-' + Date.now(), text, sign, at: Date.now(), due: Date.now() + rnd(25e3, 70e3), replies: [] };
  all.push(b); ls.set('mib.local', all); return b;
};
const localMine = () => {
  const all = ls.get('mib.local', []);
  let dirty = false;
  for (const b of all) {
    if (!b.replies.length && Date.now() >= b.due) {
      const r = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      b.replies.push({ id: 'r-' + b.id, text: r.text, sign: r.sign, at: Date.now() }); dirty = true;
    }
  }
  if (dirty) ls.set('mib.local', all);
  return all.slice().sort((a, c) => c.at - a.at);
};

const API = {
  live: false,
  async init() { try { const j = await jfetch('api/ping', { cache: 'no-store' }); this.live = j.ok === true; } catch { this.live = false; } },
  async drift(n = 6) { return this.live ? jfetch(`api/drift?me=${encodeURIComponent(me)}&n=${n}`, { cache: 'no-store' }) : localDrift(n); },
  async send(text, sign) { return this.live ? jfetch('api/bottles', post({ me, text, sign })) : localSend(text, sign); },
  async reply(id, text, sign) {
    if (this.live) return jfetch(`api/bottles/${id}/replies`, post({ me, text, sign }));
    ls.set('mib.answered', [...new Set([...ls.get('mib.answered', []), id])]); return { ok: true };
  },
  async mine() { return this.live ? jfetch(`api/mine?me=${encodeURIComponent(me)}`, { cache: 'no-store' }) : localMine(); },
};

/* ───────────── sky themes ───────────── */
const rawThemes = {
  day:    { sky: ['#4fa9e6', '#86cdf0', '#c3e9f5', '#f4faee'], seaF: '#5cc4d2', seaN: '#0c607f', cel: '#fffbe0', glow: '#fff1a8', cloud: '#ffffff', celR: 32, celX: .72, celH: .62, stars: 0, clouds: .75, birds: 1, glint: .6, icon: '☀︎' },
  sunset: { sky: ['#262660', '#9a4580', '#ff8c62', '#ffd9a0'], seaF: '#d97484', seaN: '#16264f', cel: '#ffe3b0', glow: '#ff9f6b', cloud: '#ffa88a', celR: 48, celX: .64, celH: .035, stars: .2, clouds: .65, birds: .6, glint: .95, icon: '◐' },
  night:  { sky: ['#03060f', '#091431', '#162656', '#2b4180'], seaF: '#27487a', seaN: '#02081a', cel: '#f6f3df', glow: '#b3c7fa', cloud: '#6a7cae', celR: 24, celX: .26, celH: .68, stars: 1, clouds: .22, birds: 0, glint: .7, icon: '☾' },
};
const compile = (t) => ({
  sky: t.sky.map(hex), seaF: hex(t.seaF), seaN: hex(t.seaN), cel: hex(t.cel), glow: hex(t.glow), cloud: hex(t.cloud),
  celR: t.celR, celX: t.celX, celH: t.celH, stars: t.stars, clouds: t.clouds, birds: t.birds, glint: t.glint,
});
const themeNames = Object.keys(rawThemes);
const themes = Object.fromEntries(themeNames.map((k) => [k, compile(rawThemes[k])]));
let themeName = (() => { const h = new Date().getHours(); return h >= 7 && h < 17 ? 'day' : (h >= 17 && h < 20) || h === 6 ? 'sunset' : 'night'; })();
let cur = JSON.parse(JSON.stringify(themes[themeName]));

/* ───────────── canvas / ocean ───────────── */
const cv = $('#sea'), ctx = cv.getContext('2d');
let W = 0, H = 0, horizon = 0, T = 0;
const L = 8;
const lay = [];
const layerFill = [];
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  horizon = H * 0.42;
  lay.length = 0;
  for (let i = 0; i < L; i++) {
    const tt = i / (L - 1);
    lay.push({ tt, base: horizon + (H - horizon) * (0.015 + 0.80 * Math.pow(tt, 1.7)), amp: 1.2 + tt * 12, wl: 110 + tt * 300, sp: 0.5 + tt * 0.6, ph: i * 1.7 });
  }
}
function surf(i, x, t) {
  const l = lay[i], k = x / l.wl * 6.2832;
  return l.base + l.amp * (Math.sin(k - t * l.sp + l.ph) * 0.6 + Math.sin(k * 1.9 + t * l.sp * 1.3 + l.ph * 2) * 0.3 + Math.sin(k * 0.45 - t * l.sp * 0.5) * 0.4);
}
const bScale = (i) => 0.35 + 0.85 * (i / (L - 1));
addEventListener('resize', resize);
resize();

const stars = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(0.4, 1.4), tw: rnd(1, 3), ph: rnd(0, 6.28) }));
const clouds = Array.from({ length: 7 }, () => ({ x: Math.random(), y: rnd(0.08, 0.7), w: rnd(0.14, 0.3), sp: rnd(3, 9), a: rnd(0.5, 1) }));
const birds = Array.from({ length: 4 }, (_, i) => ({ x: Math.random(), y: rnd(0.2, 0.55), sp: rnd(18, 30), ph: i * 1.3, s: rnd(5, 9) }));

/* particles & ripples */
const ripples = [], parts = [];
function ripple(x, y, s = 1, delay = 0) { ripples.push({ x, y, r: 2, max: 70 * s + 20, a: 0.75, delay, s }); }
function splash(x, y, s) {
  ripple(x, y, s, 0); ripple(x, y, s, 0.18); ripple(x, y, s, 0.4);
  for (let i = 0; i < 26; i++) parts.push({ x: x + rnd(-8, 8) * s, y, vx: rnd(-90, 90) * s, vy: -rnd(120, 300) * (0.5 + s * 0.5), g: 640, life: rnd(0.6, 1.1), t: 0, r: rnd(1.2, 3.2) * (0.6 + s * 0.5), c: [255, 255, 255] });
}
function sparkle(x, y, n = 16, c = [255, 214, 140]) {
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(40, 170); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, g: 90, life: rnd(0.7, 1.4), t: 0, r: rnd(1.2, 3), c }); }
}

/* ───────────── bottle renderer ───────────── */
const GLASS = new Path2D();
GLASS.moveTo(-34, -13); GLASS.lineTo(8, -13);
GLASS.bezierCurveTo(20, -13, 20, -5.5, 30, -5.5); GLASS.lineTo(39, -5.5); GLASS.lineTo(39, 5.5); GLASS.lineTo(30, 5.5);
GLASS.bezierCurveTo(20, 5.5, 20, 13, 8, 13); GLASS.lineTo(-34, 13);
GLASS.quadraticCurveTo(-45, 13, -45, 2); GLASS.lineTo(-45, -2); GLASS.quadraticCurveTo(-45, -13, -34, -13); GLASS.closePath();

function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function drawBottle(c, o) {
  c.save();
  c.translate(o.x, o.y); c.rotate(o.angle); c.scale(o.s, o.s);
  c.globalAlpha = o.alpha ?? 1;
  const po = o.paper || 0;
  // rolled letter
  c.save(); c.translate(po, 0);
  const pg = c.createLinearGradient(0, -5, 0, 5);
  pg.addColorStop(0, '#fff4d6'); pg.addColorStop(0.5, '#f1dba8'); pg.addColorStop(1, '#d4b074');
  c.fillStyle = pg; rrect(c, -32, -4.8, 44, 9.6, 4.5); c.fill();
  c.fillStyle = '#bd9a5c'; c.beginPath(); c.ellipse(-32, 0, 2.4, 4.8, 0, 0, 6.3); c.fill();
  c.beginPath(); c.ellipse(12, 0, 2.4, 4.8, 0, 0, 6.3); c.fill();
  c.fillStyle = '#b8323f'; c.fillRect(-10, -5.2, 3.6, 10.4);
  c.restore();
  // glass body
  if (o.glow) { c.shadowColor = o.glowColor || 'rgba(255,208,130,0.95)'; c.shadowBlur = 26 * o.glow; }
  const gg = c.createLinearGradient(0, -13, 0, 13);
  gg.addColorStop(0, 'rgba(225,248,250,.42)'); gg.addColorStop(0.5, 'rgba(150,208,216,.16)'); gg.addColorStop(1, 'rgba(200,236,240,.34)');
  c.fillStyle = gg; c.fill(GLASS);
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.62)'; c.stroke(GLASS);
  c.shadowBlur = 0;
  // lip + highlight
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.2; rrect(c, 36, -6.5, 5, 13, 1.5); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-34, -8.5); c.lineTo(6, -8.5); c.stroke();
  c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(-34, 9); c.lineTo(-6, 9); c.stroke();
  // cork
  const ck = o.cork || { dx: 0, dy: 0, rot: 0, a: 1 };
  if (ck.a > 0.01) {
    c.save(); c.globalAlpha *= ck.a; c.translate(36 + ck.dx, ck.dy); c.rotate(ck.rot);
    const cg = c.createLinearGradient(0, -4.8, 0, 4.8);
    cg.addColorStop(0, '#d9a96a'); cg.addColorStop(1, '#9a6a34');
    c.fillStyle = cg; rrect(c, 0, -4.6, 10, 9.2, 2); c.fill();
    c.fillStyle = 'rgba(80,45,15,.4)'; c.fillRect(2, -2.5, 1.4, 1.4); c.fillRect(6, 1, 1.4, 1.4); c.fillRect(4.5, -0.5, 1.2, 1.2);
    c.restore();
  }
  c.restore();
}

/* ───────────── world state ───────────── */
const bottles = [];
const mouse = { x: -999, y: -999, type: 'mouse' };
let hovered = null, busy = false;

function bottleAngle(b, i) {
  const sl = (surf(i, b.x + 8, T) - surf(i, b.x - 8, T)) / 16;
  return b.tilt + Math.atan(sl) * 0.9 + Math.sin(T * 1.2 + b.ph) * 0.05;
}
function addStranger(d, initial) {
  const layer = [3, 4, 4, 5, 5, 6][Math.floor(Math.random() * 6)];
  bottles.push({ kind: 'stranger', data: d, id: d.id, layer, x: initial ? (0.1 + 0.8 * ((bottles.filter((q) => q.kind === 'stranger').length * 0.382 + Math.random() * 0.1) % 1)) * W : -120, vx: rnd(9, 20) * (0.6 + layer / 8), ph: rnd(0, 6.28), tilt: rnd(-0.55, -0.12), alpha: 0, age: 0, sx: 0, sy: 0, ss: 1, sa: 0, ripT: rnd(0, 2) });
}
function spawnReplyBottle(book, reply) {
  if (bottles.some((b) => b.kind === 'reply' && b.replyId === reply.id)) return;
  bottles.push({ kind: 'reply', book, replyId: reply.id, layer: 5, x: rnd(0.15, 0.4) * W, vx: 22, ph: rnd(0, 6.28), tilt: -0.3, alpha: 0, age: 0, sx: 0, sy: 0, ss: 1, sa: 0, ripT: 0 });
}
async function fillSea(initial) {
  let strangers = bottles.filter((b) => b.kind === 'stranger' && !b.picked);
  if (strangers.length >= 5) return;
  try {
    const list = await API.drift(8);
    for (const d of list) {
      if (strangers.length >= 5) break;
      if (bottles.some((b) => b.id === d.id)) continue;
      addStranger(d, initial); strangers.push(d);
    }
  } catch { /* sea is quiet */ }
}

/* ───────────── hero bottle (sealing / opening animation) ───────────── */
const hero = { on: false, x: 0, y: 0, angle: -Math.PI / 2, s: 2.4, alpha: 1, paper: 0, cork: { dx: 0, dy: 0, rot: 0, a: 1 }, glow: 0, dim: 0, seq: null };
function play(steps) {
  return new Promise((res) => {
    hero.on = true;
    steps[0].init && steps[0].init();
    hero.seq = { steps, i: 0, t: 0, started: true, res };
  });
}
function stepHero(dt) {
  const q = hero.seq; if (!q) return;
  const st = q.steps[q.i];
  if (!q.started) { q.started = true; st.init && st.init(); }
  q.t += dt;
  const u = clamp(q.t / st.d, 0, 1);
  st.run(u);
  if (u >= 1) {
    q.i++; q.t = 0; q.started = false;
    if (q.i >= q.steps.length) { hero.seq = null; q.res(); }
  }
}
const neckPos = () => ({ x: hero.x + Math.cos(hero.angle) * 46 * hero.s, y: hero.y + Math.sin(hero.angle) * 46 * hero.s });
const CX = () => W / 2, CY = () => H * 0.46;

function throwBottle() {
  const LAY = 5, sl = bScale(LAY), tx = rnd(W * 0.3, W * 0.7), cx = CX(), cy = CY();
  return play([
    { d: 0.5, init() { Object.assign(hero, { x: cx, y: cy, angle: -Math.PI / 2, s: 2.4, alpha: 0, paper: 100, glow: 0, dim: 0, cork: { dx: 40, dy: 0, rot: 0, a: 0 } }); }, run(u) { hero.alpha = u; hero.dim = u * 0.4; } },
    { d: 1.0, run(u) { hero.paper = lerp(100, 0, ease(u)); } },
    { d: 0.5, run(u) { const e = easeOut(u); hero.cork = { dx: lerp(40, 0, e), dy: 0, rot: (1 - e) * 0.6, a: Math.min(1, u * 4) }; } },
    { d: 0.6, init() { const n = neckPos(); sparkle(n.x, n.y, 22); }, run(u) { hero.glow = Math.sin(u * Math.PI) * 1.3; } },
    {
      d: 1.75, run(u) {
        const ty = surf(LAY, tx, T) - 3 * sl;
        hero.x = lerp(cx, tx, u);
        hero.y = lerp(cy, ty, u * u * 0.6 + u * 0.4) - Math.sin(u * Math.PI) * H * 0.3;
        hero.angle = lerp(-Math.PI / 2, -0.25 + 4 * Math.PI, ease(u));
        hero.s = lerp(2.4, sl, ease(u)); hero.glow = 0.7 * (1 - u); hero.dim = 0.4 * (1 - u);
      },
    },
  ]).then(() => {
    hero.on = false;
    const y = surf(LAY, tx, T);
    splash(tx, y, sl);
    bottles.push({ kind: 'mine', layer: LAY, x: tx, vx: rnd(10, 15), ph: rnd(0, 6.28), tilt: -0.25, alpha: 1, age: 0, sx: tx, sy: y, ss: sl, sa: -0.25, ripT: 0 });
  });
}

async function pickUp(b) {
  const sx = b.sx, sy = b.sy, ss = b.ss, sa = normAng(b.sa), cx = CX(), cy = CY();
  b.picked = true;
  await play([
    { d: 0.95, init() { Object.assign(hero, { x: sx, y: sy, angle: sa, s: ss, alpha: 1, paper: 0, glow: 0, dim: 0, cork: { dx: 0, dy: 0, rot: 0, a: 1 } }); },
      run(u) { const e = ease(u); hero.x = lerp(sx, cx, e); hero.y = lerp(sy, cy, e) - Math.sin(u * Math.PI) * 50; hero.angle = lerp(sa, -Math.PI / 2, e); hero.s = lerp(ss, 2.4, e); hero.glow = e * 0.8; hero.dim = e * 0.4; } },
    { d: 0.2, run() {} },
    { d: 0.75, init() { const n = neckPos(); sparkle(n.x, n.y, 24); }, run(u) { const e = easeOut(u); hero.cork = { dx: e * 130, dy: -Math.sin(u * Math.PI) * 60 - e * 40, rot: e * 7, a: 1 - u * u }; hero.glow = 0.8 + 0.5 * Math.sin(u * Math.PI); } },
    { d: 1.0, run(u) { hero.paper = ease(u) * 100; hero.cork.a = 0; } },
    { d: 0.4, run(u) { hero.alpha = 1 - u; hero.paper = 100 + u * 30; hero.dim = 0.4; } },
  ]);
  hero.on = false;
  const i = bottles.indexOf(b); if (i >= 0) bottles.splice(i, 1);
}

/* ───────────── update + render ───────────── */
function update(dt) {
  const k = Math.min(1, dt * 1.4), tgt = themes[themeName];
  for (const key of Object.keys(cur)) cur[key] = mix(cur[key], tgt[key], k);

  for (let n = bottles.length - 1; n >= 0; n--) {
    const b = bottles[n];
    b.age += dt; b.x += b.vx * dt;
    let a = Math.min(1, b.age / 1.5);
    if (b.kind === 'mine') { a = b.age < 22 ? 1 : 1 - (b.age - 22) / 16; if (a <= 0) { bottles.splice(n, 1); continue; } }
    else if (b.x > W + 130) b.x = -130;
    b.alpha = b.picked ? 0 : a;
    b.ripT -= dt;
    if (b.ripT <= 0 && b.alpha > 0.5) { ripple(b.sx, b.sy + 6 * b.ss, b.ss * 0.5); b.ripT = rnd(2.5, 4.5); }
  }
  for (let n = ripples.length - 1; n >= 0; n--) {
    const r = ripples[n];
    if (r.delay > 0) { r.delay -= dt; continue; }
    r.r += (r.max - r.r) * dt * 1.6 + dt * 12; r.a -= dt * 0.55;
    if (r.a <= 0) ripples.splice(n, 1);
  }
  for (let n = parts.length - 1; n >= 0; n--) {
    const p = parts[n]; p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.t > p.life) parts.splice(n, 1);
  }
  stepHero(dt);
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  cur.sky.forEach((c, i) => g.addColorStop(i / 3, rgba(c)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);

  if (cur.stars > 0.02) {
    ctx.fillStyle = '#fff';
    for (const s of stars) {
      const y = s.y * horizon * 0.95;
      ctx.globalAlpha = cur.stars * (0.45 + 0.55 * Math.sin(T * s.tw + s.ph)) * (1 - y / horizon * 0.7);
      ctx.beginPath(); ctx.arc(s.x * W, y, s.r, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // sun / moon
  const cx = W * cur.celX, cy = horizon - cur.celH * horizon * 0.95, R = cur.celR * Math.min(1, W / 700 + 0.45);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, horizon + 1); ctx.clip();
  const glow = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 7);
  glow.addColorStop(0, rgba(cur.glow, 0.6)); glow.addColorStop(0.35, rgba(cur.glow, 0.18)); glow.addColorStop(1, rgba(cur.glow, 0));
  ctx.fillStyle = glow; ctx.fillRect(cx - R * 7, cy - R * 7, R * 14, R * 14);
  const disc = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  disc.addColorStop(0, rgba(cur.cel, 1)); disc.addColorStop(1, rgba(mix(cur.cel, cur.glow, 0.5), 1));
  ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.3); ctx.fill();
  if (cur.stars > 0.6) {
    ctx.fillStyle = 'rgba(120,130,160,.16)';
    [[-.3, -.2, .22], [.25, .1, .3], [-.1, .35, .16]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(cx + dx * R, cy + dy * R, rr * R, 0, 6.3); ctx.fill(); });
  }
  ctx.restore();

  // clouds
  for (const c of clouds) {
    const w = c.w * W, x = ((c.x * W + T * c.sp) % (W + w * 2)) - w, y = c.y * horizon * 0.8;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.32);
    for (let j = 0; j < 5; j++) {
      const ox = (j - 2) * w * 0.28, r = w * (0.34 - Math.abs(j - 2) * 0.06);
      const cg = ctx.createRadialGradient(ox, 0, 0, ox, 0, r);
      cg.addColorStop(0, rgba(cur.cloud, 0.55 * c.a * cur.clouds)); cg.addColorStop(1, rgba(cur.cloud, 0));
      ctx.fillStyle = cg; ctx.fillRect(ox - r, -r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // gulls
  if (cur.birds > 0.05) {
    ctx.strokeStyle = `rgba(28,36,58,${0.55 * cur.birds})`; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (const b of birds) {
      const x = ((b.x * W + T * b.sp) % (W + 80)) - 40, y = b.y * horizon + Math.sin(T * 0.6 + b.ph) * 8, f = Math.sin(T * 5 + b.ph) * 0.8;
      ctx.beginPath(); ctx.moveTo(x - b.s, y - b.s * f * 0.7); ctx.quadraticCurveTo(x - b.s * 0.3, y - b.s * 0.25, x, y);
      ctx.quadraticCurveTo(x + b.s * 0.3, y - b.s * 0.25, x + b.s, y - b.s * f * 0.7); ctx.stroke();
    }
  }
  // horizon haze
  const hz = ctx.createLinearGradient(0, horizon - 70, 0, horizon + 4);
  hz.addColorStop(0, rgba(cur.sky[3], 0)); hz.addColorStop(1, rgba(cur.sky[3], 0.65));
  ctx.fillStyle = hz; ctx.fillRect(0, horizon - 70, W, 74);
}

function drawSeaBottle(b, i) {
  if (b.alpha <= 0.01) return;
  const s = bScale(i) * (b === hovered ? 1.1 : 1);
  const y0 = surf(i, b.x, T);
  const ang = bottleAngle(b, i);
  const y = y0 - 3 * s + Math.sin(T * 1.7 + b.ph) * 1.5 * s;
  b.sx = b.x; b.sy = y; b.ss = s; b.sa = ang;
  // contact shadow on the water
  ctx.fillStyle = `rgba(255,255,255,${0.12 * b.alpha})`;
  ctx.beginPath(); ctx.ellipse(b.x - 4 * s, y0 + 3 * s, 46 * s, 5 * s, 0, 0, 6.3); ctx.fill();
  let glow = 0, gc;
  if (b.kind === 'reply') { glow = 0.8 + 0.4 * Math.sin(T * 3 + b.ph); gc = 'rgba(255,196,90,1)'; }
  else if (b === hovered) { glow = 0.9; }
  else if (b.kind === 'stranger') { glow = 0.12 + 0.1 * Math.sin(T * 1.5 + b.ph); }
  drawBottle(ctx, { x: b.x, y, angle: ang, s, alpha: b.alpha, glow, glowColor: gc });
  // water laps over the lower half
  const x0 = b.x - 62 * s, x1 = b.x + 62 * s;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x0, surf(i, x0, T));
  for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, surf(i, x, T));
  ctx.lineTo(x1, y0 + 36 * s); ctx.lineTo(x0, y0 + 36 * s); ctx.closePath(); ctx.clip();
  ctx.globalAlpha = 0.72; ctx.fillStyle = layerFill[i]; ctx.fillRect(x0, y0 - 6, x1 - x0, 50 * s);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSea() {
  const col = (i) => {
    const tt = lay[i].tt;
    return mix(mix(cur.seaF, cur.seaN, Math.pow(tt, 0.9)), cur.sky[3], (1 - tt) * 0.45);
  };
  ctx.fillStyle = rgba(col(0)); ctx.fillRect(0, horizon, W, H - horizon);
  const gx = W * cur.celX;
  for (let i = 0; i < L; i++) {
    const l = lay[i], c = col(i), step = i < 3 ? 12 : 8;
    const g = ctx.createLinearGradient(0, l.base - l.amp, 0, Math.min(H, l.base + (H - horizon) * 0.38));
    g.addColorStop(0, rgba(shade(c, 1.14))); g.addColorStop(1, rgba(shade(c, 0.82)));
    layerFill[i] = g;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-10, H + 2);
    for (let x = -10; x <= W + 10; x += step) ctx.lineTo(x, surf(i, x, T));
    ctx.lineTo(W + 10, H + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + l.tt * 0.2})`; ctx.lineWidth = 1.1; ctx.stroke();

    // light on the water (sun/moon path + foam)
    const gap = (lay[i + 1] ? lay[i + 1].base : H) - l.base;
    ctx.globalCompositeOperation = 'lighter';
    const spread = 40 + l.tt * 150;
    for (let x = gx - spread; x <= gx + spread; x += 9) {
      const h = Math.abs(Math.sin(x * 12.9898 + i * 78.233) * 43758.5453) % 1;
      const fall = 1 - Math.abs(x - gx) / spread;
      const a = cur.glint * fall * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(T * 2.4 + x * 0.31 + i))) * 0.55;
      if (a < 0.03) continue;
      ctx.fillStyle = rgba(cur.glow, a);
      const w = 4 + h * (8 + l.tt * 14);
      ctx.fillRect(x - w / 2, surf(i, x, T) + 2 + h * Math.min(gap, 70) * 0.7, w, 1.4 + l.tt);
    }
    if (i >= 3) {
      ctx.fillStyle = `rgba(255,255,255,${0.22 + l.tt * 0.2})`;
      for (let x = (i * 37) % 31; x < W; x += 31) {
        const y = surf(i, x, T);
        if (y < surf(i, x - 9, T) && y < surf(i, x + 9, T)) ctx.fillRect(x - 6 - l.tt * 8, y + 0.5, 12 + l.tt * 16, 1.6);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const b of bottles) if (b.layer === i) drawSeaBottle(b, i);
    // ripples that live on this layer's plane (drawn once, after layer 5)
    if (i === 5) drawRipples();
  }
}
function drawRipples() {
  ctx.lineWidth = 1.3;
  for (const r of ripples) {
    if (r.delay > 0) continue;
    ctx.strokeStyle = `rgba(255,255,255,${clamp(r.a, 0, 1) * 0.7})`;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.24, 0, 0, 6.3); ctx.stroke();
  }
}
function drawParts() {
  for (const p of parts) {
    ctx.fillStyle = rgba(p.c, 1 - p.t / p.life);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
  }
}

function render() {
  drawSky(); drawSea();
  if (hero.on) {
    if (hero.dim > 0) { ctx.fillStyle = `rgba(2,8,20,${hero.dim})`; ctx.fillRect(0, 0, W, H); }
    if (hero.glow > 0.05) { // warm halo
      const g = ctx.createRadialGradient(hero.x, hero.y, 10, hero.x, hero.y, 220 * hero.s / 2.4);
      g.addColorStop(0, `rgba(255,208,130,${0.35 * Math.min(1, hero.glow) * hero.alpha})`); g.addColorStop(1, 'rgba(255,208,130,0)');
      ctx.fillStyle = g; ctx.fillRect(hero.x - 260, hero.y - 260, 520, 520);
    }
    drawBottle(ctx, { x: hero.x, y: hero.y, angle: hero.angle, s: hero.s, alpha: hero.alpha, paper: hero.paper, cork: hero.cork, glow: hero.glow });
  }
  drawParts();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  update(dt); render();
  requestAnimationFrame(frame);
}

/* ───────────── pointer interaction ───────────── */
const tip = $('#tip');
function hit(x, y) {
  let best = null;
  for (const b of bottles) {
    if (b.picked || b.alpha < 0.5) continue;
    const r = 50 * b.ss + 10, dx = x - b.sx, dy = y - b.sy;
    if (dx * dx + dy * dy < r * r && (!best || b.layer >= best.layer)) best = b;
  }
  return best;
}
const tipText = (b) => b.kind === 'mine' ? 'Your bottle, drifting away…' : b.kind === 'reply' ? 'A bottle came back for you ✦' : (b.data.sign ? `A letter from ${b.data.sign}` : 'A letter from a stranger');
cv.addEventListener('pointermove', (e) => {
  if (busy || e.pointerType !== 'mouse') return;
  const b = hit(e.clientX, e.clientY);
  hovered = b; cv.style.cursor = b && b.kind !== 'mine' ? 'pointer' : 'default';
  if (b) { tip.textContent = tipText(b); tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.classList.add('show'); }
  else tip.classList.remove('show');
});
cv.addEventListener('pointerleave', () => { hovered = null; tip.classList.remove('show'); });
cv.addEventListener('pointerdown', (e) => {
  if (busy) return;
  const b = hit(e.clientX, e.clientY);
  if (!b) { ripple(e.clientX, e.clientY, 0.6); return; }
  if (b.kind === 'stranger') openFound(b);
  else if (b.kind === 'reply') openReplyBottle(b);
});

/* ───────────── UI: overlay, cards, drawer ───────────── */
const ov = $('#overlay'), drawer = $('#drawer'), toastEl = $('#toast');
let toastT;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 4200); }
function setBusy(v) { busy = v; document.body.classList.toggle('busy', v); if (v) { hovered = null; tip.classList.remove('show'); } }
function showCard(card) { ov.replaceChildren(card); requestAnimationFrame(() => ov.classList.add('show')); }
const hideOverlay = () => ov.classList.remove('show');
function card(html, cls = '') { const d = document.createElement('div'); d.className = 'card ' + cls; d.innerHTML = html; return d; }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function bindCounter(ta, counter, btn) {
  const upd = () => { counter.textContent = `${ta.value.length}/${ta.maxLength}`; btn.disabled = ta.value.trim().length < 2; };
  ta.addEventListener('input', upd); upd();
}

/* — write a letter — */
function openWrite() {
  if (busy) return;
  closeDrawer();
  const c = card(`
    <h2>Write to a stranger</h2>
    <p class="sub">Say anything. Someone, somewhere, will find it.</p>
    <textarea maxlength="600" placeholder="Dear stranger,&#10;&#10;"></textarea>
    <div class="row"><input maxlength="40" placeholder="Signed — a name, a city, or nothing at all" aria-label="Signature"><span class="count"></span></div>
    <div class="actions"><button class="pbtn" data-x="cancel">Not now</button><button class="pbtn wax" data-x="seal">Seal in a bottle</button></div>`, 'unfurl');
  const ta = c.querySelector('textarea'), sign = c.querySelector('input'), seal = c.querySelector('[data-x=seal]');
  bindCounter(ta, c.querySelector('.count'), seal);
  c.querySelector('[data-x=cancel]').onclick = hideOverlay;
  seal.onclick = () => sealAndThrow(c, seal, () => API.send(ta.value.trim(), sign.value.trim()), 'Your bottle is drifting out to sea ✦ — check back for a reply.');
  showCard(c); setTimeout(() => ta.focus(), 900);
}

async function sealAndThrow(c, btn, send, doneMsg) {
  btn.disabled = true; btn.textContent = 'Sealing…';
  try { await send(); } catch { toast('The sea is rough — please try again.'); btn.disabled = false; btn.textContent = 'Seal in a bottle'; return; }
  c.classList.remove('unfurl'); c.classList.add('rolling');
  setBusy(true); closeDrawer();
  await sleep(500); hideOverlay(); await sleep(250);
  await throwBottle();
  await sleep(500);
  setBusy(false); toast(doneMsg);
  refreshMine();
}

/* — open a stranger's bottle — */
async function openFound(b) {
  if (busy) return;
  setBusy(true); closeDrawer();
  await pickUp(b);
  showRead(b.data);
  fillSea(false);
}
function showRead(d) {
  const c = card(`
    <div class="meta"></div>
    <div class="letter"></div>
    <div class="signoff"></div>
    <hr>
    <p class="replylabel">Write back to them</p>
    <textarea maxlength="600" style="min-height:144px" placeholder="Hello, stranger…"></textarea>
    <div class="row"><input maxlength="40" placeholder="Signed — a name, a city, or nothing at all" aria-label="Signature"><span class="count"></span></div>
    <div class="actions"><button class="pbtn" data-x="drift">Let it drift on</button><button class="pbtn wax" data-x="send">Send reply in a bottle</button></div>`, 'unfurl');
  c.querySelector('.meta').textContent = `A bottle found you · written ${ago(d.at)}`;
  c.querySelector('.letter').textContent = d.text;
  c.querySelector('.signoff').textContent = d.sign ? '— ' + d.sign : '— a stranger';
  const ta = c.querySelector('textarea'), sign = c.querySelector('input'), send = c.querySelector('[data-x=send]');
  bindCounter(ta, c.querySelector('.count'), send);
  c.querySelector('[data-x=drift]').onclick = () => { hideOverlay(); setBusy(false); };
  send.onclick = () => sealAndThrow(c, send, () => API.reply(d.id, ta.value.trim(), sign.value.trim()), 'Your reply is drifting home to them ✦');
  showCard(c);
  setBusy(false); // overlay itself blocks the sea
}

/* — a reply bottle came back — */
async function openReplyBottle(b) {
  if (busy) return;
  setBusy(true); closeDrawer();
  await pickUp(b);
  showThread(b.book, b.replyId);
  setBusy(false);
}
function showThread(book, focusReplyId) {
  const c = card(`<h2></h2><p class="sub"></p><div class="quote"></div><div class="notes"></div><div class="actions"><button class="pbtn" data-x="close">Tuck it away</button><button class="pbtn wax" data-x="new">Write another letter</button></div>`, 'unfurl');
  const n = book.replies.length;
  c.querySelector('h2').textContent = n ? (n > 1 ? 'Strangers wrote back' : 'A stranger wrote back') : 'Still drifting…';
  c.querySelector('.sub').textContent = n ? 'Your bottle was found.' : 'Somewhere out there, your bottle is still on its way to someone.';
  c.querySelector('.quote').textContent = 'You wrote: ' + book.text;
  const notes = c.querySelector('.notes');
  for (const r of book.replies) {
    const note = el('div', 'note' + (r.id === focusReplyId ? ' new' : ''));
    note.append(el('div', 'letter', r.text), el('div', 'by', `— ${r.sign || 'a stranger'}, ${ago(r.at)}`));
    notes.append(note);
  }
  c.querySelector('[data-x=close]').onclick = () => { hideOverlay(); };
  c.querySelector('[data-x=new]').onclick = () => { hideOverlay(); setTimeout(openWrite, 500); };
  markRead(book);
  showCard(c);
}

/* — my bottles — */
let mineCache = [];
const readSet = new Set(ls.get('mib.read', []));
const annSet = new Set(ls.get('mib.ann', []));
function markRead(book) {
  book.replies.forEach((r) => readSet.add(r.id));
  ls.set('mib.read', [...readSet]);
  for (let i = bottles.length - 1; i >= 0; i--) if (bottles[i].kind === 'reply' && bottles[i].book.id === book.id) bottles.splice(i, 1);
  updateBadge(); renderList();
}
function updateBadge() {
  const n = mineCache.reduce((a, b) => a + b.replies.filter((r) => !readSet.has(r.id)).length, 0);
  const bd = $('#badge'); bd.hidden = n === 0; bd.textContent = n;
}
function renderList() {
  const list = $('#list'); list.replaceChildren();
  if (!mineCache.length) { list.append(el('p', 'empty', 'You haven’t thrown any bottles yet. Write a letter — it only takes a minute — and let the sea carry it somewhere.')); return; }
  for (const b of mineCache) {
    const unread = b.replies.filter((r) => !readSet.has(r.id)).length;
    const it = el('button', 'item');
    it.append(el('span', 'st' + (unread ? ' new' : ''), unread ? `${unread} new repl${unread > 1 ? 'ies' : 'y'}` : b.replies.length ? `${b.replies.length} repl${b.replies.length > 1 ? 'ies' : 'y'}` : 'drifting…'));
    it.append(el('p', '', b.text), el('small', '', `thrown ${ago(b.at)}`));
    it.onclick = () => { if (busy) return; closeDrawer(); showThread(b, null); };
    list.append(it);
  }
}
async function refreshMine() {
  try { mineCache = await API.mine(); } catch { return; }
  for (const b of mineCache) for (const r of b.replies) {
    if (readSet.has(r.id)) continue;
    if (!annSet.has(r.id)) { annSet.add(r.id); ls.set('mib.ann', [...annSet]); toast('A bottle is drifting back to you ✦'); }
    spawnReplyBottle(b, r);
  }
  updateBadge(); if (drawer.classList.contains('show')) renderList();
}
function openDrawer() { if (busy) return; renderList(); drawer.classList.add('show'); }
function closeDrawer() { drawer.classList.remove('show'); }

/* ───────────── toolbar ───────────── */
$('#btnWrite').onclick = openWrite;
$('#btnMine').onclick = () => (drawer.classList.contains('show') ? closeDrawer() : openDrawer());
$('#btnCloseDrawer').onclick = closeDrawer;
$('#btnFind').onclick = () => {
  if (busy) return;
  const c = bottles.filter((b) => b.kind !== 'mine' && b.alpha > 0.7 && b.sx > 40 && b.sx < W - 40);
  const pick = c.find((b) => b.kind === 'reply') || c[Math.floor(Math.random() * c.length)];
  if (!pick) return toast('The sea is quiet… wait a moment for a bottle to drift by.');
  pick.kind === 'reply' ? openReplyBottle(pick) : openFound(pick);
};
ov.addEventListener('pointerdown', (e) => { if (e.target === ov && !busy) hideOverlay(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !busy) { hideOverlay(); closeDrawer(); } });

const btnTheme = $('#btnTheme');
btnTheme.textContent = rawThemes[themeName].icon;
btnTheme.onclick = () => { themeName = themeNames[(themeNames.indexOf(themeName) + 1) % themeNames.length]; btnTheme.textContent = rawThemes[themeName].icon; };

/* sea sound: filtered brown noise swelling like waves */
let audio = null;
$('#btnSound').onclick = (e) => {
  const btn = e.currentTarget;
  try {
    if (!audio) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let lastV = 0; for (let i = 0; i < len; i++) { lastV = (lastV + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = lastV * 3.5; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const gain = ac.createGain(); gain.gain.value = 0.16;
      const l1 = ac.createOscillator(), g1 = ac.createGain(); l1.frequency.value = 0.1; g1.gain.value = 0.1; l1.connect(g1); g1.connect(gain.gain);
      const l2 = ac.createOscillator(), g2 = ac.createGain(); l2.frequency.value = 0.07; g2.gain.value = 260; l2.connect(g2); g2.connect(lp.frequency);
      src.connect(lp); lp.connect(gain); gain.connect(ac.destination);
      src.start(); l1.start(); l2.start();
      audio = { ac, on: true };
    } else if (audio.on) { audio.ac.suspend(); audio.on = false; } else { audio.ac.resume(); audio.on = true; }
    btn.classList.toggle('on', audio.on);
  } catch { toast('Sound isn’t available here.'); }
};

/* ───────────── boot ───────────── */
(async function boot() {
  await API.init();
  const st = $('#status');
  st.classList.toggle('demo', !API.live);
  st.querySelector('span').textContent = API.live ? 'Live sea' : 'Demo sea';
  st.title = API.live ? 'Connected — real strangers will find your bottles.' : 'Running without a server: the bottles are pre-written and replies are simulated. Run `npm start` for real strangers.';
  await fillSea(true);
  await refreshMine();
  requestAnimationFrame(frame);
  setInterval(() => fillSea(false), 15000);
  setInterval(refreshMine, API.live ? 20000 : 5000);
})();
})();
