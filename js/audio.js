// ===== Audio engine: context, music playback clock, hit sound effects, analyser =====
window.AE = (function () {
  const AE = {
    ctx: null, master: null, musicGain: null, sfxGain: null, analyser: null,
    freq: null, source: null, startCtx: 0, buffer: null, sfx: {}, energy: 0, musicOn: true,
    userOffset: 0, // seconds, + means notes later
  };

  AE.init = function () {
    if (AE.ctx) { if (AE.ctx.state === 'suspended') AE.ctx.resume(); return; }
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    AE.ctx = ctx;
    AE.master = ctx.createGain(); AE.master.gain.value = 0.9;
    AE.master.connect(ctx.destination);
    AE.musicGain = ctx.createGain();
    AE.analyser = ctx.createAnalyser(); AE.analyser.fftSize = 512; AE.analyser.smoothingTimeConstant = 0.6;
    AE.musicGain.connect(AE.analyser); AE.analyser.connect(AE.master);
    AE.freq = new Uint8Array(AE.analyser.frequencyBinCount);
    AE.sfxGain = ctx.createGain(); AE.sfxGain.gain.value = 0.55; AE.sfxGain.connect(AE.master);
    buildSfx();
  };

  // ---------- music ----------
  AE.play = function (buffer, leadIn, musicOn) {
    AE.stop();
    const ctx = AE.ctx;
    AE.musicOn = musicOn;
    AE.musicGain.gain.setValueAtTime(musicOn ? 1 : 0, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.connect(AE.musicGain);
    AE.startCtx = ctx.currentTime + leadIn;
    src.start(AE.startCtx);
    AE.source = src; AE.buffer = buffer;
    return src;
  };
  AE.stop = function () {
    if (AE.source) { try { AE.source.stop(); } catch (e) {} AE.source.disconnect(); AE.source = null; }
  };
  AE.fadeOut = function (sec) {
    const g = AE.musicGain.gain, t = AE.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + sec);
  };
  // song time as heard by the player (output-latency compensated)
  AE.now = function () {
    const ctx = AE.ctx;
    let t = ctx.currentTime;
    if (ctx.getOutputTimestamp && ctx.state === 'running') {
      const ts = ctx.getOutputTimestamp();
      if (ts.contextTime > 0 && ts.performanceTime > 0) {
        t = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
        if (t > ctx.currentTime + 0.05) t = ctx.currentTime; // guard against bad timestamps
      } else t -= (ctx.outputLatency || ctx.baseLatency || 0);
    }
    return t - AE.startCtx - AE.userOffset;
  };
  AE.pause = function () { if (AE.ctx) return AE.ctx.suspend(); };
  AE.resume = function () { if (AE.ctx) return AE.ctx.resume(); };

  // smoothed bass energy 0..1 (only exists when music is audible)
  AE.updateEnergy = function () {
    if (!AE.analyser) return 0;
    AE.analyser.getByteFrequencyData(AE.freq);
    let s = 0; for (let i = 1; i < 8; i++) s += AE.freq[i];
    const e = Math.max(0, (s / 7 / 255 - 0.35) / 0.65);
    AE.energy = Math.max(e, AE.energy * 0.88);
    AE.spectrum = AE.freq;
    return AE.energy;
  };

  // ---------- hit sounds ----------
  function makeBuf(len, fn) {
    const sr = AE.ctx.sampleRate, n = Math.floor(sr * len);
    const b = AE.ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = fn(i / sr, i);
    let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(d[i]));
    if (m > 0) for (let i = 0; i < n; i++) d[i] *= 0.9 / m;
    return b;
  }
  function buildSfx() {
    const TAU = Math.PI * 2;
    let lp = 0;
    AE.sfx.crisp = makeBuf(0.18, (t) =>
      Math.sin(TAU * 2093 * t) * Math.exp(-t * 38) * 0.6 +
      Math.sin(TAU * 3136 * t) * Math.exp(-t * 55) * 0.4 +
      Math.sin(TAU * 4186 * t) * Math.exp(-t * 90) * 0.25 +
      (t < 0.003 ? (Math.random() * 2 - 1) * 0.8 : 0));
    AE.sfx.crispSoft = makeBuf(0.12, (t) =>
      Math.sin(TAU * 1568 * t) * Math.exp(-t * 50) * 0.5 + (t < 0.002 ? (Math.random() * 2 - 1) * 0.4 : 0));
    AE.sfx.chip = makeBuf(0.11, (t) => {
      const f = t < 0.035 ? 988 : 1976;
      const sq = Math.sin(TAU * f * t) > 0 ? 1 : -1;
      return sq * 0.5 * (t < 0.1 ? 1 - t / 0.11 : 0);
    });
    AE.sfx.chipSoft = makeBuf(0.07, (t) => ((Math.sin(TAU * 659 * t) > 0 ? 1 : -1) * 0.4 * (1 - t / 0.07)));
    AE.sfx.drum = makeBuf(0.22, (t) => {
      const n = Math.random() * 2 - 1; lp = lp + (n - lp) * 0.45;
      return (n - lp) * Math.exp(-t * 45) * 0.7 +
        Math.sin(TAU * (330 - 120 * t) * t) * Math.exp(-t * 28) * 0.9;
    });
    AE.sfx.drumSoft = makeBuf(0.1, (t) => Math.sin(TAU * 220 * t) * Math.exp(-t * 40));
    AE.sfx.tick = makeBuf(0.05, (t) => Math.sin(TAU * 2637 * t) * Math.exp(-t * 120) * 0.5);
    AE.sfx.miss = makeBuf(0.25, (t) => Math.sin(TAU * (180 - 300 * t) * t) * Math.exp(-t * 14) * 0.5);
  }
  AE.sfxStyle = 'crisp';
  AE.sfxInMute = false;
  AE.hit = function (kind) { // kind: 'hit' | 'soft' | 'tick' | 'miss'
    if (!AE.ctx) return;
    if (!AE.musicOn && !AE.sfxInMute) return;
    let name;
    if (kind === 'tick') name = 'tick';
    else if (kind === 'miss') name = 'miss';
    else name = AE.sfxStyle + (kind === 'soft' ? 'Soft' : '');
    const b = AE.sfx[name]; if (!b) return;
    const s = AE.ctx.createBufferSource(); s.buffer = b;
    const g = AE.ctx.createGain(); g.gain.value = kind === 'miss' ? 0.35 : 1;
    s.connect(g); g.connect(AE.sfxGain); s.start();
  };

  return AE;
})();
