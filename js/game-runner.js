// ===== Game 3: dash — jump over ground spikes, duck under hanging saws =====
class RunnerGame {
  constructor(app) {
    this.app = app; this.obs = app.chart.notes;
    for (const o of this.obs) { o.judged = false; o.holding = false; o.dead = -1; }
    this.jumpT = -9; this.duckHeld = false; this.duckT = -9; this.hurtT = -9; this.landT = -9; this.hist = [];
    this.endT = Math.max(...this.obs.map((o) => o.end || o.t), 0) + 1.8;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const kinds = ['circle', 'half', 'rect', 'tri', 'stripe', 'ring'];
    this.far = []; for (let x = 0; x < 3000; x += 160 + rnd() * 260) this.far.push({ x, k: kinds[Math.floor(rnd() * 3)], s: 0.25 + rnd() * 0.3, y: rnd() });
    this.mid = []; for (let x = 0; x < 3000; x += 260 + rnd() * 320) this.mid.push({ x, k: kinds[Math.floor(rnd() * kinds.length)], s: 0.045 + rnd() * 0.06, y: rnd(), c: Math.floor(rnd() * 2), r: rnd() * 6 });
    this.jumpKeys = ['Space', 'ArrowUp', 'KeyJ', 'KeyK', 'KeyW'];
    this.duckKeys = ['ArrowDown', 'KeyF', 'KeyD', 'KeyS'];
    this.judgeFx = new FX.Judge(); this.punch = 0;
  }
  geo() { const { W, H } = this.app; const s = Math.min(W / 1280, H / 720) * 1.2; return { W, H, s, gy: H * 0.68, px: W * 0.22, v: W * 0.6 * this.app.speed }; }
  keyDown(code) { if (this.jumpKeys.includes(code)) this.act('low'); else if (this.duckKeys.includes(code)) this.act('high'); }
  keyUp(code) { if (this.duckKeys.includes(code)) this.unduck(); }
  pointerDown(x, y, id) { if (x > this.app.W / 2) this.act('low'); else { this.ptrDuck = id; this.act('high'); } }
  pointerUp(id) { if (id === this.ptrDuck) { this.ptrDuck = null; this.unduck(); } }

  act(type) {
    const now = this.app.time();
    if (type === 'low') { this.jumpT = now; this.duckHeld = false; }
    else { if (this.duckHeld) return; this.duckHeld = true; this.duckT = now; if (now - this.jumpT < 0.46) this.jumpT = now - 0.46; }
    let best = null;
    for (const o of this.obs) { if (o.judged) continue; if (o.t > now + FX.WIN.good) break; if (o.type === type && Math.abs(o.t - now) <= FX.WIN.good) { best = o; break; } }
    if (!best) return;
    const dt = now - best.t, g = FX.grade(dt), G = this.geo();
    best.judged = true;
    this.app.judge(g, dt);
    this.judgeFx.show(g, dt, G.px + 10 * G.s, G.gy - 255 * G.s, this.app.c1);
    AE.hit('hit');
    if (best.end) best.holding = true; else this.smash(best, G, g);
  }
  unduck() {
    this.duckHeld = false;
    const now = this.app.time(), G = this.geo();
    for (const o of this.obs) if (o.holding) {
      o.holding = false;
      if (now < o.end - FX.WIN.good) { this.app.judge('miss'); this.judgeFx.show('miss', undefined, G.px, G.gy - 255 * G.s, this.app.c1); this.hurt(); }
      else { this.app.judge('perfect'); this.judgeFx.show('perfect', undefined, G.px, G.gy - 255 * G.s, this.app.c1); AE.hit('soft'); }
    }
  }
  smash(o, G, g) {
    o.dead = this.app.time();
    const x = G.px + 30 * G.s, y = o.type === 'low' ? G.gy - 24 * G.s : G.gy - 96 * G.s;
    const P = this.app.particles, A = this.app.c1;
    P.burst(x, y, [FX.PAL.ink, A, FX.PAL.ink], 22, 760, 0.9, 16 * G.s, { shape: 'shard', gravity: 1900, angle: -0.35, spread: 2.4, drag: 0.96 });
    P.ring(x, y, FX.PAL.ink, 10, 90 * G.s, 0.35, 4);
    if (g === 'perfect') P.rays(x, y, A, 10, 30 * G.s, 110 * G.s, 0.3, 4);
    this.punch = 1;
  }
  hurt() { this.hurtT = this.app.time(); this.app.shake = 0.3; AE.hit('miss'); }

  update(now, dt) {
    const G = this.geo();
    for (const o of this.obs) {
      if (o.t > now + 0.3) break;
      if (!o.judged && now - o.t > FX.WIN.good) { o.judged = true; o.missed = true; this.app.judge('miss'); this.judgeFx.show('miss', undefined, G.px, G.gy - 255 * G.s, this.app.c1); this.hurt(); if (o.end) this.app.judge('miss'); }
      if (o.holding) {
        if (now >= o.end) { o.holding = false; this.app.judge('perfect'); this.judgeFx.show('perfect', undefined, G.px, G.gy - 255 * G.s, this.app.c1); AE.hit('soft'); this.app.particles.ring(G.px, G.gy - 20 * G.s, this.app.c1, 10, 90 * G.s, 0.4, 5); }
        else if (Math.random() < dt * 40) this.app.particles.burst(G.px + 20 * G.s, G.gy - 3, [this.app.c1, FX.PAL.ink], 1, 320, 0.4, 6 * G.s, { angle: Math.PI + 0.3, spread: 0.8, gravity: 900 });
      }
    }
    // landing squash
    const jt = now - this.jumpT; if (jt >= 0.46 && jt < 0.46 + dt * 1.5) this.landT = now;
    this.punch = Math.max(0, this.punch - dt * 5);
    if (this.app.auto) {
      const o = this.obs.find((o) => !o.judged);
      if (o && now >= o.t) this.act(o.type);
      if (this.duckHeld && !this.obs.some((o) => o.holding) && now - this.duckT > 0.25) this.unduck();
    }
  }
  done(now) { return now > this.endT; }

  pose(now, G) {
    const jt = now - this.jumpT, JD = 0.46;
    let y = 0, sx = 1, sy = 1;
    const air = jt >= 0 && jt < JD;
    if (air) { const u = jt / JD; y = -4 * u * (1 - u) * 160 * G.s; const st = Math.abs(0.5 - u) * 2; sx = 1 - 0.2 * st; sy = 1 + 0.25 * st; }
    const lt = now - this.landT; if (!air && lt >= 0 && lt < 0.15) { const k = 1 - lt / 0.15; sx = 1 + 0.3 * k; sy = 1 - 0.28 * k; }
    const ducking = this.duckHeld || (now - this.duckT < 0.28 && !air);
    if (ducking) { sx = 1.5; sy = 0.52; }
    return { y, sx, sy, ducking, air };
  }

  draw(now, dt) {
    const g = this.app.g, G = this.geo(), { W, H } = G, E = this.app.energy, A = this.app.c1, B = this.app.c2, P = FX.PAL;
    const cols = [A, B, P.ink, '#FFB800'];
    const dist = now * G.v;
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
    // far layer: pale shapes
    const drawShape = (k, x, y, r, col, rot) => {
      g.fillStyle = col; g.strokeStyle = col; g.save(); g.translate(x, y); g.rotate(rot || 0); g.beginPath();
      if (k === 'circle') { g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }
      else if (k === 'half') { g.arc(0, 0, r, Math.PI, 0); g.fill(); }
      else if (k === 'rect') { g.fillRect(-r * 0.7, -r, r * 1.4, r * 2); }
      else if (k === 'tri') { g.moveTo(0, -r); g.lineTo(r * 0.9, r * 0.7); g.lineTo(-r * 0.9, r * 0.7); g.fill(); }
      else if (k === 'stripe') { for (let i = 0; i < 4; i++) g.fillRect(-r, -r + i * r * 0.5, r * 2, r * 0.22); }
      else { g.lineWidth = r * 0.22; g.arc(0, 0, r * 0.8, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    };
    for (const L of [{ list: this.far, sp: 0.06, span: 3000 }, { list: this.mid, sp: 0.2, span: 3000 }]) {
      const off = (dist * L.sp) % L.span;
      for (let rep = 0; rep < 2; rep++) for (const s of L.list) {
        const x = s.x - off + rep * L.span; const r = s.s * H; if (x < -r * 2 || x > W + r * 2) continue;
        if (L.sp < 0.1) drawShape(s.k, x, G.gy - H * 0.15 - s.y * H * 0.3, r, P.paper2, 0);
        else { const bounce = 1 + E * 0.35; g.globalAlpha = 0.85; drawShape(s.k, x, H * 0.16 + s.y * H * 0.2, r * bounce, cols[s.c], s.r + (s.k === 'tri' || s.k === 'rect' ? now * 0.3 : 0)); g.globalAlpha = 1; }
      }
    }
    // equaliser skyline along the horizon (flat when silent)
    g.fillStyle = P.ink;
    const nb = 64, bw = W / nb;
    for (let i = 0; i < nb; i++) { const v = AE.spectrum && this.app.musicOn ? AE.spectrum[2 + (i % 32) * 3] / 255 : 0; const h = 3 + v * v * H * 0.14; g.fillRect(i * bw + bw * 0.3, G.gy - h, bw * 0.4, h); }
    // ground: solid ink block
    let shx = 0, shy = 0; if (this.app.shake > 0) { shx = (Math.random() - 0.5) * 16 * this.app.shake; shy = (Math.random() - 0.5) * 16 * this.app.shake; }
    g.save(); g.translate(shx, shy);
    g.fillStyle = P.ink; g.fillRect(-20, G.gy, W + 40, H - G.gy + 20);
    g.fillStyle = P.paper; const dashW = 60 * G.s, dOff = dist % (dashW * 2);
    for (let x = -dOff; x < W; x += dashW * 2) g.fillRect(x, G.gy + (H - G.gy) * 0.52, dashW, 4);
    // beat notches on the ground edge
    const song = this.app.song, beat = song.beat, off = song.offset !== undefined ? song.offset : 0.05;
    for (let b = Math.floor((now - 1 - off) / beat); ; b++) { const t = off + b * beat, x = G.px + (t - now) * G.v; if (x > W + 20) break; if (x < -20) continue; const bar = ((b % 4) + 4) % 4 === 0; g.fillStyle = bar ? A : P.paper; g.fillRect(x - 1, G.gy + 6, 2, bar ? 16 : 8); }
    // obstacles + action glyphs on the ground
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i]; const x = G.px + (o.t - now) * G.v; if (x > W + 200) continue;
      const x2 = o.end ? G.px + (o.end - now) * G.v : x; if (x2 < -200) continue;
      if (o.dead < 0) this.drawObs(o, x, x2, now, G);
      if (!o.judged || o.holding) {
        g.fillStyle = o.type === 'low' ? P.paper : A; g.font = `700 ${Math.round(12 * G.s)}px ${FX.FM}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(o.type === 'low' ? '▲ JUMP' : '▼ DUCK', x, G.gy + (H - G.gy) * 0.3);
      }
    }
    this.drawPlayer(now, G);
    g.restore();
    this.app.particles.draw(g);
    this.judgeFx.draw(g, 34 * G.s);
  }
  drawObs(o, x, x2, now, G) {
    const g = this.app.g, s = G.s, P = FX.PAL, A = this.app.c1, B = this.app.c2;
    g.save(); g.globalAlpha = o.missed ? 0.3 : 1;
    if (o.type === 'low') {
      g.fillStyle = P.ink;
      for (const [dx, h, w] of [[-16, 46, 30], [12, 64, 34]]) { g.beginPath(); g.moveTo(x + (dx - w / 2) * s, G.gy); g.lineTo(x + dx * s, G.gy - h * s); g.lineTo(x + (dx + w / 2) * s, G.gy); g.fill(); }
      g.fillStyle = A; g.beginPath(); g.moveTo(x + 12 * s, G.gy - 64 * s); g.lineTo(x + 18 * s, G.gy - 46 * s); g.lineTo(x + 6 * s, G.gy - 46 * s); g.fill();
    } else {
      const hy = G.gy - 98 * s;
      if (o.end) {
        const xa = o.holding ? Math.max(G.px, x) : x;
        g.fillStyle = B; g.fillRect(xa, hy - 14 * s, x2 - xa, 28 * s);
        g.save(); g.beginPath(); g.rect(xa, hy - 14 * s, x2 - xa, 28 * s); g.clip(); g.strokeStyle = P.ink; g.lineWidth = 3;
        const o2 = (now * 200) % 20; for (let k = xa - 40 + o2; k < x2 + 40; k += 20) { g.beginPath(); g.moveTo(k, hy + 16 * s); g.lineTo(k + 24 * s, hy - 16 * s); g.stroke(); }
        g.restore();
        g.fillStyle = P.ink; g.fillRect(xa, hy - 16 * s, x2 - xa, 3); g.fillRect(xa, hy + 13 * s, x2 - xa, 3);
        for (const ex of [x, x2]) { if (o.holding && ex === x) continue; g.fillStyle = P.ink; g.fillRect(ex - 10 * s, hy - 24 * s, 20 * s, 48 * s); g.fillRect(ex - 1.5, 0, 3, hy - 24 * s); }
      } else {
        g.fillStyle = P.ink; g.fillRect(x - 1.5, 0, 3, hy - 30 * s);
        g.save(); g.translate(x, hy); g.rotate(-now * 9);
        g.beginPath(); for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, r = (k % 2 ? 26 : 34) * s; k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
        g.fillStyle = A; g.beginPath(); g.arc(0, 0, 21 * s, 0, Math.PI * 2); g.fill();
        g.fillStyle = P.ink; g.fillRect(-21 * s, -3 * s, 42 * s, 6 * s);
        g.fillStyle = P.paper; g.beginPath(); g.arc(0, 0, 5 * s, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
    g.restore();
  }
  drawPlayer(now, G) {
    const g = this.app.g, s = G.s, P = FX.PAL, A = this.app.c1, Pp = this.pose(now, G);
    const hurt = now - this.hurtT < 0.4, blink = hurt && Math.floor((now - this.hurtT) * 20) % 2 === 0;
    const r = 26 * s, bx = G.px, by = G.gy + Pp.y - r * Pp.sy;
    // scarf: trailing ribbon through recent positions
    this.hist.push({ t: now, y: by - r * 0.3 * Pp.sy }); while (this.hist.length && now - this.hist[0].t > 0.32) this.hist.shift();
    g.strokeStyle = A; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 10 * s;
    g.beginPath(); let first = true;
    for (let i = this.hist.length - 1; i >= 0; i--) { const h = this.hist[i], age = now - h.t; const x = bx - r * 0.6 - age * G.v * 0.35, y = h.y + Math.sin(now * 18 - age * 30) * 4 * s * (age * 4); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); }
    g.stroke();
    // speed lines when ducking
    if (Pp.ducking) { g.fillStyle = P.ink; for (let i = 0; i < 3; i++) { const w = (30 + i * 18) * s, xx = bx - r * 1.7 - w - ((now * 600 + i * 70) % 60); g.fillRect(xx, G.gy - (6 + i * 12) * s, w, 2.5); } }
    // body
    g.save(); g.translate(bx, by);
    if (Pp.air) g.rotate((now - this.jumpT) * 8 * 0);
    g.scale(Pp.sx, Pp.sy);
    g.fillStyle = blink ? P.paper : P.ink; g.strokeStyle = P.ink; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
    // eye looks ahead, accent cheek
    g.fillStyle = P.paper; g.beginPath(); g.arc(r * 0.38, -r * 0.18, r * 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = P.ink; const look = Pp.air ? -r * 0.06 : 0; g.beginPath(); g.arc(r * 0.48, -r * 0.18 + look, r * 0.13, 0, Math.PI * 2); g.fill();
    g.fillStyle = A; g.beginPath(); g.arc(r * 0.1, r * 0.3, r * 0.14, 0, Math.PI * 2); g.fill();
    g.restore();
    // shadow on ground edge
    g.fillStyle = A; const shw = r * (1.4 + Pp.y / (300 * s)); g.fillRect(bx - shw / 2, G.gy, shw, 4);
  }
}
