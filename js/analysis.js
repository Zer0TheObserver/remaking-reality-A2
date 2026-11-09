// ===== Loading your own audio files + automatic beat / onset analysis =====
window.UserAudio = (function () {
  // ---- tiny IndexedDB cache so a picked file is remembered ----
  const DB = 'rhythm-demo-audio';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(k) { try { const db = await idb(); return await new Promise((res) => { const q = db.transaction('files').objectStore('files').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch (e) { return null; } }
  async function idbPut(k, v) { try { const db = await idb(); await new Promise((res) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(v, k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) {} }

  async function fetchFile(path) {
    try { const r = await fetch(path); if (!r.ok) return null; return await r.arrayBuffer(); } catch (e) { return null; }
  }

  // Audio packed as a .js file (works when the page is opened by double-clicking, where fetch() is blocked)
  const base = (f) => f.split('/').pop();
  function embedded(def) { return (window.__SONG_EMBEDDED || []).includes(base(def.file)); }
  function loadEmbedded(def) {
    return new Promise((res) => {
      const key = base(def.file);
      const done = () => { const b64 = window.__SONG_DATA && window.__SONG_DATA[key]; if (!b64) return res(null); const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); delete window.__SONG_DATA[key]; res(u.buffer); };
      if (window.__SONG_DATA && window.__SONG_DATA[key]) return done();
      const sc = document.createElement('script'); sc.src = def.file + '.js'; sc.onload = done; sc.onerror = () => res(null); document.head.appendChild(sc);
    });
  }

  const cache = {};
  // returns song object or null if the file couldn't be found
  async function load(def, pickedArrayBuffer) {
    if (cache[def.id] && !pickedArrayBuffer) return cache[def.id];
    let ab = pickedArrayBuffer;
    if (ab) await idbPut(def.id, ab.slice(0));
    if (!ab && embedded(def)) ab = await loadEmbedded(def); // preferred: download managers (e.g. IDM) don't grab .js requests
    if (!ab && location.protocol !== 'file:') ab = await fetchFile(def.file);
    if (!ab) { const c = await idbGet(def.id); if (c) ab = c.slice(0); }
    if (!ab) return null;
    let buf = await AE.ctx.decodeAudioData(ab);
    buf = trim(buf, def.start || 0, def.end || buf.duration);
    const an = analyse(buf, def);
    cache[def.id] = { def, buffer: buf, ...an, user: true };
    return cache[def.id];
  }
  async function has(def) {
    if (cache[def.id] || embedded(def)) return true;
    if (location.protocol !== 'file:') try { const r = await fetch(def.file, { method: 'HEAD' }); if (r.ok) return true; } catch (e) {}
    return !!(await idbGet(def.id));
  }

  function trim(buf, start, end) {
    end = Math.min(end, buf.duration);
    if (start <= 0 && end >= buf.duration - 0.01) return buf;
    const sr = buf.sampleRate, a = Math.floor(start * sr), b = Math.floor(end * sr), n = b - a;
    const out = AE.ctx.createBuffer(buf.numberOfChannels, n, sr);
    const fade = Math.floor(sr * 1.5);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const s = buf.getChannelData(ch).subarray(a, b), d = out.getChannelData(ch); d.set(s);
      for (let i = 0; i < fade && i < n; i++) d[n - 1 - i] *= i / fade;
    }
    return out;
  }

  // ---- FFT ----
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const a = i + j, b = a + len / 2;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }

  // ---- analysis: onset envelope, tempo, phase, rhythm points ----
  function analyse(buf, def) {
    const sr = buf.sampleRate, N = 1024, H = 512;
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const frames = Math.floor((L.length - N) / H);
    const fps = sr / H;
    const flux = new Float32Array(frames), low = new Float32Array(frames), high = new Float32Array(frames);
    const prev = new Float32Array(N / 2);
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    const re = new Float32Array(N), im = new Float32Array(N);
    const lowBin = Math.floor(200 / (sr / N)), midBin = Math.floor(2000 / (sr / N));
    for (let f = 0; f < frames; f++) {
      const o = f * H;
      for (let i = 0; i < N; i++) { re[i] = (L[o + i] + R[o + i]) * 0.5 * win[i]; im[i] = 0; }
      fft(re, im);
      let s = 0, sl = 0, sh = 0;
      for (let k = 1; k < N / 2; k++) {
        const m = Math.log1p(Math.sqrt(re[k] * re[k] + im[k] * im[k]) * 10);
        const d = m - prev[k]; prev[k] = m;
        if (d > 0) { s += d; if (k < lowBin) sl += d; else if (k > midBin) sh += d; }
      }
      flux[f] = s; low[f] = sl; high[f] = sh;
    }
    // normalise onset envelope (subtract local mean)
    const env = new Float32Array(frames); const W = Math.round(fps * 0.4);
    let acc = 0; const pre = new Float32Array(frames + 1); for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + flux[i];
    for (let i = 0; i < frames; i++) { const a = Math.max(0, i - W), b = Math.min(frames, i + W); const m = (pre[b] - pre[a]) / (b - a); env[i] = Math.max(0, flux[i] - m); acc = Math.max(acc, env[i]); }
    for (let i = 0; i < frames; i++) env[i] /= acc || 1;

    const val = (t) => { const x = t * fps, i = Math.floor(x), fr = x - i; if (i < 0 || i + 1 >= frames) return 0; return env[i] * (1 - fr) + env[i + 1] * fr; };
    const peakAt = (t, w) => { let m = 0, a = Math.max(0, Math.floor((t - w) * fps)), b = Math.min(frames - 1, Math.ceil((t + w) * fps)); for (let i = a; i <= b; i++) m = Math.max(m, env[i]); return m; };

    // tempo: autocorrelation over 70..180 BPM
    let bpm = def.bpm;
    if (!bpm) {
      let best = 0, bestLag = 0;
      for (let lag = Math.floor(fps * 60 / 180); lag <= Math.ceil(fps * 60 / 70); lag++) {
        let s = 0; for (let i = 0; i + lag < frames; i++) s += env[i] * env[i + lag];
        const b = 60 * fps / lag; const w = Math.exp(-Math.pow(Math.log2(b / 125), 2) * 1.5);
        s *= w; if (s > best) { best = s; bestLag = lag; }
      }
      bpm = 60 * fps / bestLag;
      // refine with a comb over the whole track
      let bb = bpm, bs = -1;
      for (let c = bpm - 2; c <= bpm + 2; c += 0.02) {
        const beat = 60 / c; let s = 0;
        for (let ph = 0; ph < 1; ph += 0.125) { let q = 0; for (let t = ph * beat; t < buf.duration; t += beat) q += val(t); s = Math.max(s, q); }
        if (s > bs) { bs = s; bb = c; }
      }
      bpm = Math.round(bb * 10) / 10;
      if (Math.abs(bpm - Math.round(bpm)) < 0.25) bpm = Math.round(bpm);
    }
    const beat = 60 / bpm;
    let offset = def.offset;
    if (offset === undefined) {
      let bo = 0, bs = -1;
      for (let ph = 0; ph < beat; ph += 0.002) { let s = 0; for (let t = ph; t < buf.duration; t += beat) s += val(t); if (s > bs) { bs = s; bo = ph; } }
      offset = bo;
    } else offset -= def.start || 0;

    // candidate grid (8ths, plus strong 16ths)
    const pts = [];
    const grid = beat / 4;
    for (let t = offset; t < buf.duration - 1.6; t += grid) {
      const idx = Math.round((t - offset) / grid) % 4;
      const w = idx === 0 ? 1 : idx === 2 ? 0.8 : 0.5;
      const s = peakAt(t, 0.035);
      const fi = Math.round(t * fps); let lo = 0, hi = 0;
      for (let k = fi - 2; k <= fi + 2; k++) if (k >= 0 && k < frames) { lo += low[k]; hi += high[k]; }
      pts.push({ t, s, w, idx, band: hi / (lo + hi + 1e-6) });
    }
    // local normalisation (4 beats), then pick
    const out = []; const span = 16;
    let last = -9;
    for (let i = 0; i < pts.length; i++) {
      let m = 0, n = 0; for (let j = Math.max(0, i - span); j < Math.min(pts.length, i + span); j++) { m += pts[j].s; n++; }
      m /= n;
      const p = pts[i], sc = p.s * p.w, norm = sc / (m + 0.02);
      const minGap = p.idx % 2 === 1 ? beat * 0.5 : Math.max(0.19, beat / 2);
      const thr = p.idx === 0 ? 0.6 : p.idx === 2 ? 0.95 : 1.7;
      if (norm > thr && p.s > 0.04 && p.t - last >= minGap - 1e-4) { out.push({ t: p.t, dur: 0, pitch: p.band, strength: Math.min(1, norm / 3), kind: p.band > 0.5 ? 'snare' : 'kick', accent: p.idx === 0 }); last = p.t; }
    }
    // loudness per bar => "energy" sections
    const barLen = beat * 4;
    const sections = [];
    let lsum = []; for (let t = offset; t < buf.duration; t += barLen) { let s = 0, c = 0; for (let x = t; x < t + barLen; x += 0.05) { s += val(x); c++; } lsum.push(s / c); }
    const sorted = lsum.slice().sort((a, b) => a - b), hiThr = sorted[Math.floor(sorted.length * 0.65)] || 0;
    lsum.forEach((v, i) => sections.push({ name: v >= hiThr ? 'drop' : 'verse', t: offset + i * barLen, end: offset + (i + 1) * barLen }));
    // holds where there's room
    for (let i = 0; i < out.length - 1; i++) {
      const gap = out[i + 1].t - out[i].t;
      if (gap >= beat * 1.5 && i % 3 === 0) out[i].dur = gap - beat * 0.5;
    }
    return { points: out, bpm, beat, barLen, offset, sections, length: buf.duration };
  }

  return { load, has };
})();
