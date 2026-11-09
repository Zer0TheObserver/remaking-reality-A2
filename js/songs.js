// ===== Built-in original demo songs: composed as step-sequencer data, rendered with Web Audio =====
// Every note the music plays is also an "event", so charts line up exactly with the music.
window.Songs = (function () {
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
  const DRUMS = {
    none:  { k: '................', s: '................', h: '................' },
    light: { k: 'x.......x.......', s: '................', h: '..x...x...x...x.' },
    four:  { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
    fourB: { k: 'x...x...x...x.x.', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' },
    chip:  { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    chipB: { k: 'x.x...x.x.x...x.', s: '....x..x....x...', h: 'xxxxxxxxxxxxxxxx' },
    half:  { k: 'x.........x.....', s: '........x.......', h: 'x.x.x.x.x.x.x.x.' },
    halfB: { k: 'x.....x...x..x..', s: '........x.......', h: 'x.xxx.x.x.xxx.x.' },
    build0: { k: 'x...x...x...x...', s: '....x.......x...', h: '................' },
    build1: { k: 'x...x...x...x...', s: '..x...x...x...x.', h: '................' },
    build2: { k: 'x...x...x...x...', s: 'x.x.x.x.x.x.x.x.', h: '................' },
    build3: { k: 'x...x...x...x...', s: 'xxxxxxxxxxxxxxxx', h: '................' },
  };

  const LIST = [
    {
      id: 'neon', title: 'Neon Highway', artist: 'Original demo · Synthwave', bpm: 128, root: 57, scale: 'minor', style: 'synthwave',
      color: '#FF4122', color2: '#2741FF',
      prog: [0, 5, 2, 6],
      mel: {
        A: ['7-.6.7.4-..2.4..', '5-.4.5.2-..0.2..', '4-.2.4.6-.7.9-..', '8---7---6-..4-..'],
        B: ['7.7.9.7.6-4-2-4-', '5.5.7.5.4-2-0-2-', '4.4.6.4.2-4-6-7-', '9---8---7---6-4-'],
      },
      sections: [
        { name: 'intro', bars: 4, drums: 'light', bass: 1, pad: 1, arp: 1 },
        { name: 'verse', bars: 8, drums: 'four', lead: 'A', bass: 1, pad: 1 },
        { name: 'build', bars: 4, drums: 'build', lead: 'A', bass: 1, pad: 1, riser: 1 },
        { name: 'drop', bars: 8, drums: 'fourB', lead: 'B', bass: 2, pad: 1, arp: 1, crash: 1 },
        { name: 'break', bars: 4, drums: 'light', lead: 'A', pad: 1 },
        { name: 'drop', bars: 8, drums: 'fourB', lead: 'B', bass: 2, pad: 1, arp: 1, crash: 1 },
        { name: 'outro', bars: 2, drums: 'none', pad: 1 },
      ],
    },
    {
      id: 'pixel', title: 'Pixel Heartbeat', artist: 'Original demo · 8-bit Chiptune', bpm: 150, root: 60, scale: 'major', style: 'chip',
      color: '#FFB800', color2: '#FF4122',
      prog: [0, 4, 5, 3],
      mel: {
        A: ['0-2-4-0-7---4---', '6-4-6-8-b---8---', '5-7-9-7-5---2---', '3-5-7-5-3-4-6---'],
        B: ['7.9.b.e-c-b-9-7-', 'b.b.d.b-8-9-b---', 'c.c.e.c-9-a-c---', 'a.9.a.c-e---d-b-'],
      },
      sections: [
        { name: 'intro', bars: 4, drums: 'chip', bass: 1, arp: 1 },
        { name: 'verse', bars: 8, drums: 'chip', lead: 'A', bass: 1, arp: 1 },
        { name: 'build', bars: 4, drums: 'build', lead: 'A', bass: 1, riser: 1 },
        { name: 'drop', bars: 8, drums: 'chipB', lead: 'B', bass: 2, arp: 1, crash: 1 },
        { name: 'break', bars: 4, drums: 'light', lead: 'A', arp: 1 },
        { name: 'drop', bars: 12, drums: 'chipB', lead: 'B', bass: 2, arp: 1, crash: 1 },
        { name: 'outro', bars: 2, drums: 'none', arp: 1 },
      ],
    },
    {
      id: 'aurora', title: 'Aurora Drift', artist: 'Original demo · Future Bass', bpm: 100, root: 62, scale: 'minor', style: 'future',
      color: '#2741FF', color2: '#FFB800',
      prog: [5, 6, 0, 4],
      mel: {
        A: ['4---2---0-2-4---', '6---4---2-4-6---', '7-------4-------', '4-2-0-2-4-------'],
        B: ['7-9-7-4-7-9-b---', '8-a-8-6-8-a-c---', '9---7---4---7---', 'b---9---7---4-2-'],
      },
      sections: [
        { name: 'intro', bars: 4, drums: 'none', pad: 1, arp: 1 },
        { name: 'verse', bars: 8, drums: 'half', lead: 'A', bass: 1, pad: 1 },
        { name: 'build', bars: 4, drums: 'build', lead: 'A', pad: 1, riser: 1 },
        { name: 'drop', bars: 8, drums: 'halfB', lead: 'B', bass: 2, stabs: 1, crash: 1 },
        { name: 'break', bars: 2, drums: 'none', lead: 'A', pad: 1 },
        { name: 'drop', bars: 8, drums: 'halfB', lead: 'B', bass: 2, stabs: 1, crash: 1 },
        { name: 'outro', bars: 2, drums: 'none', pad: 1 },
      ],
    },
  ];

  const deg = (s, d) => { const sc = SCALES[s.scale], o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return s.root + 12 * o + sc[i]; };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const parseDeg = (c) => (c >= '0' && c <= '9' ? +c : c.charCodeAt(0) - 87);

  // ---------- build the event list for a song ----------
  function compose(s) {
    const beat = 60 / s.bpm, step = beat / 4, barLen = beat * 4;
    const ev = [], sections = [];
    let bar = 0;
    const T0 = 0.05;
    for (const sec of s.sections) {
      sections.push({ name: sec.name, t: T0 + bar * barLen, end: T0 + (bar + sec.bars) * barLen });
      for (let b = 0; b < sec.bars; b++, bar++) {
        const tb = T0 + bar * barLen;
        const chordDeg = s.prog[bar % 4];
        const chord = [0, 2, 4].map((x) => deg(s, chordDeg + x));
        let dp = sec.drums === 'build' ? DRUMS['build' + Math.min(3, Math.floor(b * 4 / sec.bars))] : DRUMS[sec.drums];
        for (let i = 0; i < 16; i++) {
          const t = tb + i * step;
          if (dp.k[i] === 'x') ev.push({ type: 'kick', t, sec: sec.name });
          if (dp.s[i] === 'x') ev.push({ type: 'snare', t, sec: sec.name, vel: sec.drums === 'build' ? 0.4 + 0.6 * (b / sec.bars) : 1 });
          if (dp.h[i] === 'x') ev.push({ type: 'hat', t, sec: sec.name, vel: i % 4 === 2 ? 1 : 0.6 });
        }
        if (sec.crash && b === 0) ev.push({ type: 'crash', t: tb, sec: sec.name });
        if (sec.riser && b === 0) ev.push({ type: 'riser', t: tb, dur: sec.bars * barLen, sec: sec.name });
        if (sec.pad) ev.push({ type: 'pad', t: tb, dur: barLen, notes: chord, sec: sec.name });
        if (sec.stabs) {
          const pat = 'x..x..x...x..x..';
          for (let i = 0; i < 16; i++) if (pat[i] === 'x') ev.push({ type: 'stab', t: tb + i * step, dur: step * 2.2, notes: chord.map((m) => m + 12), sec: sec.name });
        }
        if (sec.bass) {
          const broot = deg(s, chordDeg) - 24;
          for (let i = 0; i < 16; i += 2) {
            if (sec.bass === 1 && s.style !== 'chip' && i % 4 === 0 && s.style === 'future') { ev.push({ type: 'bass', t: tb + i * step, dur: step * 3.5, midi: broot, sec: sec.name }); continue; }
            if (sec.bass === 1 && s.style === 'future') continue;
            const oct = sec.bass === 2 && i % 4 === 2 ? 12 : 0;
            ev.push({ type: 'bass', t: tb + i * step, dur: step * 1.7, midi: broot + oct, sec: sec.name });
          }
        }
        if (sec.arp) {
          const order = [0, 1, 2, 1];
          for (let i = 0; i < 16; i++) {
            const m = chord[order[i % 4]] + (s.style === 'chip' ? 12 : 12) + (i >= 8 && s.style === 'chip' ? 12 : 0);
            ev.push({ type: 'arp', t: tb + i * step, dur: step * 0.8, midi: m, sec: sec.name });
          }
        }
        if (sec.lead) {
          const line = s.mel[sec.lead][b % 4];
          for (let i = 0; i < 16; i++) {
            const c = line[i];
            if (c === '-' || c === '.') continue;
            let n = 1; while (i + n < 16 && line[i + n] === '-') n++;
            const d = parseDeg(c);
            ev.push({ type: 'lead', t: tb + i * step, dur: n * step, midi: deg(s, d) + 12, deg: d, sec: sec.name, steps: n });
          }
        }
      }
    }
    ev.sort((a, b) => a.t - b.t);
    return { events: ev, sections, length: T0 + bar * barLen, beat, barLen };
  }

  // ---------- render audio ----------
  // Each distinct sound (e.g. "lead note A4, 3 steps long") is synthesised once with Web Audio,
  // then the song is mixed in plain JS (sidechain, delay, reverb, limiter). Much faster than one giant graph.
  const BUS = { kick: 'drum', snare: 'drum', hat: 'drum', crash: 'drum', riser: 'fx', pad: 'music', stab: 'music', bass: 'music', arp: 'music', lead: 'music' };
  function keyOf(e) { return [e.type, e.midi || '', e.notes ? e.notes.join(',') : '', e.dur ? Math.round(e.dur * 1000) : ''].join('|'); }
  function tailOf(e) { return { kick: 0.6, snare: 0.4, hat: 0.1, crash: 2, riser: 0.1, pad: 1.6, stab: 0.5, bass: 0.3, arp: 0.3, lead: 0.8 }[e.type]; }

  function synth(ctx, s, c, e, t, out, noise, pulse) {
    const env = (g, t, a, peak, d, sus, rel, end) => {
      g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(peak, t + a);
      g.setTargetAtTime(peak * sus, t + a, d); g.setValueAtTime(peak * sus, Math.max(t + a, end)); g.setTargetAtTime(0.0001, Math.max(t + a, end), rel);
    };
    const osc = (type, f, t, end, dest, detune) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end); return o; };
    switch (e.type) {
      case 'kick': {
        const g = ctx.createGain(); g.connect(out);
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(s.style === 'chip' ? 220 : 160, t); o.frequency.exponentialRampToValueAtTime(s.style === 'chip' ? 50 : 42, t + 0.12);
        g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + (s.style === 'future' ? 0.55 : 0.38));
        o.connect(g); o.start(t); o.stop(t + 0.6);
        const cl = ctx.createBufferSource(); cl.buffer = noise; const cg = ctx.createGain(); cg.gain.setValueAtTime(0.25, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
        cl.connect(cg); cg.connect(out); cl.start(t, 0.3); cl.stop(t + 0.02);
        break;
      }
      case 'snare': {
        const n = ctx.createBufferSource(); n.buffer = noise; const f = ctx.createBiquadFilter(); f.type = s.style === 'chip' ? 'highpass' : 'bandpass'; f.frequency.value = s.style === 'chip' ? 1500 : 1800; f.Q.value = 0.7;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + (s.style === 'future' ? 0.3 : 0.18));
        n.connect(f); f.connect(g); g.connect(out); n.start(t, 0.7); n.stop(t + 0.35);
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
        const og = ctx.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.12);
        break;
      }
      case 'hat': {
        const n = ctx.createBufferSource(); n.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        n.connect(f); f.connect(g); g.connect(out); n.start(t, 1.1); n.stop(t + 0.06);
        break;
      }
      case 'crash': {
        const n = ctx.createBufferSource(); n.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        n.connect(f); f.connect(g); g.connect(out); n.loop = true; n.start(t); n.stop(t + 1.9);
        break;
      }
      case 'riser': {
        const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
        f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(9000, t + e.dur);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.25, t + e.dur - 0.05); g.gain.linearRampToValueAtTime(0, t + e.dur);
        n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + e.dur);
        break;
      }
      case 'pad': {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = s.style === 'future' ? 1800 : 1300; f.Q.value = 0.5;
        const g = ctx.createGain(); env(g.gain, t, 0.25, 0.05, 0.4, 0.8, 0.3, t + e.dur - 0.1);
        f.connect(g); g.connect(out);
        for (const m of e.notes) for (const dt of [-9, 9]) osc('sawtooth', mtof(m), t, t + e.dur + 1.5, f, dt);
        break;
      }
      case 'stab': {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(1200, t + e.dur);
        const g = ctx.createGain(); env(g.gain, t, 0.005, 0.07, 0.12, 0.6, 0.05, t + e.dur);
        f.connect(g); g.connect(out);
        for (const m of e.notes) for (const dt of [-14, 0, 14]) osc('sawtooth', mtof(m), t, t + e.dur + 0.4, f, dt);
        break;
      }
      case 'bass': {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(s.style === 'future' ? 300 : 900, t); f.frequency.exponentialRampToValueAtTime(220, t + e.dur);
        const g = ctx.createGain(); env(g.gain, t, 0.005, s.style === 'future' ? 0.5 : 0.32, 0.1, 0.7, 0.03, t + e.dur);
        f.connect(g); g.connect(out);
        if (s.style === 'chip') osc('triangle', mtof(e.midi + 12), t, t + e.dur + 0.2, f);
        else if (s.style === 'future') osc('sine', mtof(e.midi), t, t + e.dur + 0.2, g);
        else { osc('sawtooth', mtof(e.midi), t, t + e.dur + 0.2, f, -6); osc('square', mtof(e.midi - 12), t, t + e.dur + 0.2, f); }
        break;
      }
      case 'arp': {
        const g = ctx.createGain(); env(g.gain, t, 0.003, s.style === 'chip' ? 0.05 : 0.04, 0.06, 0.3, 0.03, t + e.dur);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = s.style === 'chip' ? 6000 : 2600;
        f.connect(g); g.connect(out);
        if (s.style === 'chip') { const o = ctx.createOscillator(); o.setPeriodicWave(pulse); o.frequency.value = mtof(e.midi); o.connect(f); o.start(t); o.stop(t + e.dur + 0.2); }
        else osc(s.style === 'future' ? 'triangle' : 'square', mtof(e.midi), t, t + e.dur + 0.2, f);
        break;
      }
      case 'lead': {
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(s.style === 'chip' ? 8000 : 5000, t); f.frequency.setTargetAtTime(s.style === 'chip' ? 6000 : 2200, t, 0.15);
        f.connect(g); g.connect(out);
        const end = t + e.dur * 0.92;
        if (s.style === 'chip') {
          env(g.gain, t, 0.002, 0.09, 0.2, 0.75, 0.02, end);
          const o = ctx.createOscillator(); o.setPeriodicWave(pulse); o.frequency.value = mtof(e.midi);
          if (e.dur > 0.3) { const lfo = ctx.createOscillator(); lfo.frequency.value = 6; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(12, t + e.dur); lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(end + 0.2); }
          o.connect(f); o.start(t); o.stop(end + 0.2);
        } else if (s.style === 'future') {
          env(g.gain, t, 0.004, 0.13, 0.25, 0.45, 0.12, end);
          osc('triangle', mtof(e.midi), t, end + 0.6, f); osc('sine', mtof(e.midi + 12), t, end + 0.6, f);
          osc('sawtooth', mtof(e.midi), t, end + 0.6, f, 7);
        } else {
          env(g.gain, t, 0.01, 0.075, 0.3, 0.7, 0.08, end);
          osc('sawtooth', mtof(e.midi), t, end + 0.5, f, -8); osc('sawtooth', mtof(e.midi), t, end + 0.5, f, 8); osc('square', mtof(e.midi - 12), t, end + 0.5, f);
        }
        break;
      }
    }
  }

  async function render(s) {
    const c = compose(s);
    const sr = 44100;
    // 1) collect distinct sounds and lay them out one after another
    const slots = new Map(); let pos = 0;
    for (const e of c.events) { const k = keyOf(e); if (slots.has(k)) continue; const len = (e.dur || 0) + tailOf(e); slots.set(k, { e, start: Math.round(pos * sr), len: Math.round(len * sr) }); pos += len + 0.05; }
    const ctx = new OfflineAudioContext(1, Math.ceil(pos * sr) + sr, sr);
    const noise = ctx.createBuffer(1, sr * 2, sr); { const d = noise.getChannelData(0); let seed = 7; for (let i = 0; i < d.length; i++) { seed = (seed * 16807) % 2147483647; d[i] = seed / 1073741823.5 - 1; } }
    const pulse = (() => { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25); return ctx.createPeriodicWave(re, im); })();
    for (const sl of slots.values()) synth(ctx, s, c, { ...sl.e }, sl.start / sr, ctx.destination, noise, pulse);
    const bank = (await ctx.startRendering()).getChannelData(0);

    // 2) mix into buses
    const N = Math.ceil((c.length + 2.5) * sr);
    const drum = new Float32Array(N), music = new Float32Array(N), fx = new Float32Array(N), dlSend = new Float32Array(N), rvSend = new Float32Array(N);
    const sendDl = { lead: 0.3, arp: 0.35 }, sendRv = { lead: 0.35, pad: 0.5, stab: 0.3, snare: 0.25, crash: 0.3, arp: 0.2 };
    const rvMul = s.style === 'chip' ? 0.35 : 1;
    for (const e of c.events) {
      const sl = slots.get(keyOf(e)), at = Math.round(e.t * sr), vel = e.vel || 1;
      const bus = BUS[e.type], dst = bus === 'drum' ? drum : bus === 'fx' ? fx : music;
      const dS = (sendDl[e.type] || 0) * vel, rS = (sendRv[e.type] || 0) * rvMul * vel;
      const n = Math.min(sl.len, N - at);
      for (let i = 0; i < n; i++) {
        const v = bank[sl.start + i] * vel; dst[at + i] += v;
        if (dS) dlSend[at + i] += v * dS / vel;
        if (rS) rvSend[at + i] += v * rS / vel;
      }
    }
    // 3) sidechain pumping on the music bus
    const depth = s.style === 'future' ? 0.15 : s.style === 'chip' ? 0.7 : 0.4;
    const kicks = c.events.filter((e) => e.type === 'kick').map((e) => Math.round(e.t * sr));
    const tau = c.beat * 0.22 * sr;
    let ki = 0, last = -1e9;
    for (let i = 0; i < N; i++) {
      while (ki < kicks.length && kicks[ki] <= i) last = kicks[ki++];
      const d = i - last; const gN = d < 0 ? 1 : 1 - (1 - depth) * Math.exp(-d / tau);
      music[i] *= gN; rvSend[i] *= 0.5 + 0.5 * gN;
    }
    // 4) ping-pong delay
    const L = new Float32Array(N), R = new Float32Array(N);
    const dd = Math.round(c.beat * 0.75 * sr); let lpL = 0, lpR = 0;
    const dL = new Float32Array(N), dR = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const inL = dlSend[i] + (i >= dd ? dR[i - dd] * 0.38 : 0);
      const inR = (i >= dd ? dL[i - dd] * 0.38 : 0);
      lpL += (inL - lpL) * 0.35; lpR += (inR - lpR) * 0.35;
      dL[i] = lpL; dR[i] = lpR;
    }
    // 5) Freeverb-style reverb
    const rv = freeverb(rvSend, sr);
    // 6) sum + limiter
    let peak = 0;
    for (let i = 0; i < N; i++) {
      const dry = drum[i] * 0.9 + music[i] + fx[i];
      L[i] = dry + (i >= dd ? dL[i - dd] : 0) * 0.5 + rv[0][i];
      R[i] = dry + (i >= dd ? dR[i - dd] : 0) * 0.5 + rv[1][i];
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    }
    const gain = 1.25 / Math.max(0.1, peak);
    const buffer = AE.ctx.createBuffer(2, N, sr);
    const oL = buffer.getChannelData(0), oR = buffer.getChannelData(1);
    for (let i = 0; i < N; i++) { oL[i] = Math.tanh(L[i] * gain) * 0.92; oR[i] = Math.tanh(R[i] * gain) * 0.92; }
    return { buffer, ...c };
  }

  function freeverb(input, sr) {
    const N = input.length, k = sr / 44100;
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
    const out = [new Float32Array(N), new Float32Array(N)];
    for (let ch = 0; ch < 2; ch++) {
      const o = out[ch], spread = ch * 23;
      for (const cl of combs) {
        const len = Math.round((cl + spread) * k), buf = new Float32Array(len); let idx = 0, f = 0;
        for (let i = 0; i < N; i++) { const y = buf[idx]; f = y * 0.8 + f * 0.2; buf[idx] = input[i] * 0.015 + f * 0.86; o[i] += y; if (++idx >= len) idx = 0; }
      }
      for (const al of aps) {
        const len = Math.round((al + spread) * k), buf = new Float32Array(len); let idx = 0;
        for (let i = 0; i < N; i++) { const b = buf[idx], x = o[i]; o[i] = -x + b; buf[idx] = x + b * 0.5; if (++idx >= len) idx = 0; }
      }
    }
    return out;
  }
  const cache = {};
  async function load(id, onProgress) {
    if (cache[id]) return cache[id];
    const s = LIST.find((x) => x.id === id);
    const r = await render(s, onProgress);
    cache[id] = { def: s, ...r };
    return cache[id];
  }

  return { LIST, load, compose };
})();
