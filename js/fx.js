// ===== Shared visual language (paper / ink / accents), particles, judgement display, scoring =====
window.FX = (function () {
  const PAL = { paper: '#ECE8DF', paper2: '#E2DDD1', card: '#F5F2EB', ink: '#121212', ink2: '#3b3936', mute: '#8B857A', line: 'rgba(18,18,18,0.14)' };
  const FD = '"Unbounded", "Arial Black", "Microsoft YaHei", sans-serif';
  const FM = '"JetBrains Mono", Consolas, monospace';
  const FU = '"Space Grotesk", "Microsoft YaHei", sans-serif';
  const ease = {
    out: (k) => 1 - Math.pow(1 - k, 3),
    outBack: (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- particles: flat geometric confetti ----------
  class Particles {
    constructor() { this.p = []; this.rings = []; this.rayList = []; }
    burst(x, y, colors, n, speed, life, size, opts = {}) {
      for (let i = 0; i < n; i++) {
        const a = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread || 1) : Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.85);
        const col = Array.isArray(colors) ? colors[i % colors.length] : colors;
        this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.5 + Math.random() * 0.9), col, g: opts.gravity || 0, drag: opts.drag || 0.9, shape: opts.shape || (['sq', 'tri', 'dot'][i % 3]), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, stroke: opts.stroke && Math.random() < 0.5 });
      }
      if (this.p.length > 900) this.p.splice(0, this.p.length - 900);
    }
    ring(x, y, col, r0, r1, life, width, opts = {}) { this.rings.push({ x, y, col, r0, r1, life, max: life, width: width || 3, sq: opts.square, rot: opts.rot || 0, fill: opts.fill }); }
    rays(x, y, col, n, r0, r1, life, width, rot) { this.rayList.push({ x, y, col, n, r0, r1, life, max: life, width: width || 3, rot: rot || 0 }); }
    update(dt) {
      for (const p of this.p) { p.life -= dt; const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
      this.p = this.p.filter((p) => p.life > 0);
      for (const r of this.rings) r.life -= dt; this.rings = this.rings.filter((r) => r.life > 0);
      for (const r of this.rayList) r.life -= dt; this.rayList = this.rayList.filter((r) => r.life > 0);
    }
    draw(g) {
      g.save();
      for (const r of this.rings) {
        const k = 1 - r.life / r.max, e = ease.out(k), rad = r.r0 + (r.r1 - r.r0) * e;
        g.globalAlpha = 1 - k;
        if (r.fill) { g.fillStyle = r.col; g.beginPath(); if (r.sq) { g.save(); g.translate(r.x, r.y); g.rotate(r.rot + k * 0.8); g.rect(-rad, -rad, rad * 2, rad * 2); g.restore(); } else g.arc(r.x, r.y, rad, 0, Math.PI * 2); g.fill(); continue; }
        g.strokeStyle = r.col; g.lineWidth = Math.max(0.5, r.width * (1 - k));
        g.beginPath();
        if (r.sq) { g.save(); g.translate(r.x, r.y); g.rotate(r.rot + k * 0.8); g.strokeRect(-rad, -rad, rad * 2, rad * 2); g.restore(); }
        else { g.arc(r.x, r.y, rad, 0, Math.PI * 2); g.stroke(); }
      }
      for (const r of this.rayList) {
        const k = 1 - r.life / r.max, e = ease.out(k);
        g.globalAlpha = 1; g.strokeStyle = r.col; g.lineWidth = r.width * (1 - k * 0.6); g.lineCap = 'butt';
        const a0 = r.r0 + (r.r1 - r.r0) * e, a1 = r.r0 + (r.r1 - r.r0) * Math.min(1, e * 1.6 + 0.0) ;
        const inner = r.r0 + (r.r1 - r.r0) * ease.out(clamp(k * 1.4 - 0.25, 0, 1));
        g.beginPath();
        for (let i = 0; i < r.n; i++) { const a = r.rot + i / r.n * Math.PI * 2; g.moveTo(r.x + Math.cos(a) * inner, r.y + Math.sin(a) * inner); g.lineTo(r.x + Math.cos(a) * Math.max(inner, a1), r.y + Math.sin(a) * Math.max(inner, a1)); }
        g.stroke();
      }
      for (const p of this.p) {
        g.globalAlpha = clamp(p.life / p.max * 2, 0, 1);
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        const s = p.size;
        g.fillStyle = p.col; g.strokeStyle = p.col; g.lineWidth = 2;
        g.beginPath();
        if (p.shape === 'sq') g.rect(-s / 2, -s / 2, s, s);
        else if (p.shape === 'tri') { g.moveTo(0, -s * 0.7); g.lineTo(s * 0.6, s * 0.45); g.lineTo(-s * 0.6, s * 0.45); g.closePath(); }
        else if (p.shape === 'shard') { g.moveTo(0, -s * 1.3); g.lineTo(s * 0.5, s * 0.2); g.lineTo(-s * 0.3, s * 0.9); g.closePath(); }
        else if (p.shape === 'line') { g.rect(-s, -1, s * 2, 2); }
        else g.arc(0, 0, s / 2, 0, Math.PI * 2);
        p.stroke ? g.stroke() : g.fill();
        g.restore();
      }
      g.restore();
    }
  }

  // ---------- judgement display: kinetic type with early/late tag ----------
  class Judge {
    constructor() { this.items = []; }
    show(grade, dt, x, y, accent) { this.items = this.items.filter((i) => performance.now() - i.t0 < 120).slice(-1); this.items.push({ grade, dt, x, y, accent, t0: performance.now() }); }
    draw(g, size = 34) {
      const now = performance.now();
      this.items = this.items.filter((i) => now - i.t0 < 650);
      for (const it of this.items) {
        const k = (now - it.t0) / 650, kin = clamp((now - it.t0) / 140, 0, 1);
        const sc = 1.35 - 0.35 * ease.outBack(kin);
        const alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const word = LABEL[it.grade];
        g.save(); g.translate(it.x, it.y - k * 10); g.scale(sc, sc); g.globalAlpha = alpha;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const spacing = (1 - kin) * 12;
        g.font = `900 ${size}px ${FD}`;
        const w = measureSpaced(g, word, spacing);
        if (it.grade === 'miss') {
          g.fillStyle = PAL.mute; drawSpaced(g, word, 0, 0, spacing);
          g.fillStyle = it.accent; g.fillRect(-w / 2 - 6, -2, (w + 12) * ease.out(kin), 4);
        } else {
          // offset shadow block for perfect
          if (it.grade === 'perfect') { g.fillStyle = it.accent; drawSpaced(g, word, 3, 3, spacing); }
          g.fillStyle = it.grade === 'good' ? PAL.ink2 : PAL.ink; drawSpaced(g, word, 0, 0, spacing);
          const bw = (w + 8) * ease.out(clamp((now - it.t0 - 60) / 220, 0, 1));
          g.fillStyle = it.grade === 'perfect' ? it.accent : PAL.ink; g.fillRect(-bw / 2, size * 0.62, bw, it.grade === 'perfect' ? 5 : 2);
        }
        if (it.dt !== undefined && it.grade !== 'miss' && Math.abs(it.dt) > 0.018) {
          const early = it.dt < 0;
          g.font = `700 ${Math.round(size * 0.34)}px ${FM}`;
          const tag = (early ? 'EARLY ' : 'LATE ') + (early ? '−' : '+') + Math.round(Math.abs(it.dt) * 1000) + 'ms';
          const tw = g.measureText(tag).width + 14, ty = -size * 0.95;
          g.fillStyle = early ? PAL.ink : it.accent; roundRect(g, -tw / 2, ty - 10, tw, 20, 10); g.fill();
          g.fillStyle = early ? PAL.paper : onColor(it.accent); g.fillText(tag, 0, ty + 1);
        }
        g.restore();
      }
    }
  }
  function onColor(hex) { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * gg + 0.114 * b) > 150 ? PAL.ink : '#fff'; }
  function measureSpaced(g, s, sp) { return g.measureText(s).width + sp * (s.length - 1); }
  function drawSpaced(g, s, x, y, sp) {
    if (sp < 0.3) { g.fillText(s, x, y); return; }
    const w = measureSpaced(g, s, sp); let cx = x - w / 2;
    const al = g.textAlign; g.textAlign = 'left';
    for (const ch of s) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
    g.textAlign = al;
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ---------- scoring ----------
  const WIN = { perfect: 0.045, great: 0.09, good: 0.135 };
  const COLORS = { perfect: '#121212', great: '#121212', good: '#3b3936', miss: '#8B857A' };
  const LABEL = { perfect: 'PERFECT', great: 'GREAT', good: 'GOOD', miss: 'MISS' };
  function grade(dt) { const a = Math.abs(dt); return a <= WIN.perfect ? 'perfect' : a <= WIN.great ? 'great' : a <= WIN.good ? 'good' : null; }

  class Stats {
    constructor(total) { this.total = total; this.c = { perfect: 0, great: 0, good: 0, miss: 0 }; this.combo = 0; this.maxCombo = 0; this.score = 0; this.offsets = []; this.judged = 0; this.comboT = 0; }
    add(g, dt) {
      this.c[g]++; this.judged++;
      if (g === 'miss') this.combo = 0; else { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); if (dt !== undefined) this.offsets.push(dt); }
      this.comboT = performance.now();
      const base = { perfect: 1, great: 0.7, good: 0.4, miss: 0 }[g];
      this.score += Math.round(1000000 / Math.max(1, this.total) * (base * 0.85 + 0.15 * Math.min(1, this.combo / 50) * (base > 0 ? 1 : 0)));
    }
    get acc() { const n = this.judged; if (!n) return 1; return (this.c.perfect + this.c.great * 0.7 + this.c.good * 0.4) / n; }
    summary() {
      const o = this.offsets, n = o.length;
      const mean = n ? o.reduce((a, b) => a + b, 0) / n : 0;
      const sd = n ? Math.sqrt(o.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n) : 0;
      const absMean = n ? o.reduce((a, b) => a + Math.abs(b), 0) / n : 0;
      return { ...this.c, maxCombo: this.maxCombo, score: Math.min(1000000, this.score), acc: this.acc, mean, sd, absMean, offsets: o.slice(), total: this.total };
    }
  }
  function rank(acc) { return acc >= 0.97 ? 'S' : acc >= 0.92 ? 'A' : acc >= 0.85 ? 'B' : acc >= 0.75 ? 'C' : 'D'; }

  // smooth number display
  class Roll { constructor() { this.v = 0; } step(target, dt) { this.v += (target - this.v) * (1 - Math.exp(-dt * 12)); if (Math.abs(target - this.v) < 1) this.v = target; return Math.round(this.v); } }

  return { onColor, PAL, FD, FM, FU, ease, clamp, Particles, Judge, WIN, COLORS, LABEL, grade, Stats, rank, Roll, roundRect, drawSpaced };
})();
