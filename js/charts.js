// ===== Charts: turn a song's musical events into notes for each game =====
window.Charts = (function () {
  // ---- rhythm points for built-in songs: the melody, and the drums where there is no melody ----
  function builtinPoints(song) {
    const ev = song.events, pts = [];
    const leadSecs = new Set();
    for (const s of song.sections) if (ev.some((e) => e.type === 'lead' && e.t >= s.t && e.t < s.end)) leadSecs.add(s.t);
    for (const s of song.sections) {
      const inSec = ev.filter((e) => e.t >= s.t - 1e-6 && e.t < s.end - 1e-6);
      if (leadSecs.has(s.t)) {
        for (const e of inSec) if (e.type === 'lead') pts.push({ t: e.t, dur: e.dur, midi: e.midi, kind: 'lead', sec: s.name });
      } else if (s.name !== 'outro') {
        let last = -9;
        const hasDrums = inSec.some((e) => e.type === 'kick');
        for (const e of inSec) {
          if (hasDrums && (e.type === 'kick' || e.type === 'snare') && e.t - last >= song.beat * 0.99) { pts.push({ t: e.t, dur: 0, midi: e.type === 'kick' ? 48 : 72, kind: e.type, sec: s.name }); last = e.t; }
          if (!hasDrums && e.type === 'arp' && e.t - last >= song.beat * 0.99) { pts.push({ t: e.t, dur: 0, midi: e.midi, kind: 'arp', sec: s.name }); last = e.t; }
        }
      }
    }
    let lo = 1e9, hi = -1e9; for (const p of pts) { lo = Math.min(lo, p.midi); hi = Math.max(hi, p.midi); }
    for (const p of pts) {
      p.pitch = (p.midi - lo) / Math.max(1, hi - lo);
      const pos = (p.t - 0.05) / song.barLen; p.accent = Math.abs(pos - Math.round(pos)) < 0.01;
      p.beatPos = Math.abs((p.t - 0.05) / song.beat - Math.round((p.t - 0.05) / song.beat)) < 0.01;
    }
    return pts;
  }

  // ---- recorded (hand-made) charts, kept in this browser ----
  const recKey = (id) => 'rhythm-demo-chart:' + id;
  function getRecorded(id) { try { const v = localStorage.getItem(recKey(id)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function saveRecorded(id, notes) { localStorage.setItem(recKey(id), JSON.stringify(notes)); }
  function clearRecorded(id) { localStorage.removeItem(recKey(id)); }

  function pointsFor(song, useRecorded) {
    const rec = useRecorded ? getRecorded(song.def.id) : null;
    if (rec && rec.length) return rec.map((n) => ({ t: n.t, dur: n.dur || 0, lane: n.lane, pitch: n.lane / 3, kind: 'rec' }));
    if (song.user) return song.points.map((p) => ({ ...p }));
    return builtinPoints(song);
  }
  const secAt = (song, t) => { for (const s of song.sections) if (t >= s.t - 1e-6 && t < s.end) return s.name; return ''; };

  // ---- 4-lane piano ----
  function piano(song, useRec) {
    const pts = pointsFor(song, useRec), notes = [], laneFree = [-9, -9, -9, -9];
    let pl = 1, pp = 0.5, pt = -9;
    const beat = song.beat;
    for (const p of pts) {
      let lane;
      if (p.lane !== undefined) lane = p.lane;
      else {
        const d = p.pitch - pp;
        if (pt < 0) lane = p.pitch > 0.5 ? 2 : 1;
        else if (Math.abs(d) < 0.01) lane = p.t - pt < beat * 0.6 ? (pl + (pl < 2 ? 1 : -1)) : pl;
        else lane = pl + (d > 0 ? 1 : -1) * (Math.abs(d) > 0.3 ? 2 : 1);
        if (lane > 3) lane = Math.max(0, 6 - lane);
        if (lane < 0) lane = Math.min(3, -lane);
        if (laneFree[lane] > p.t - 0.06) { let best = -1; for (let k = 0; k < 4; k++) if (laneFree[k] <= p.t - 0.06 && (best < 0 || Math.abs(k - lane) < Math.abs(best - lane))) best = k; if (best < 0) continue; lane = best; }
      }
      const hold = p.dur >= beat * 0.9 ? Math.max(beat * 0.5, p.dur - beat * 0.35) : 0;
      notes.push({ t: p.t, lane, end: hold ? p.t + hold : 0 });
      laneFree[lane] = p.t + hold;
      const sec = p.sec || secAt(song, p.t);
      if (sec === 'drop' && p.accent && p.lane === undefined) {
        const l2 = lane <= 1 ? lane + 2 : lane - 2;
        if (laneFree[l2] <= p.t - 0.06) { notes.push({ t: p.t, lane: l2, end: 0 }); laneFree[l2] = p.t; }
      }
      pl = lane; pp = p.pitch; pt = p.t;
    }
    return { notes: notes.sort((a, b) => a.t - b.t), total: notes.length + notes.filter((n) => n.end).length };
  }

  // ---- osu-like circles & sliders ----
  function circles(song, useRec) {
    const pts = pointsFor(song, useRec), notes = [];
    const beat = song.beat;
    let x = 256, y = 192, ang = -Math.PI / 2, turn = 1, lastEnd = -9, combo = 0, comboIdx = 0, lastBar = -1, k = 0;
    const inB = (px, py) => px > 50 && px < 462 && py > 50 && py < 334;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.t < lastEnd + 0.12) continue;
      const gap = Math.max(0.1, p.t - (notes.length ? notes[notes.length - 1].endT || notes[notes.length - 1].t : p.t - 1));
      const dist = Math.min(230, Math.max(100, 50 + gap * 260));
      if (k % 4 === 0) turn = -turn;
      ang += turn * (0.55 + 0.5 * Math.abs(p.pitch - (pts[i - 1] ? pts[i - 1].pitch : 0.5)) * 2);
      let nx, ny, tries = 0;
      do { nx = x + Math.cos(ang) * dist; ny = y + Math.sin(ang) * dist; if (!inB(nx, ny)) ang += 0.7; tries++; } while (!inB(nx, ny) && tries < 12);
      if (!inB(nx, ny)) { nx = 256 + (Math.random() - 0.5) * 200; ny = 192 + (Math.random() - 0.5) * 150; }
      const bar = Math.floor((p.t - (song.offset || 0.05)) / song.barLen);
      if (bar !== lastBar && (bar % 2 === 0 || combo >= 8)) { comboIdx++; combo = 0; }
      lastBar = bar; combo++;
      const n = { t: p.t, x: nx, y: ny, num: combo, color: comboIdx % 4 };
      const next = pts[i + 1];
      const room = next ? next.t - p.t : 2;
      if (p.dur >= beat * 0.9 && room >= beat * 1.2) {
        const sd = Math.min(p.dur, room) - beat * 0.3;
        const len = Math.min(200, 70 + sd * 110);
        let a2 = ang + turn * 0.5, ex, ey, tr = 0;
        do { ex = nx + Math.cos(a2) * len; ey = ny + Math.sin(a2) * len; if (!inB(ex, ey)) a2 += 0.8; tr++; } while (!inB(ex, ey) && tr < 10);
        if (inB(ex, ey)) {
          const mx = (nx + ex) / 2, my = (ny + ey) / 2, nl = Math.hypot(ex - nx, ey - ny);
          const cx = mx - (ey - ny) / nl * 45 * turn, cy = my + (ex - nx) / nl * 45 * turn;
          n.slider = { cx, cy, ex, ey }; n.endT = p.t + sd; x = ex; y = ey; ang = a2; lastEnd = n.endT;
        }
      }
      if (!n.slider) { x = nx; y = ny; lastEnd = p.t; }
      notes.push(n); k++;
    }
    return { notes, total: notes.length + notes.filter((n) => n.slider).length };
  }

  // ---- side-scrolling runner: low obstacles (jump) and high obstacles (duck) ----
  function runner(song, useRec) {
    const pts = pointsFor(song, useRec), obs = [];
    const beat = song.beat, minGap = Math.max(0.24, beat * 0.49);
    let last = -9, med = 0.5;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.t - last < minGap) continue;
      med = med * 0.85 + p.pitch * 0.15;
      let type;
      if (p.lane !== undefined) type = p.lane <= 1 ? 'low' : 'high';
      else if (p.kind === 'kick') type = 'low';
      else if (p.kind === 'snare') type = 'high';
      else type = p.pitch >= med ? 'high' : 'low';
      let end = 0;
      if (type === 'high' && p.dur >= beat * 1.4) end = p.t + p.dur - beat * 0.4;
      obs.push({ t: p.t, type, end });
      last = end || p.t;
    }
    return { notes: obs, total: obs.length + obs.filter((o) => o.end).length };
  }

  return { piano, circles, runner, getRecorded, saveRecorded, clearRecorded };
})();
