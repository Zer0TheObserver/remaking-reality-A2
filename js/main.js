// ===== App: menus, transitions, game loop, HUD, results, chart recorder =====
(function () {
  const $ = (s) => document.querySelector(s);
  const cv = $('#cv'), g = cv.getContext('2d');
  const params = new URLSearchParams(location.search);
  const P = FX.PAL;

  const GAMES = [
    { id: 'piano', cls: PianoGame, chart: 'piano', name: 'Four Lanes', en: 'PIANO-STYLE', glyph: 'g-piano', n: 4, desc: 'Hit each block as it reaches the line. Hold the long ones.', keys: '<kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd>' },
    { id: 'circles', cls: CirclesGame, chart: 'circles', name: 'Circles', en: 'AIM + TIMING', glyph: 'g-circ', n: 3, desc: 'Click the moment the outer ring closes in. Hold and follow sliders.', keys: 'Mouse + <kbd>Z</kbd> <kbd>X</kbd>' },
    { id: 'runner', cls: RunnerGame, chart: 'runner', name: 'Dash', en: 'SIDE-SCROLLER', glyph: 'g-run', n: 2, desc: 'Jump over spikes on the ground. Duck under hanging saws.', keys: '<kbd>Space</kbd> jump · <kbd>↓</kbd> duck' },
  ];

  const S = Object.assign({ game: 'piano', song: 'neon', music: 1, sfx: 'crisp', speed: 1, offset: 0, useRec: true, sfxMute: false },
    (() => { try { return JSON.parse(localStorage.getItem('rhythm-demo-settings')) || {}; } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem('rhythm-demo-settings', JSON.stringify(S)); } catch (e) {} };
  if (params.get('game')) S.game = params.get('game');
  if (params.get('song')) S.song = params.get('song');
  if (params.get('music')) S.music = +params.get('music');

  const app = { g, W: 0, H: 0, particles: new FX.Particles(), energy: 0, flash: 0, shake: 0, auto: params.get('auto') === '1', speed: S.speed, c1: '#FF4122', c2: '#2741FF', state: 'menu', musicOn: true };
  app.time = () => AE.now();
  window.APP = app;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    app.W = window.innerWidth; app.H = window.innerHeight;
    cv.width = Math.round(app.W * dpr); cv.height = Math.round(app.H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();

  // ---------------- menu ----------------
  const allSongs = () => [...Songs.LIST.map((s) => ({ ...s, builtin: true })), ...window.USER_SONGS.map((s) => ({ ...s, user: true }))];
  const curSong = () => allSongs().find((x) => x.id === S.song) || allSongs()[0];
  const avail = {}, songInfo = {};
  function setTheme(def) {
    const r = document.documentElement.style;
    r.setProperty('--a', def.color || '#FF4122'); r.setProperty('--b', def.color2 || '#2741FF');
    const bpm = def.bpm || (songInfo[def.id] && songInfo[def.id].bpm);
    $('#discBpm').textContent = bpm ? Math.round(bpm) : '—';
    metroBpm = bpm || 120;
  }
  function renderGames() {
    $('#games').innerHTML = GAMES.map((gm, i) => `<button class="row ${S.game === gm.id ? 'sel' : ''}" data-id="${gm.id}" style="animation-delay:${i * 0.06}s">
      <span class="no">0${i + 1}</span><span class="glyph ${gm.glyph}">${'<i></i>'.repeat(gm.n)}</span>
      <span><h3>${gm.name}<small>${gm.en}</small></h3><p>${gm.desc}</p></span><span class="keys">${gm.keys}</span><span class="arrow">→</span></button>`).join('');
    document.querySelectorAll('.row').forEach((b) => b.onclick = () => { S.game = b.dataset.id; save(); renderGames(); });
  }
  const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  function renderSongs() {
    $('#songs').innerHTML = allSongs().map((s, i) => {
      let tag, meta;
      if (s.builtin) { const c = Songs.compose(s); tag = '<span class="tag ok">ORIGINAL</span>'; meta = `${s.bpm} BPM · ${fmtDur(c.length)}`; }
      else { tag = avail[s.id] ? '<span class="tag ok">READY</span>' : '<span class="tag need">PICK FILE</span>'; const inf = songInfo[s.id]; meta = inf ? `${Math.round(inf.bpm)} BPM · ${fmtDur(inf.length)}` : (avail[s.id] ? 'AUTO BPM' : '—'); }
      const rec = Charts.getRecorded(s.id) ? ' · custom chart' : '';
      return `<button class="track ${S.song === s.id ? 'sel' : ''}" data-id="${s.id}" style="--c1:${s.color || '#FF4122'};--c2:${s.color2 || '#2741FF'};animation-delay:${i * 0.04}s">
        <span class="sw"></span><span><b>${s.title}</b><small>${s.artist}${rec}</small></span><span class="meta">${meta}</span>${tag}</button>`;
    }).join('');
    document.querySelectorAll('.track').forEach((b) => b.onclick = () => {
      S.song = b.dataset.id; save(); renderSongs(); updateHint(); setTheme(curSong());
      const def = curSong();
      if (def.user && !avail[def.id]) $('#filePick').click();
    });
  }
  async function checkUserSongs() {
    for (const s of window.USER_SONGS) avail[s.id] = await UserAudio.has(s);
    renderSongs(); updateHint();
  }
  $('#filePick').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const def = window.USER_SONGS.find((x) => x.id === S.song); if (!def) return;
    AE.init(); await wipeIn('ANALYSING BEATS');
    try { const s = await UserAudio.load(def, await f.arrayBuffer()); avail[def.id] = true; songInfo[def.id] = { bpm: s.bpm, length: s.length }; }
    catch (err) { alert('Could not read this audio file: ' + err.message); }
    renderSongs(); updateHint(); setTheme(def); wipeOut();
  };
  function renderModes() {
    const sw = $('#modeSwitch'); sw.classList.toggle('on', !!S.music);
    sw.querySelectorAll('button').forEach((b) => b.onclick = () => { S.music = +b.dataset.music; save(); renderModes(); });
  }
  function bindSettings() {
    const sp = $('#speed'), of = $('#offset');
    $('#sfx').value = S.sfx; sp.value = S.speed; of.value = S.offset; $('#useRec').checked = S.useRec; $('#sfxMute').checked = S.sfxMute;
    const upd = () => { $('#speedV').textContent = (+sp.value).toFixed(1) + '×'; $('#offV').textContent = (+of.value > 0 ? '+' : '') + of.value + 'ms'; };
    upd();
    $('#sfx').onchange = (e) => { S.sfx = e.target.value; save(); AE.init(); AE.sfxStyle = S.sfx; const m = AE.musicOn; AE.musicOn = true; AE.hit('hit'); AE.musicOn = m; };
    sp.oninput = () => { S.speed = +sp.value; save(); upd(); };
    of.oninput = () => { S.offset = +of.value; save(); upd(); };
    $('#useRec').onchange = (e) => { S.useRec = e.target.checked; save(); };
    $('#sfxMute').onchange = (e) => { S.sfxMute = e.target.checked; save(); };
  }
  function updateHint() {
    const def = curSong(), h = $('#hint');
    if (def && def.user && !avail[def.id]) h.innerHTML = `Can't find <kbd>${def.file}</kbd>. Put the MP3 in the songs folder and run <b>pack-songs.bat</b>, or click the track to pick the file.`;
    else h.innerHTML = 'Suggested: play in <b>SILENT</b> first → switch to <b>SOUND</b> from the results screen → compare. Press <kbd>Esc</kbd> to pause.';
  }
  // menu metronome (purely decorative)
  let metroBpm = 120, metroLast = -1;
  function metroTick() {
    if (app.state !== 'menu') return;
    const beat = 60 / metroBpm, b = Math.floor(performance.now() / 1000 / beat);
    if (b !== metroLast) { metroLast = b; document.querySelectorAll('#metro i').forEach((el, i) => el.classList.toggle('on', i === b % 4)); }
  }

  function showScreen(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('show', s.id === id)); }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function wipeIn(msg) { const w = $('#wipe'); $('#loadMsg').textContent = msg || 'LOADING'; w.classList.remove('out'); void w.offsetWidth; w.classList.add('in'); await sleep(520); }
  function wipeOut() { const w = $('#wipe'); w.classList.remove('in'); w.classList.add('out'); setTimeout(() => w.classList.remove('out'), 650); }

  // ---------------- start a run ----------------
  let game = null, song = null, chart = null, lastFrame = performance.now(), recording = null, leadIn = 3;
  async function loadSong() {
    const def = curSong();
    if (def.builtin) return await Songs.load(def.id);
    const s = await UserAudio.load(def);
    if (!s) { avail[def.id] = false; return null; }
    songInfo[def.id] = { bpm: s.bpm, length: s.length };
    return s;
  }
  let prefetched = false;
  function prefetch() { if (prefetched) return; prefetched = true; AE.init(); (async () => { for (const s of Songs.LIST) { await Songs.load(s.id); await sleep(50); } })(); }
  document.addEventListener('pointerdown', prefetch, { once: true });
  document.addEventListener('keydown', prefetch, { once: true });

  async function start(opts = {}) {
    AE.init(); AE.sfxStyle = S.sfx; AE.sfxInMute = S.sfxMute; AE.userOffset = S.offset / 1000;
    AE.stop();
    await wipeIn(curSong().builtin ? 'SYNTHESISING' : 'ANALYSING BEATS');
    song = await loadSong();
    if (!song) { showScreen('menu'); renderSongs(); wipeOut(); $('#filePick').click(); return; }
    app.song = song; app.speed = S.speed;
    app.c1 = song.def.color || '#FF4122'; app.c2 = song.def.color2 || '#2741FF';
    setTheme(song.def);
    app.particles = new FX.Particles(); app.flash = 0; app.shake = 0; app.milestone = null; app.outro = null;
    app.score = new FX.Roll(); app.comboPop = 0; app.lastCombo = 0;
    leadIn = Math.max(3.2, song.beat * 4 + 1.5);
    if (opts.record) {
      recording = { notes: [], down: {} };
      game = new Recorder(app, recording); app.game = game;
      app.stats = new FX.Stats(1); app.musicOn = true;
      AE.play(song.buffer, 2.0, true);
      app.state = 'record';
    } else {
      const gm = GAMES.find((x) => x.id === S.game);
      chart = Charts[gm.chart](song, S.useRec);
      app.chart = chart; app.stats = new FX.Stats(chart.total);
      game = new gm.cls(app); app.game = game;
      app.musicOn = !!S.music;
      AE.play(song.buffer, leadIn, !!S.music);
      app.state = 'play';
    }
    showScreen(null); wipeOut();
  }
  app.judge = function (gr, dt) {
    app.stats.add(gr, dt);
    const c = app.stats.combo;
    if (gr !== 'miss' && c > 0 && c % 50 === 0) app.milestone = { t0: performance.now(), n: c };
  };

  // ---------------- finish → outro stamp → results ----------------
  function finish() {
    if (app.state === 'record') return finishRecord();
    app.state = 'outro'; app.outro = { t0: performance.now(), fc: app.stats.c.miss === 0 };
    AE.fadeOut(1.6);
    setTimeout(showResults, 1500);
  }
  async function showResults() {
    await wipeIn('RESULTS');
    AE.stop(); app.state = 'result';
    const r = app.stats.summary();
    const key = `rhythm-demo-res:${S.game}:${S.song}:${S.music}`;
    const other = (() => { try { return JSON.parse(localStorage.getItem(`rhythm-demo-res:${S.game}:${S.song}:${S.music ? 0 : 1}`)); } catch (e) { return null; } })();
    const store = { ...r, offsets: r.offsets.map((o) => Math.round(o * 1000)), when: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(store)); } catch (e) {}
    const gm = GAMES.find((x) => x.id === S.game);
    $('#rMode').innerHTML = `<span class="blink"></span>${S.music ? 'SOUND · WITH MUSIC' : 'SILENT · NO MUSIC'}`;
    $('#rRank').textContent = FX.rank(r.acc);
    $('#rTitle').textContent = song.def.title;
    $('#rSub').textContent = `${gm.name.toUpperCase()} · ${Math.round(song.bpm || song.def.bpm)} BPM${app.stats.c.miss === 0 ? ' · FULL COMBO' : ''}`;
    countUp($('#rScore'), r.score, (v) => String(Math.round(v)).padStart(7, '0'));
    countUp($('#rAcc'), r.acc * 100, (v) => v.toFixed(2) + '%');
    countUp($('#rCombo'), r.maxCombo, (v) => Math.round(v));
    countUp($('#rDev'), r.absMean * 1000, (v) => Math.round(v) + 'ms');
    $('#rCounts').innerHTML = ['perfect', 'great', 'good', 'miss'].map((k) => `<div class="${k === 'miss' ? 'm' : ''}">${FX.LABEL[k]}<b>${r[k]}</b></div>`).join('');
    $('#compare').innerHTML = compareTable(store, other);
    $('#rInsight').innerHTML = insight(store, other);
    $('#swapBtn').innerHTML = S.music ? '<span>Now try</span><b>SILENT</b><i>→</i>' : '<span>Now try</span><b>SOUND</b><i>→</i>';
    showScreen('result');
    animateHisto(store.offsets, other && other.offsets);
    wipeOut();
  }
  function insight(cur, oth) {
    if (!oth) return `<div class="k">NEXT</div><div class="big">Play it again in<br><em>${S.music ? 'SILENT' : 'SOUND'}</em></div><p>Same song, same chart. Only the music is switched ${S.music ? 'off' : 'on'}.</p>`;
    const A = S.music ? oth : cur, B = S.music ? cur : oth;
    const sd = (x) => { const o = x.offsets || []; if (!o.length) return 0; const m = o.reduce((a, b) => a + b, 0) / o.length; return Math.sqrt(o.reduce((a, b) => a + (b - m) * (b - m), 0) / o.length); };
    const dAcc = (B.acc - A.acc) * 100, sA = sd(A), sB = sd(B), stab = sA > 0 ? (sA - sB) / sA * 100 : 0;
    let big;
    if (stab > 3) big = `With music, your timing was <em>${Math.round(stab)}%</em> steadier`;
    else if (dAcc > 0.5) big = `With music, accuracy went <em>+${dAcc.toFixed(1)}%</em>`;
    else if (stab < -3) big = `This time you were <em>steadier</em> without music`;
    else big = `Both runs were <em>about the same</em>`;
    return `<div class="k">SILENT vs SOUND · FINDING</div><div class="big">${big}</div><p>Spread of your timing (standard deviation): ${Math.round(sA)}ms without music → ${Math.round(sB)}ms with music. Smaller means every hit lands closer to the same spot on the beat.</p>`;
  }
  function countUp(el, target, fmt) {
    const t0 = performance.now(), d = 900;
    const step = () => { const k = Math.min(1, (performance.now() - t0) / d); el.textContent = fmt(target * FX.ease.out(k)); if (k < 1) requestAnimationFrame(step); };
    step();
  }
  function compareTable(cur, oth) {
    if (!oth) return `<div class="empty">Play the same song again in ${S.music ? '<b>SILENT</b> (no music)' : '<b>SOUND</b> (with music)'} and a side-by-side comparison will appear here.</div>`;
    const A = S.music ? oth : cur, B = S.music ? cur : oth; // A = silent, B = sound
    const sd = (x) => { const o = x.offsets || []; if (!o.length) return 0; const m = o.reduce((a, b) => a + b, 0) / o.length; return Math.sqrt(o.reduce((a, b) => a + (b - m) * (b - m), 0) / o.length); };
    const rows = [
      ['Accuracy', (x) => x.acc * 100, (v) => v.toFixed(1) + '%', 1, (d) => (d > 0 ? '+' : '') + d.toFixed(1) + '%'],
      ['Avg offset', (x) => x.absMean * 1000, (v) => Math.round(v) + 'ms', -1, (d) => (d > 0 ? '+' : '') + Math.round(d) + 'ms'],
      ['Consistency (σ)', sd, (v) => Math.round(v) + 'ms', -1, (d) => (d > 0 ? '+' : '') + Math.round(d) + 'ms'],
      ['Max combo', (x) => x.maxCombo, (v) => v, 1, (d) => (d > 0 ? '+' : '') + d],
      ['Miss', (x) => x.miss, (v) => v, -1, (d) => (d > 0 ? '+' : '') + d],
    ];
    return `<div class="cmp-head"><span>SAME CHART</span><span>SILENT</span><span>SOUND</span><span>MUSIC EFFECT</span></div>${rows.map(([n, f, fmt, dir, fd], i) => {
      const a = f(A), b = f(B), better = a === b ? 0 : (b - a) * dir > 0 ? 2 : 1;
      return `<div class="cmp-row" style="animation-delay:${0.2 + i * 0.07}s"><span>${n}</span><b class="${better === 1 ? 'win' : ''}">${fmt(a)}</b><b class="${better === 2 ? 'win' : ''}">${fmt(b)}</b><span class="delta ${better === 2 ? '' : 'bad'}">${fd(b - a)}</span></div>`;
    }).join('')}<p>Highlighted = the better run. The only difference between the two runs is the music.</p>`;
  }
  function animateHisto(cur, oth) {
    const c = $('#histo'), h = c.getContext('2d'), W = c.width, H = c.height;
    const bins = 27, range = 135, bw = W / bins;
    const count = (arr) => { const b = new Array(bins).fill(0); for (const o of arr || []) { const i = Math.floor((o + range) / (2 * range) * bins); if (i >= 0 && i < bins) b[i]++; } return b; };
    const bc = count(cur), bo = count(oth), mx = Math.max(1, ...bc, ...bo);
    const A = app.c1, t0 = performance.now();
    const frame = () => {
      const k = Math.min(1, (performance.now() - t0) / 800);
      h.clearRect(0, 0, W, H);
      h.fillStyle = 'rgba(18,18,18,0.06)'; h.fillRect(W / 2 - bw * 1.5, 0, bw * 3, H - 20);
      h.fillStyle = P.ink; h.fillRect(0, H - 20, W, 2); h.fillRect(W / 2 - 1, 0, 2, H - 20);
      for (let i = 0; i < bins; i++) {
        const kk = FX.ease.outBack(FX.clamp(k * 1.6 - Math.abs(i - bins / 2) / bins, 0, 1));
        const v = bc[i] / mx * (H - 36) * kk; h.fillStyle = P.ink; h.fillRect(i * bw + 4, H - 20 - v, bw - 8, v);
      }
      if (oth) {
        h.strokeStyle = A; h.lineWidth = 4; h.beginPath();
        for (let i = 0; i < bins; i++) { const v = bo[i] / mx * (H - 36) * FX.ease.out(k); const y = H - 20 - v; if (i === 0) h.moveTo(0, y); h.lineTo(i * bw, y); h.lineTo((i + 1) * bw, y); }
        h.stroke();
        h.font = `700 20px ${FX.FM}`; h.textAlign = 'left'; h.fillStyle = P.ink; h.fillRect(10, 12, 18, 18); h.fillText('THIS RUN', 36, 28);
        h.fillStyle = A; h.fillRect(170, 19, 26, 4); h.fillText(S.music ? 'SILENT RUN' : 'SOUND RUN', 204, 28);
      }
      h.font = `700 18px ${FX.FM}`; h.fillStyle = P.mute; h.textAlign = 'center';
      for (const ms of [-135, -90, -45, 0, 45, 90, 135]) { h.textAlign = ms === -135 ? 'left' : ms === 135 ? 'right' : 'center'; h.fillText((ms > 0 ? '+' + ms : ms) + (Math.abs(ms) === 135 ? 'ms' : ''), (ms + range) / (2 * range) * W, H - 1); }
      if (k < 1) requestAnimationFrame(frame);
    };
    frame();
  }

  // ---------------- chart recorder ----------------
  class Recorder {
    constructor(app, rec) { this.app = app; this.rec = rec; this.keys = ['KeyD', 'KeyF', 'KeyJ', 'KeyK']; this.fl = [0, 0, 0, 0]; this.endT = app.song.buffer.duration + 0.3; }
    keyDown(code) { const l = this.keys.indexOf(code); if (l < 0 || this.rec.down[l] !== undefined) return; this.rec.down[l] = this.app.time(); this.fl[l] = 1; AE.hit('hit'); this.app.particles.burst(this.x0 + (l + 0.5) * this.lw, this.hy, [FX.PAL.ink, this.app.c1], 8, 400, 0.5, 8, { angle: -Math.PI / 2, spread: 1.4, gravity: 1200 }); }
    keyUp(code) { const l = this.keys.indexOf(code); if (l < 0 || this.rec.down[l] === undefined) return; const t0 = this.rec.down[l], t = this.app.time(); delete this.rec.down[l]; this.rec.notes.push({ t: Math.round(t0 * 1000) / 1000, lane: l, dur: t - t0 > 0.3 ? Math.round((t - t0) * 1000) / 1000 : 0 }); }
    pointerDown(x) { const l = FX.clamp(Math.floor((x - this.x0) / this.lw), 0, 3); this.keyDown(this.keys[l]); this.pl = l; }
    pointerUp() { if (this.pl !== undefined) this.keyUp(this.keys[this.pl]); }
    update(now, dt) { for (let i = 0; i < 4; i++) this.fl[i] = Math.max(0, this.fl[i] - dt * 4); }
    done(now) { return now > this.endT; }
    draw(now) {
      const { W, H } = this.app, lw = this.lw = Math.min(100, W / 7), x0 = this.x0 = W / 2 - lw * 2, hy = this.hy = H * 0.78, A = this.app.c1;
      g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
      g.fillStyle = P.card; g.fillRect(x0, 0, lw * 4, H);
      for (let l = 0; l < 4; l++) {
        if (this.fl[l] > 0) { g.fillStyle = hexA(A, this.fl[l] * 0.4); g.fillRect(x0 + l * lw, 0, lw, hy); }
        g.fillStyle = P.ink; g.font = `700 16px ${FX.FM}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DFJK'[l], x0 + l * lw + lw / 2, hy + 40);
      }
      g.fillStyle = P.ink; g.fillRect(x0 - 2, 0, 2, H); g.fillRect(x0 + lw * 4, 0, 2, H); g.fillRect(x0 - 14, hy - 2, lw * 4 + 28, 4);
      const px = 320;
      for (const n of this.rec.notes) { const y = hy - (now - n.t) * px; if (y < -60) continue; const h = Math.max(14, n.dur * px); g.fillStyle = n.dur ? A : P.ink; g.fillRect(x0 + n.lane * lw + 6, y - h + 7, lw - 12, h); }
      for (const l in this.rec.down) { const y = hy - (now - this.rec.down[l]) * px; g.fillStyle = A; g.fillRect(x0 + l * lw + 6, y, lw - 12, hy - y); }
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = P.ink;
      g.font = `900 34px ${FX.FD}`; g.fillText('REC', 40, 70);
      g.fillStyle = A; g.beginPath(); g.arc(140, 58, 9, 0, Math.PI * 2); if (Math.floor(now * 2) % 2 === 0) g.fill();
      g.fillStyle = P.ink; g.font = `500 15px ${FX.FU}`;
      g.fillText('Tap D F J K along with the music. Hold = long note. Esc to finish.', 40, 104);
      g.fillStyle = P.ink2; g.font = `400 13px ${FX.FU}`; g.fillText('In Dash: D/F → ground spikes (jump) · J/K → hanging saws (duck)', 40, 128);
      g.font = `700 13px ${FX.FM}`; g.fillText(`${String(this.rec.notes.length).padStart(3, '0')} NOTES · ${Math.max(0, now).toFixed(1)} / ${this.app.song.buffer.duration.toFixed(1)}s`, 40, 156);
      this.app.particles.draw(g);
    }
  }
  function finishRecord() {
    app.state = 'recdone'; AE.fadeOut(0.5); setTimeout(() => AE.stop(), 600);
    recording.notes.sort((a, b) => a.t - b.t);
    $('#recInfo').textContent = `Recorded ${recording.notes.length} notes for "${song.def.title}". Once saved, all three games will use this chart (you can turn it off in Settings).`;
    showScreen('recDone');
  }
  $('#recSave').onclick = () => { Charts.saveRecorded(song.def.id, recording.notes); S.useRec = true; $('#useRec').checked = true; save(); toMenu(); };
  $('#recDiscard').onclick = () => toMenu();
  $('#recExport').onclick = () => {
    const blob = new Blob([JSON.stringify({ song: song.def.id, notes: recording.notes }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `chart-${song.def.id}.json`; a.click();
  };
  $('#recImport').onclick = () => $('#jsonPick').click();
  $('#jsonPick').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const j = JSON.parse(await f.text()); recording.notes = j.notes; Charts.saveRecorded(j.song || song.def.id, j.notes); $('#recInfo').textContent = `Imported ${j.notes.length} notes.`; } catch (err) { alert('That JSON file is not a valid chart.'); }
  };

  // ---------------- buttons ----------------
  $('#startBtn').onclick = () => start();
  $('#recBtn').onclick = () => start({ record: true });
  $('#retryBtn').onclick = () => start();
  $('#retryBtn2').onclick = () => { AE.resume(); start(); };
  $('#swapBtn').onclick = () => { S.music = S.music ? 0 : 1; save(); renderModes(); start(); };
  $('#menuBtn').onclick = () => toMenu();
  async function toWatch() { await wipeIn(''); AE.stop(); app.state = 'menu'; game = null; window.__buildWatch(); showScreen('watch'); document.querySelector('#watch').scrollTop = 0; wipeOut(); }
  $('#watchBtn').onclick = toWatch; $('#watchBtn2').onclick = toWatch; $('#watchBack').onclick = () => toMenu();
  window.__toMenu = () => toMenu();
  $('#quitBtn').onclick = () => { AE.resume(); toMenu(); };
  $('#resumeBtn').onclick = () => resume();
  async function toMenu() { await wipeIn(''); AE.stop(); app.state = 'menu'; game = null; renderSongs(); renderModes(); showScreen('menu'); wipeOut(); }
  function pause() { if (app.state !== 'play') return; app.state = 'pause'; AE.pause(); showScreen('pause'); }
  function resume() { app.state = 'play'; AE.resume(); showScreen(null); }

  // ---------------- input ----------------
  const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const live = () => app.state === 'play' || app.state === 'record';
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { if (app.state === 'record') finish(); else if (app.state === 'play') pause(); else if (app.state === 'pause') resume(); return; }
    if (live() && game) { if (GAME_KEYS.includes(e.code)) e.preventDefault(); if (!e.repeat) game.keyDown(e.code); }
    else if (app.state === 'menu' && e.code === 'Enter') start();
  });
  window.addEventListener('keyup', (e) => { if (live() && game && game.keyUp) game.keyUp(e.code); });
  cv.addEventListener('pointerdown', (e) => { if (live() && game && game.pointerDown) { e.preventDefault(); game.pointerDown(e.clientX, e.clientY, e.pointerId); } });
  window.addEventListener('pointerup', (e) => { if (game && game.pointerUp) game.pointerUp(e.pointerId); });
  window.addEventListener('pointermove', (e) => { if (game && game.pointerMove) game.pointerMove(e.clientX, e.clientY); });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ---------------- HUD ----------------
  function hud(now, dt) {
    const { W, H } = app, st = app.stats, len = song.buffer.duration, A = app.c1;
    const onInk = S.game === 'runner';
    g.save(); g.textBaseline = 'alphabetic';
    // mode chip with live equaliser
    const chipW = 118, chipH = 34, cx = 22, cy = 20;
    g.fillStyle = app.musicOn ? P.ink : P.card; g.strokeStyle = P.ink; g.lineWidth = 2;
    FX.roundRect(g, cx, cy, chipW, chipH, 17); g.fill(); g.stroke();
    for (let i = 0; i < 4; i++) { const v = app.musicOn && AE.spectrum ? AE.spectrum[3 + i * 6] / 255 : 0; const h = 3 + v * v * 16; g.fillStyle = app.musicOn ? (i === 0 ? A : P.paper) : P.ink; g.fillRect(cx + 16 + i * 6, cy + chipH / 2 + 8 - h, 3, h); }
    g.font = `700 13px ${FX.FD}`; g.fillStyle = app.musicOn ? P.paper : P.ink; g.textAlign = 'left'; g.fillText(app.musicOn ? 'SOUND' : 'SILENT', cx + 48, cy + 22);
    g.fillStyle = P.ink; g.font = `700 15px ${FX.FD}`; g.fillText(song.def.title, cx + chipW + 16, cy + 15);
    g.font = `400 11px ${FX.FM}`; g.fillStyle = P.ink2; g.fillText(`${Math.round(song.bpm || song.def.bpm)} BPM · ESC TO PAUSE`, cx + chipW + 16, cy + 31);
    // score: dim leading zeros
    const sc = app.score.step(Math.min(1000000, st.score), dt), s = String(sc).padStart(7, '0');
    const firstSig = s.search(/[1-9]/), lead = firstSig < 0 ? s : s.slice(0, firstSig), rest = firstSig < 0 ? '' : s.slice(firstSig);
    g.font = `900 28px ${FX.FD}`; g.textAlign = 'right';
    const rw = g.measureText(rest).width;
    g.fillStyle = P.ink; g.fillText(rest, W - 24, 46); g.fillStyle = 'rgba(18,18,18,0.22)'; g.fillText(lead, W - 24 - rw, 46);
    g.font = `700 12px ${FX.FM}`; g.fillStyle = P.ink; g.fillText((st.acc * 100).toFixed(2) + '%', W - 24, 66);
    g.fillStyle = 'rgba(18,18,18,0.15)'; g.fillRect(W - 24 - 120, 74, 120, 3); g.fillStyle = A; g.fillRect(W - 24 - 120, 74, 120 * st.acc, 3);
    // progress line
    const pk = FX.clamp(now / len, 0, 1);
    g.fillStyle = onInk ? 'rgba(236,232,223,0.25)' : 'rgba(18,18,18,0.15)'; g.fillRect(0, H - 3, W, 3);
    g.fillStyle = A; g.fillRect(0, H - 3, W * pk, 3);
    // combo (four-lanes shows its own)
    if (S.game !== 'piano' && st.combo > 1) {
      if (st.combo > app.lastCombo) app.comboPop = 1; app.comboPop = Math.max(0, app.comboPop - dt * 5);
      const sz = 56 * (1 + app.comboPop * 0.15);
      g.textAlign = 'left'; g.font = `900 ${sz}px ${FX.FD}`;
      if (app.comboPop > 0.3) { g.fillStyle = A; g.fillText(st.combo, 28 + 4, H - 34 + 4); }
      g.fillStyle = onInk ? P.paper : P.ink; g.fillText(st.combo, 28, H - 34);
      g.font = `700 11px ${FX.FM}`; g.fillText('COMBO', 30, H - 18);
    }
    app.lastCombo = st.combo;
    g.restore();
    if (now < 0) intro(now);
    if (app.milestone) milestone();
  }
  // kinetic title card, then a beat-synced 3-2-1
  function intro(now) {
    const { W, H } = app, A = app.c1, beat = song.beat || 0.5, t = now + leadIn, cdStart = -beat * 3;
    g.save();
    const cardEnd = leadIn + cdStart - 0.05;
    if (t < cardEnd) {
      const k = t / cardEnd, inK = FX.ease.out(FX.clamp(k / 0.3, 0, 1)), outK = FX.ease.inOut(FX.clamp((k - 0.82) / 0.18, 0, 1));
      const bh = H * 0.34, by = H * 0.33;
      g.fillStyle = P.ink; g.fillRect(-W * (1 - inK) + W * outK, by, W, bh);
      g.fillStyle = A; g.fillRect(-W * (1 - FX.ease.out(FX.clamp((k - 0.08) / 0.3, 0, 1))) + W * outK, by + bh, W, 10);
      g.save(); g.beginPath(); g.rect(0, by, W, bh); g.clip();
      const title = song.def.title.toUpperCase();
      let fs = Math.min(bh * 0.5, W * 0.11); g.font = `900 ${fs}px ${FX.FD}`;
      while (g.measureText(title).width > W * 0.85 && fs > 20) { fs -= 4; g.font = `900 ${fs}px ${FX.FD}`; }
      const tx = W * 0.07 + (1 - FX.ease.out(FX.clamp((k - 0.1) / 0.35, 0, 1))) * W * 0.5 + W * outK * 1.2;
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = P.paper; g.fillText(title, tx, by + bh * 0.62);
      g.font = `700 ${Math.round(fs * 0.17 + 8)}px ${FX.FM}`; g.fillStyle = A;
      const gm = GAMES.find((x) => x.id === S.game);
      g.fillText(`${gm.name.toUpperCase()} · ${Math.round(song.bpm || song.def.bpm)} BPM · ${app.musicOn ? 'SOUND ON' : 'SILENT — NO MUSIC'}`, tx, by + bh * 0.84);
      g.restore();
    } else if (now < 0) {
      const n = Math.ceil(-now / beat), ph = 1 - ((-now) % beat) / beat;
      const sz = H * 0.3 * (1.25 - 0.25 * FX.ease.outBack(FX.clamp(ph * 3, 0, 1)));
      g.globalAlpha = 1 - ph * 0.6; g.font = `900 ${sz}px ${FX.FD}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = A; g.fillText(n, W / 2 + 8, H * 0.45 + 8);
      g.lineWidth = 3; g.strokeStyle = P.ink; g.fillStyle = P.paper; g.fillText(n, W / 2, H * 0.45); g.strokeText(n, W / 2, H * 0.45);
      g.globalAlpha = 1; g.strokeStyle = P.ink; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H * 0.45, H * 0.22 * (1 - ph) + 20, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
  function milestone() {
    const { W, H } = app, m = app.milestone, k = (performance.now() - m.t0) / 1100;
    if (k >= 1) { app.milestone = null; return; }
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.12);
    const inK = FX.ease.out(FX.clamp(k / 0.25, 0, 1)), outK = FX.ease.inOut(FX.clamp((k - 0.7) / 0.3, 0, 1));
    const bh = 64, w = W * 1.6;
    g.fillStyle = app.c1; g.fillRect(-w / 2, -bh / 2, w, bh * inK * (1 - outK));
    g.beginPath(); g.rect(-w / 2, -bh / 2, w, bh * inK * (1 - outK)); g.clip();
    g.fillStyle = FX.onColor(app.c1); g.font = `900 30px ${FX.FD}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const txt = `${m.n} COMBO ✦ `, tw = g.measureText(txt).width, off = (k * 900) % tw;
    for (let x = -w / 2 - off; x < w / 2; x += tw) g.fillText(txt, x, 2);
    g.restore();
  }
  function outro() {
    const { W, H } = app, o = app.outro, k = FX.clamp((performance.now() - o.t0) / 600, 0, 1);
    const txt = o.fc ? 'FULL COMBO' : 'CLEAR';
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.06); g.scale(1.6 - 0.6 * FX.ease.outBack(k), 1.6 - 0.6 * FX.ease.outBack(k)); g.globalAlpha = k;
    let fs = Math.min(W * 0.12, 130); g.font = `900 ${fs}px ${FX.FD}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const tw = g.measureText(txt).width;
    g.fillStyle = P.ink; g.fillRect(-tw / 2 - 30, -fs * 0.7, tw + 60, fs * 1.4);
    g.fillStyle = app.c1; g.fillText(txt, 6, 6); g.fillStyle = P.paper; g.fillText(txt, 0, 0);
    g.restore();
  }

  // ---------------- main loop ----------------
  function frame() {
    requestAnimationFrame(frame);
    const nowP = performance.now(), dt = Math.min(0.05, (nowP - lastFrame) / 1000); lastFrame = nowP;
    metroTick();
    if (!game || app.state === 'menu') { g.fillStyle = P.paper; g.fillRect(0, 0, app.W, app.H); return; }
    const now = AE.now();
    const isLive = live() || app.state === 'outro';
    app.energy = isLive && app.musicOn ? AE.updateEnergy() : app.energy * 0.9;
    if (isLive) { if (app.state !== 'outro') game.update(now, dt); app.particles.update(dt); }
    game.draw(now, dt);
    if (app.state === 'play' || app.state === 'pause' || app.state === 'outro') hud(now, dt);
    if (app.state === 'outro') outro();
    app.shake = Math.max(0, app.shake - dt);
    if (live() && game.done(now)) finish();
  }

  renderGames(); renderSongs(); renderModes(); bindSettings(); updateHint(); setTheme(curSong()); checkUserSongs();
  requestAnimationFrame(frame);
  window.__start = start;
})();
