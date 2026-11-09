// ===== Game 1: four lanes =====
function roundRect(g, x, y, w, h, r) { FX.roundRect(g, x, y, w, h, r); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
class PianoGame {
  constructor(app) {
    this.app = app; this.notes = app.chart.notes;
    for (const n of this.notes) { n.judged = false; n.holding = false; n.tailDone = !n.end; }
    this.keys = [['KeyD'], ['KeyF'], ['KeyJ'], ['KeyK']];
    this.keyLabels = ['D', 'F', 'J', 'K'];
    this.down = [false, false, false, false]; this.flash = [0, 0, 0, 0]; this.missFl = [0, 0, 0, 0]; this.pressT = [-9, -9, -9, -9];
    this.look = 1.3 / app.speed;
    this.endT = Math.max(...this.notes.map((n) => n.end || n.t), 0) + 1.8;
    this.judgeFx = new FX.Judge(); this.comboPop = 0; this.lastCombo = 0; this.lineKick = 0;
  }
  geo() {
    const { W, H } = this.app;
    const lw = FX.clamp(W * 0.075, 64, 104), x0 = W / 2 - lw * 2, hy = H * 0.8;
    return { W, H, lw, x0, hy, pps: (hy + 30) / this.look };
  }
  laneC(l, G) { return G.x0 + (l + 0.5) * G.lw; }
  keyDown(code) { const l = this.keys.findIndex((k) => k.includes(code)); if (l >= 0) this.press(l); }
  keyUp(code) { const l = this.keys.findIndex((k) => k.includes(code)); if (l >= 0) this.release(l); }
  pointerDown(x, y, id) { const G = this.geo(); const l = Math.floor((x - G.x0) / G.lw); if (l >= 0 && l < 4) { this.ptr = this.ptr || {}; this.ptr[id] = l; this.press(l); } }
  pointerUp(id) { if (this.ptr && this.ptr[id] !== undefined) { this.release(this.ptr[id]); delete this.ptr[id]; } }

  press(l) {
    if (this.down[l]) return;
    this.down[l] = true; this.pressT[l] = performance.now();
    const now = this.app.time();
    let best = null;
    for (const n of this.notes) { if (n.judged || n.lane !== l) continue; if (n.t > now + FX.WIN.good) break; if (Math.abs(n.t - now) <= FX.WIN.good) { best = n; break; } }
    if (!best) return;
    const dt = now - best.t, g = FX.grade(dt);
    best.judged = true;
    this.hit(l, g, dt);
    if (best.end) best.holding = true;
  }
  hit(l, g, dt) {
    const G = this.geo();
    this.app.judge(g, dt);
    this.judgeFx.show(g, dt, G.x0 + G.lw * 2, G.hy - G.H * 0.3, this.app.c1);
    this.burst(l, g);
    AE.hit(dt === undefined ? 'soft' : 'hit');
  }
  release(l) {
    this.down[l] = false;
    const now = this.app.time();
    for (const n of this.notes) if (n.holding && n.lane === l) {
      n.holding = false; n.tailDone = true;
      if (now < n.end - FX.WIN.good) { n.broken = true; this.miss(l); } else this.hit(l, 'perfect');
    }
  }
  miss(l) {
    const G = this.geo();
    this.app.judge('miss'); this.missFl[l] = 1;
    this.judgeFx.show('miss', undefined, G.x0 + G.lw * 2, G.hy - G.H * 0.3, this.app.c1);
  }
  burst(l, g) {
    const G = this.geo(), x = this.laneC(l, G), y = G.hy, P = this.app.particles, A = this.app.c1, B = this.app.c2;
    this.flash[l] = 1; this.lineKick = 1;
    P.burst(x, y, [FX.PAL.ink, A, B], g === 'perfect' ? 16 : 10, 620, 0.7, 9, { angle: -Math.PI / 2, spread: 1.6, gravity: 1500 });
    P.ring(x, y, A, G.lw * 0.25, G.lw * 0.75, 0.32, 4, { square: true, rot: Math.PI / 4 });
    if (g === 'perfect') P.rays(x, y, FX.PAL.ink, 8, G.lw * 0.3, G.lw * 0.95, 0.3, 3, Math.PI / 8);
  }

  update(now, dt) {
    for (const n of this.notes) {
      if (n.t > now + 0.2) break;
      if (!n.judged && now - n.t > FX.WIN.good) { n.judged = true; n.missed = true; this.miss(n.lane); if (n.end) { n.tailDone = true; this.app.judge('miss'); } }
      if (n.holding) {
        if (now >= n.end) { n.holding = false; n.tailDone = true; this.hit(n.lane, 'perfect'); }
        else if (Math.random() < dt * 30) { const G = this.geo(); this.app.particles.burst(this.laneC(n.lane, G), G.hy, [this.app.c1, FX.PAL.ink], 1, 380, 0.5, 6, { angle: -Math.PI / 2, spread: 0.9, gravity: 900 }); }
      }
    }
    for (let i = 0; i < 4; i++) { this.flash[i] = Math.max(0, this.flash[i] - dt * 3.5); this.missFl[i] = Math.max(0, this.missFl[i] - dt * 3); }
    this.lineKick = Math.max(0, this.lineKick - dt * 6);
    const c = this.app.stats.combo; if (c > this.lastCombo) this.comboPop = 1; this.lastCombo = c; this.comboPop = Math.max(0, this.comboPop - dt * 5);
    if (this.app.auto) {
      for (const n of this.notes) { if (n.t > now + 0.02) break; if (!n.judged && n.t <= now) { this.down[n.lane] = false; this.press(n.lane); } }
      for (let l = 0; l < 4; l++) if (this.down[l] && !this.notes.some((n) => n.holding && n.lane === l) && performance.now() - this.pressT[l] > 70) this.down[l] = false;
    }
  }
  done(now) { return now > this.endT; }

  draw(now, dt) {
    const g = this.app.g, G = this.geo(), { W, H } = G, E = this.app.energy, A = this.app.c1, B = this.app.c2, P = FX.PAL;
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
    // --- poster composition (breathes with the music's bass) ---
    const cr = H * 0.26 * (1 + E * 0.14);
    g.fillStyle = A; g.beginPath(); g.arc(W * 0.8, H * 0.3, cr, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(W * 0.13, H * 0.92); g.rotate(now * 0.15); g.fillStyle = P.ink; g.beginPath(); g.arc(0, 0, H * 0.2 * (1 + E * 0.08), Math.PI, 0); g.fill(); g.restore();
    g.fillStyle = B; const sq = H * 0.1; g.fillRect(W * 0.87, H * 0.66 - sq * E * 0.6, sq, sq * (1 + E * 0.6));
    g.strokeStyle = P.ink; g.lineWidth = 1.5;
    for (const [x, y] of [[28, H - 28], [W - 28, H - 28]]) { g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.moveTo(x, y - 10); g.lineTo(x, y + 10); g.stroke(); g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.stroke(); }
    // spectrum as a row of ink bars (flat when silent)
    const sx0 = G.x0 + G.lw * 4 + 48, sx1 = W - 48, n = 40, bw = (sx1 - sx0) / n;
    if (sx1 - sx0 > 120) {
      g.fillStyle = P.ink;
      for (let i = 0; i < n; i++) { const v = AE.spectrum && this.app.musicOn ? AE.spectrum[2 + Math.floor(i * 2.2)] / 255 : 0; const h = 2 + v * v * H * 0.18; g.fillRect(sx0 + i * bw, H * 0.9 - h, Math.max(1, bw * 0.45), h); }
      g.font = `700 10px ${FX.FM}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(this.app.musicOn ? 'SPECTRUM — LIVE' : 'SPECTRUM — NO SIGNAL', sx0, H * 0.9 + 18);
    }
    // giant combo, left of the lanes
    const st = this.app.stats;
    if (st.combo >= 3 && G.x0 > 160) {
      const size = Math.min(H * 0.2, (G.x0 - 40) * 0.4) * (1 + this.comboPop * 0.12);
      g.save(); g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.font = `900 ${size}px ${FX.FD}`;
      const cx = G.x0 - 34, cy = H * 0.52;
      g.fillStyle = A; g.globalAlpha = 0.25 + this.comboPop * 0.75; g.fillText(st.combo, cx + 6, cy + 6); g.globalAlpha = 1;
      g.fillStyle = P.paper; g.fillText(st.combo, cx, cy);
      g.lineWidth = 2.5; g.strokeStyle = P.ink; g.strokeText(st.combo, cx, cy);
      g.font = `700 12px ${FX.FM}`; g.fillStyle = P.ink; g.fillText('× COMBO', cx, cy + 26);
      g.restore();
    }
    // --- lane bed ---
    const bx = G.x0, bw2 = G.lw * 4;
    g.fillStyle = P.card; g.fillRect(bx, 0, bw2, H);
    const song = this.app.song, beat = song.beat, off = song.offset !== undefined ? song.offset : 0.05;
    const firstB = Math.floor((now - 0.3 - off) / beat);
    for (let b = firstB; b < firstB + 400; b++) {
      const t = off + b * beat; const y = G.hy - (t - now) * G.pps; if (y < -10) break; if (y > H) continue;
      const bar = ((b % 4) + 4) % 4 === 0;
      g.fillStyle = bar ? 'rgba(18,18,18,0.22)' : 'rgba(18,18,18,0.07)'; g.fillRect(bx, y, bw2, bar ? 2 : 1);
      if (bar && b >= 0) { g.font = `700 9px ${FX.FM}`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = P.mute; g.fillText(String(Math.floor(b / 4) + 1).padStart(3, '0'), bx - 8, y); }
    }
    for (let l = 0; l < 4; l++) {
      const x = bx + l * G.lw;
      const a = Math.max(this.down[l] ? 0.16 : 0, this.flash[l] * 0.55);
      if (a > 0) { const gr = g.createLinearGradient(0, G.hy, 0, G.hy - H * 0.55); gr.addColorStop(0, hexA(A, a)); gr.addColorStop(1, hexA(A, 0)); g.fillStyle = gr; g.fillRect(x, G.hy - H * 0.55, G.lw, H * 0.55); }
      if (this.missFl[l] > 0) { g.save(); g.globalAlpha = this.missFl[l] * 0.5; g.beginPath(); g.rect(x, 0, G.lw, G.hy); g.clip(); g.strokeStyle = P.ink; g.lineWidth = 1; for (let k = -H; k < G.lw; k += 10) { g.beginPath(); g.moveTo(x + k, G.hy); g.lineTo(x + k + H, 0); g.stroke(); } g.restore(); }
    }
    g.fillStyle = 'rgba(18,18,18,0.12)'; for (let l = 1; l < 4; l++) g.fillRect(bx + l * G.lw, 0, 1, H);
    g.fillStyle = P.ink; g.fillRect(bx - 2, 0, 2, H); g.fillRect(bx + bw2, 0, 2, H);
    // --- notes ---
    for (const n of this.notes) {
      if (n.t - now > this.look + 0.1) break;
      if ((n.end || n.t) < now - 0.4) continue;
      if (!n.end && n.judged && !n.missed) continue;
      if (n.end && n.tailDone && !n.missed && !n.broken) continue;
      this.drawNote(n, now, G);
    }
    // hit line
    const k = this.lineKick;
    g.fillStyle = P.ink; g.fillRect(bx - 16, G.hy - 2 - k * 2, bw2 + 32, 4 + k * 4);
    g.fillStyle = A; g.fillRect(bx - 16, G.hy - 2 - k * 2, 10, 4 + k * 4); g.fillRect(bx + bw2 + 6, G.hy - 2 - k * 2, 10, 4 + k * 4);
    // receptors (keycaps)
    for (let l = 0; l < 4; l++) {
      const x = this.laneC(l, G), s = Math.min(42, G.lw * 0.5), pr = this.down[l], y = G.hy + 36 + (pr ? 3 : 0);
      if (!pr) { g.fillStyle = P.ink; roundRect(g, x - s / 2, y - s / 2 + 4, s, s, 6); g.fill(); }
      g.fillStyle = pr ? P.ink : P.card; g.strokeStyle = P.ink; g.lineWidth = 2;
      roundRect(g, x - s / 2, y - s / 2, s, s, 6); g.fill(); g.stroke();
      g.fillStyle = pr ? P.paper : P.ink; g.font = `700 15px ${FX.FM}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.keyLabels[l], x, y + 1);
    }
    this.app.particles.draw(g);
    this.judgeFx.draw(g, Math.min(40, G.lw * 0.42));
  }
  drawNote(n, now, G) {
    const g = this.app.g, P = FX.PAL, A = this.app.c1;
    const x = G.x0 + n.lane * G.lw, yH = G.hy - (n.t - now) * G.pps;
    const dim = n.missed || n.broken;
    if (n.end) {
      const yT = G.hy - (n.end - now) * G.pps, yS = n.holding ? G.hy : yH;
      const w = G.lw * 0.42, xl = x + (G.lw - w) / 2;
      g.fillStyle = dim ? P.paper2 : A; g.fillRect(xl, yT, w, yS - yT);
      g.save(); g.beginPath(); g.rect(xl, yT, w, yS - yT); g.clip(); g.strokeStyle = dim ? 'rgba(18,18,18,0.15)' : 'rgba(18,18,18,0.4)'; g.lineWidth = 1.5;
      const o = (now * 120) % 12; for (let yy = yT - 40 + o; yy < yS + 40; yy += 12) { g.beginPath(); g.moveTo(xl, yy + w); g.lineTo(xl + w, yy); g.stroke(); }
      g.restore();
      g.fillStyle = P.ink; g.fillRect(xl - 1.5, yT, 1.5, yS - yT); g.fillRect(xl + w, yT, 1.5, yS - yT);
      g.fillStyle = dim ? P.mute : P.ink; g.fillRect(xl - 6, yT - 4, w + 12, 6);
      if (n.holding) return;
    }
    if (n.judged && n.end && !n.missed) return;
    const h = 18;
    g.fillStyle = dim ? P.mute : P.ink; g.fillRect(x + 5, yH - h / 2, G.lw - 10, h);
    if (!dim) { g.fillStyle = A; g.fillRect(x + 5, yH - h / 2, 6, h); }
  }
}
