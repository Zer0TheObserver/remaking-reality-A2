// ===== Game 2: circles (aim + timing) =====
class CirclesGame {
  constructor(app) {
    this.app = app; this.notes = app.chart.notes;
    for (const n of this.notes) { n.judged = false; n.hitAnim = -1; n.tail = null; n.track = 0; n.trackN = 0; }
    this.AR = 0.95 / Math.sqrt(app.speed); this.R = 34;
    this.cursor = { x: app.W / 2, y: app.H / 2 }; this.trail = [];
    this.held = new Set();
    this.endT = Math.max(...this.notes.map((n) => n.endT || n.t), 0) + 1.6;
    this.ripples = []; this.judgeFx = new FX.Judge(); this.shake = 0;
  }
  cols() { return [this.app.c1, this.app.c2, FX.PAL.ink]; }
  map() {
    const { W, H } = this.app; const sc = Math.min(W / 640, (H - 80) / 460);
    return { sc, ox: W / 2 - 256 * sc, oy: (H + 30) / 2 - 192 * sc };
  }
  sp(x, y, M) { return [M.ox + x * M.sc, M.oy + y * M.sc]; }
  isHeld() { return this.held.size > 0; }
  pointerMove(x, y) { this.cursor.x = x; this.cursor.y = y; }
  pointerDown(x, y, id) { this.cursor.x = x; this.cursor.y = y; this.held.add('p' + id); this.tryHit(); }
  pointerUp(id) { this.held.delete('p' + id); }
  keyDown(code) { if (['KeyZ', 'KeyX', 'KeyD', 'KeyF', 'KeyJ', 'KeyK'].includes(code)) { if (this.held.has(code)) return; this.held.add(code); this.tryHit(); } }
  keyUp(code) { this.held.delete(code); }

  tryHit() {
    const now = this.app.time(), M = this.map(), R = this.R * M.sc;
    for (const n of this.notes) {
      if (n.judged) continue;
      if (n.t - now > FX.WIN.good) return;
      const [x, y] = this.sp(n.x, n.y, M);
      if (Math.hypot(this.cursor.x - x, this.cursor.y - y) > R * 1.15) return;
      const dt = now - n.t, g = FX.grade(dt);
      if (!g) return;
      this.hitNote(n, g, dt, x, y);
      return;
    }
  }
  hitNote(n, g, dt, x, y) {
    n.judged = true; n.hitAnim = this.app.time(); n.grade = g;
    const col = this.cols()[n.color % 3], R = this.R * this.map().sc;
    this.app.judge(g, dt);
    this.judgeFx.show(g, dt, x, y - R - 30, this.app.c1);
    const P = this.app.particles;
    P.burst(x, y, [col, FX.PAL.ink, this.app.c2], 18, 520, 0.7, 10, { drag: 0.88 });
    P.ring(x, y, FX.PAL.ink, R, R * 2.4, 0.4, 3);
    if (g === 'perfect') P.rays(x, y, FX.PAL.ink, 12, R * 1.1, R * 2.1, 0.32, 3);
    this.ripples.push({ x, y, t0: performance.now(), amp: g === 'perfect' ? 16 : 10 });
    AE.hit('hit');
    this.shake = 0.1;
  }
  update(now, dt) {
    const M = this.map();
    for (const n of this.notes) {
      if (n.t - now > this.AR) break;
      if (!n.judged && now - n.t > FX.WIN.good) {
        n.judged = true; n.missed = true; n.hitAnim = now;
        const [x, y] = this.sp(n.x, n.y, M); this.app.judge('miss'); this.judgeFx.show('miss', undefined, x, y - this.R * M.sc - 30, this.app.c1);
        if (n.slider) { n.tail = 'miss'; this.app.judge('miss'); }
      }
      if (n.slider && n.judged && !n.missed && !n.tail) {
        const [bx, by] = this.ball(n, now, M);
        n.trackN++; if (this.isHeld() && Math.hypot(this.cursor.x - bx, this.cursor.y - by) < this.R * M.sc * 2.6) n.track++;
        if (Math.random() < dt * 25 && this.isHeld()) this.app.particles.burst(bx, by, [this.cols()[n.color % 3], FX.PAL.ink], 1, 160, 0.5, 6);
        if (now >= n.endT) {
          const ok = n.track / Math.max(1, n.trackN) >= 0.7;
          n.tail = ok ? 'perfect' : 'miss'; this.app.judge(n.tail); this.judgeFx.show(n.tail, undefined, bx, by - this.R * M.sc - 30, this.app.c1);
          if (ok) { AE.hit('soft'); this.app.particles.ring(bx, by, this.cols()[n.color % 3], this.R * M.sc, this.R * M.sc * 2.4, 0.4, 5); this.ripples.push({ x: bx, y: by, t0: performance.now(), amp: 12 }); }
        }
      }
    }
    this.trail.push({ x: this.cursor.x, y: this.cursor.y }); if (this.trail.length > 14) this.trail.shift();
    this.shake = Math.max(0, this.shake - dt);
    if (this.app.auto) this.autoplay(now, M);
  }
  ball(n, now, M) {
    const u = Math.min(1, Math.max(0, (now - n.t) / (n.endT - n.t))), s = n.slider;
    return this.sp((1 - u) * (1 - u) * n.x + 2 * (1 - u) * u * s.cx + u * u * s.ex, (1 - u) * (1 - u) * n.y + 2 * (1 - u) * u * s.cy + u * u * s.ey, M);
  }
  autoplay(now, M) {
    const act = this.notes.find((n) => n.slider && n.judged && !n.missed && !n.tail);
    const nxt = this.notes.find((n) => !n.judged);
    if (act) { const [x, y] = this.ball(act, now, M); this.cursor.x = x; this.cursor.y = y; this.held.add('auto'); return; }
    this.held.delete('auto');
    if (nxt) {
      const [x, y] = this.sp(nxt.x, nxt.y, M), k = Math.min(1, 0.12 + Math.max(0, 1 - (nxt.t - now) / 0.35));
      this.cursor.x += (x - this.cursor.x) * k; this.cursor.y += (y - this.cursor.y) * k;
      if (now >= nxt.t) { this.cursor.x = x; this.cursor.y = y; this.held.add('auto'); this.tryHit(); }
    }
  }
  done(now) { return now > this.endT; }

  draw(now) {
    const g = this.app.g, { W, H } = this.app, E = this.app.energy, M = this.map(), R = this.R * M.sc, P = FX.PAL, A = this.app.c1, B = this.app.c2;
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
    // poster shapes
    g.fillStyle = A; g.beginPath(); g.arc(0, 0, H * 0.34 * (1 + E * 0.12), 0, Math.PI / 2); g.lineTo(0, 0); g.fill();
    g.fillStyle = B; g.beginPath(); g.arc(W, H, H * 0.22 * (1 + E * 0.18), Math.PI, Math.PI * 1.5); g.lineTo(W, H); g.fill();
    // radial spectrum ring around the playfield centre
    const cx = W / 2, cy = (H + 30) / 2, rr = Math.min(W, H) * 0.47;
    g.save(); g.translate(cx, cy); g.rotate(now * 0.05);
    g.strokeStyle = P.ink; g.lineWidth = 2;
    for (let i = 0; i < 96; i++) {
      const a = i / 96 * Math.PI * 2, v = AE.spectrum && this.app.musicOn ? AE.spectrum[2 + (i % 48) * 2] / 255 : 0;
      const l = (i % 8 === 0 ? 10 : 4) + v * v * 46;
      g.globalAlpha = i % 8 === 0 ? 0.6 : 0.25 + v * 0.6;
      g.beginPath(); g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); g.lineTo(Math.cos(a) * (rr + l), Math.sin(a) * (rr + l)); g.stroke();
    }
    g.restore(); g.globalAlpha = 1;
    // dot grid with ripples from every hit
    const nowP = performance.now(); this.ripples = this.ripples.filter((r) => nowP - r.t0 < 1100);
    const spc = 30; g.fillStyle = P.ink;
    for (let y = spc / 2; y < H; y += spc) for (let x = spc / 2; x < W; x += spc) {
      let dx = 0, dy = 0, m = 0;
      for (const r of this.ripples) {
        const age = (nowP - r.t0) / 1000, front = age * 650, d = Math.hypot(x - r.x, y - r.y) + 0.01;
        const w = Math.exp(-((d - front) * (d - front)) / 1800) * r.amp * (1 - age / 1.1);
        dx += (x - r.x) / d * w; dy += (y - r.y) / d * w; m += Math.abs(w);
      }
      const s = 1.6 + Math.min(3, m * 0.25) + E * 0.8;
      g.globalAlpha = 0.18 + Math.min(0.6, m * 0.05);
      g.fillRect(x + dx - s / 2, y + dy - s / 2, s, s);
    }
    g.globalAlpha = 1;
    // playfield corners
    g.strokeStyle = P.ink; g.lineWidth = 2; const fx0 = M.ox - 20, fy0 = M.oy - 20, fx1 = M.ox + 512 * M.sc + 20, fy1 = M.oy + 384 * M.sc + 20;
    for (const [x, y, sx, sy] of [[fx0, fy0, 1, 1], [fx1, fy0, -1, 1], [fx0, fy1, 1, -1], [fx1, fy1, -1, -1]]) { g.beginPath(); g.moveTo(x, y + 18 * sy); g.lineTo(x, y); g.lineTo(x + 18 * sx, y); g.stroke(); }
    let sx = 0, sy = 0; if (this.shake > 0) { sx = (Math.random() - 0.5) * 5 * this.shake / 0.1; sy = (Math.random() - 0.5) * 5 * this.shake / 0.1; }
    g.save(); g.translate(sx, sy);
    const vis = this.notes.filter((n) => n.t - now <= this.AR && (n.hitAnim < 0 || now - n.hitAnim < 0.4 || (n.slider && !n.tail && !n.missed)) && (n.endT || n.t) > now - 0.7);
    // follow points: small marching squares
    for (let i = 0; i < vis.length - 1; i++) {
      const a = vis[i], b = vis[i + 1]; if (a.missed || b.t - (a.endT || a.t) > 1.6) continue;
      const [ax, ay] = this.sp(a.slider ? a.slider.ex : a.x, a.slider ? a.slider.ey : a.y, M), [bx2, by2] = this.sp(b.x, b.y, M);
      const d = Math.hypot(bx2 - ax, by2 - ay); if (d < R * 2.6) continue;
      const vis0 = FX.clamp(1 - (b.t - now) / this.AR, 0, 1);
      g.fillStyle = P.ink; const steps = Math.floor((d - R * 2.4) / 16);
      for (let s = 0; s <= steps; s++) {
        const u = (R * 1.2 + s * 16 + (now * 40) % 16) / d; if (u > 1 - R * 1.2 / d) continue;
        g.globalAlpha = vis0 * 0.6; g.fillRect(ax + (bx2 - ax) * u - 2, ay + (by2 - ay) * u - 2, 4, 4);
      }
    }
    g.globalAlpha = 1;
    for (let i = vis.length - 1; i >= 0; i--) this.drawNote(vis[i], now, M, R);
    g.restore();
    this.app.particles.draw(g);
    this.judgeFx.draw(g, 30);
    // cursor
    g.strokeStyle = P.ink; g.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) { const p = this.trail[i - 1], q = this.trail[i]; g.globalAlpha = i / this.trail.length; g.lineWidth = 1 + i / this.trail.length * 3; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
    g.globalAlpha = 1;
    const cr = this.isHeld() ? 13 : 11;
    g.lineWidth = 2.5; g.beginPath(); g.arc(this.cursor.x, this.cursor.y, cr, 0, Math.PI * 2); g.fillStyle = this.isHeld() ? P.ink : 'rgba(245,242,235,0.7)'; g.fill(); g.stroke();
    g.fillStyle = A; g.beginPath(); g.arc(this.cursor.x, this.cursor.y, 4, 0, Math.PI * 2); g.fill();
  }
  drawNote(n, now, M, R) {
    const g = this.app.g, P = FX.PAL, col = this.cols()[n.color % 3], [x, y] = this.sp(n.x, n.y, M);
    const pre = n.t - now, appear = FX.clamp((this.AR - pre) / 0.22, 0, 1);
    // slider body
    if (n.slider && !(n.missed && now - n.hitAnim > 0.3) && !(n.tail && now - n.endT > 0.2)) {
      const [cx, cy] = this.sp(n.slider.cx, n.slider.cy, M), [ex, ey] = this.sp(n.slider.ex, n.slider.ey, M);
      g.save(); g.globalAlpha = appear * (n.missed ? 0.35 : 1); g.lineCap = 'round';
      const path = () => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx, cy, ex, ey); };
      path(); g.strokeStyle = P.ink; g.lineWidth = R * 2 + 6; g.stroke();
      path(); g.strokeStyle = P.card; g.lineWidth = R * 2 - 4; g.stroke();
      path(); g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([2, 10]); g.lineDashOffset = -now * 60; g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(ex, ey, R * 0.55, 0, Math.PI * 2); g.strokeStyle = P.ink; g.lineWidth = 2.5; g.stroke();
      g.restore();
      if (n.judged && !n.missed && !n.tail) {
        const [bx, by] = this.ball(n, now, M), tr = this.isHeld();
        g.beginPath(); g.arc(bx, by, R * 0.7, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.strokeStyle = P.ink; g.lineWidth = 3; g.stroke();
        g.save(); g.translate(bx, by); g.rotate(now * 3); g.setLineDash([8, 8]); g.beginPath(); g.arc(0, 0, R * (tr ? 1.9 : 1.2), 0, Math.PI * 2); g.strokeStyle = P.ink; g.lineWidth = 2; g.stroke(); g.restore();
      }
    }
    if (n.hitAnim >= 0) {
      const k = FX.clamp((now - n.hitAnim) / 0.4, 0, 1); if (k >= 1) return;
      g.save();
      if (n.missed) {
        g.globalAlpha = 1 - k; const yy = y + FX.ease.inOut(k) * 40;
        g.beginPath(); g.arc(x, yy, R, 0, Math.PI * 2); g.fillStyle = P.paper2; g.fill(); g.strokeStyle = P.mute; g.lineWidth = 3; g.stroke();
        g.strokeStyle = P.ink; g.lineWidth = 4; const s = R * 0.45; g.beginPath(); g.moveTo(x - s, yy - s); g.lineTo(x + s, yy + s); g.moveTo(x + s, yy - s); g.lineTo(x - s, yy + s); g.stroke();
      } else {
        const e = FX.ease.out(k);
        g.globalAlpha = 1 - k; g.fillStyle = col === P.ink ? this.app.c1 : col; g.beginPath(); g.arc(x, y, R * (0.62 + e * 0.9), 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1; const s = 1 - FX.ease.inOut(k);
        if (s > 0.02) { g.beginPath(); g.arc(x, y, R * s, 0, Math.PI * 2); g.fillStyle = P.card; g.fill(); g.strokeStyle = P.ink; g.lineWidth = 4 * s; g.stroke(); }
      }
      g.restore(); return;
    }
    const sc = 0.6 + 0.4 * FX.ease.outBack(appear);
    // approach ring
    const ap = Math.max(0, pre / this.AR);
    g.save(); g.globalAlpha = Math.min(1, appear * 1.5);
    g.beginPath(); g.arc(x, y, R * (1 + ap * 2.3), 0, Math.PI * 2); g.strokeStyle = P.ink; g.lineWidth = 2 + (1 - ap) * 2; g.stroke();
    // body: offset print shadow, card, ink rim, colour core
    g.translate(x, y); g.scale(sc, sc);
    g.fillStyle = P.ink; g.beginPath(); g.arc(4, 5, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = P.card; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill(); g.lineWidth = 4; g.strokeStyle = P.ink; g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, R * 0.64, 0, Math.PI * 2); g.fill();
    g.fillStyle = col === P.ink ? P.paper : P.ink; g.font = `700 ${Math.round(R * 0.62)}px ${FX.FD}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(n.num, 0, 2);
    g.restore();
  }
}
