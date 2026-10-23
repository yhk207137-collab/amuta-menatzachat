/* Hero stage: hands from every country drop real banknotes into the box (same cut-outs as the video). */
(function () {
  const cv = document.querySelector('[data-stage]');
  if (!cv) return;
  const x = cv.getContext('2d');
  const NAVY = '#0A1E3C', CYAN = '#5CE1E6', TEAL = '#00A4BA';
  // world = poster pixels; the stage shows this window of it
  const VX = 60, VY = 520, VW = 835, VH = 1070;
  const SLOT = [453, 1209];
  const NOTES = [
    { w: 283, h: 153, cx: 324.5, cy: 851, ang: .5253, sym: '₪' },
    { w: 317, h: 149, cx: 647, cy: 891, ang: -.5215, sym: '$' },
    { w: 272, h: 154, cx: 337.5, cy: 1077.5, ang: .4455, sym: '€' },
    { w: 244, h: 133, cx: 642.5, cy: 1122.5, ang: -.3127, sym: '£' },
  ];
  const HANDS = [
    { x0: 0, y0: 530, dir: [-1, -.35] }, { x0: 700, y0: 540, dir: [1, -.35] },
    { x0: 0, y0: 850, dir: [-1, .25] }, { x0: 690, y0: 930, dir: [1, .25] },
  ];
  const CHIPS = [['מישראל', [300, 700]], ['מארה״ב', [690, 650]], ['מאירופה', [310, 885]], ['מאנגליה', [610, 955]]];
  const BOX = { x0: 170, y0: 1168 };

  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eOut = p => 1 - Math.pow(1 - p, 3), eIn = p => p * p * p;
  const eIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const eBack = p => { const s = 1.9; return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };

  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  let img = null;
  Promise.all([
    ...[0, 1, 2, 3].map(i => load(`assets/note${i}.webp`)),
    ...[0, 1, 2, 3].map(i => load(`assets/hand${i}.webp`)),
    load('assets/box.webp'),
  ]).then(a => { img = { notes: a.slice(0, 4), hands: a.slice(4, 8), box: a[8] }; start(); });

  let S = 1, dpr = 1;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    S = cv.width / VW;
  }
  const world = () => x.setTransform(S, 0, 0, S, -VX * S, -VY * S);
  const screen = () => x.setTransform(1, 0, 0, 1, 0, 0);

  function drawNote(i, cx, cy, ang, sc, shadow = true) {
    const N = NOTES[i]; x.save(); x.translate(cx, cy); x.rotate(ang); x.scale(sc, sc);
    if (shadow) { x.shadowColor = 'rgba(10,30,60,.25)'; x.shadowBlur = 22 * S; x.shadowOffsetY = 10 * S; }
    x.drawImage(img.notes[i], -N.w / 2, -N.h / 2, N.w, N.h); x.restore();
  }
  const SC_IN = .56;
  function flight(i, t, t0, tIn, p0, a0, sc0, chip) {
    if (t < t0 || t > tIn + .05) return;
    const N = NOTES[i], hIn = N.h * SC_IN, tArr = tIn - .28, above = [SLOT[0], SLOT[1] - hIn / 2 - 6];
    if (t < tArr) {
      const p = eIO(seg(t, t0, tArr)), mid = [lerp(p0[0], above[0], .5), Math.min(p0[1], above[1]) - 160], q = 1 - p;
      const px = q * q * p0[0] + 2 * q * p * mid[0] + p * p * above[0], py = q * q * p0[1] + 2 * q * p * mid[1] + p * p * above[1];
      drawNote(i, px, py, lerp(a0, 0, p), lerp(sc0, SC_IN, p));
      if (chip) chipAt(chip, px, py - 110, 1, -1);
    } else {
      const p = eIn(seg(t, tArr, tIn));
      x.save(); x.beginPath(); x.rect(-500, -2000, 2000, SLOT[1] + 2000); x.clip();
      drawNote(i, above[0], above[1] + p * (hIn + 8), 0, SC_IN, false); x.restore();
    }
  }
  function flag(k, px, py, w) {
    const h = w * .66; x.save(); x.translate(px - w / 2, py - h / 2); x.beginPath(); x.roundRect(0, 0, w, h, 4); x.clip();
    if (k === 0) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#0038b8'; x.fillRect(0, h * .12, w, h * .13); x.fillRect(0, h * .75, w, h * .13);
      x.strokeStyle = '#0038b8'; x.lineWidth = w * .035; const r = h * .2, c0 = w / 2, c1 = h / 2;
      [0, Math.PI].forEach(o => { x.beginPath(); for (let q = 0; q < 3; q++) { const an = o - Math.PI / 2 + q * 2 * Math.PI / 3; x[q ? 'lineTo' : 'moveTo'](c0 + Math.cos(an) * r, c1 + Math.sin(an) * r); } x.closePath(); x.stroke(); }); }
    if (k === 1) { for (let s = 0; s < 7; s++) { x.fillStyle = s % 2 ? '#fff' : '#b22234'; x.fillRect(0, s * h / 7, w, h / 7 + 1); } x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, w * .45, h * 4 / 7); }
    if (k === 2) { x.fillStyle = '#003399'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffcc00'; for (let s = 0; s < 12; s++) { const an = s / 12 * Math.PI * 2; x.beginPath(); x.arc(w / 2 + Math.cos(an) * h * .32, h / 2 + Math.sin(an) * h * .32, w * .03, 0, 7); x.fill(); } }
    if (k === 3) { x.fillStyle = '#012169'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = h * .2; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke();
      x.strokeStyle = '#c8102e'; x.lineWidth = h * .08; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke();
      x.fillStyle = '#fff'; x.fillRect(w * .4, 0, w * .2, h); x.fillRect(0, h * .36, w, h * .28); x.fillStyle = '#c8102e'; x.fillRect(w * .44, 0, w * .12, h); x.fillRect(0, h * .4, w, h * .2); }
    x.restore();
  }
  // chip in world coords: [label, flagIndex]
  function chipAt([label, fi], wx, wy, p, o = 0) {
    if (p <= 0) return;
    x.save(); x.translate(wx, wy); const sc = lerp(.5, 1, eBack(p)); x.scale(sc, sc); x.globalAlpha = cl(p * 2) * (1 - Math.max(0, o));
    x.font = '900 34px H, Arial'; const tw = x.measureText(label).width, fw = fi >= 0 ? 44 : 0, bw = tw + fw + (fi >= 0 ? 52 : 40), bh = 60;
    x.shadowColor = 'rgba(10,30,60,.22)'; x.shadowBlur = 16 * S; x.shadowOffsetY = 6 * S; x.fillStyle = '#fff';
    x.beginPath(); x.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); x.fill(); x.shadowColor = 'transparent';
    x.strokeStyle = CYAN; x.lineWidth = 3; x.stroke();
    if (fi >= 0) flag(fi, bw / 2 - 20 - fw / 2, 0, fw);
    x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = NAVY;
    x.fillText(label, fi >= 0 ? bw / 2 - 20 - fw - 12 - tw / 2 : 0, 2); x.restore();
  }

  const CYCLE = 7;              // one round of four hands, then a breath
  const HT = [0, 1.5, 3, 4.5];  // hand starts inside the cycle; the note is in at +1.5
  let extra = null;             // the visitor's own note after signing up
  let t0 = null, lastEnter = [];

  function frame(now) {
    if (t0 === null) t0 = now;
    const T = (now - t0) / 1000, t = T % CYCLE, cyc = Math.floor(T / CYCLE);
    screen(); x.clearRect(0, 0, cv.width, cv.height);
    world();
    // glow + floor + shadow
    const fl = 1434;
    const g = x.createRadialGradient(SLOT[0], SLOT[1], 0, SLOT[0], SLOT[1], 560); g.addColorStop(0, 'rgba(92,225,230,.22)'); g.addColorStop(1, 'rgba(92,225,230,0)');
    x.fillStyle = g; x.fillRect(VX, VY, VW, VH);
    const fg = x.createLinearGradient(0, fl, 0, fl + 200); fg.addColorStop(0, '#e6e5e2'); fg.addColorStop(1, 'rgba(239,237,235,0)');
    x.fillStyle = fg; x.fillRect(VX, fl, VW, 300); x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(VX, fl, VW, 2);
    x.save(); x.translate(485, 1572); x.scale(1, .12); const sh = x.createRadialGradient(0, 0, 0, 0, 0, 380); sh.addColorStop(0, 'rgba(0,0,0,.22)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sh; x.fillRect(-400, -400, 800, 800); x.restore();
    // entries this frame (for bounce + pops)
    const entries = HT.map(a => a + 1.5);
    if (extra) entries.push(extra.tIn);
    let b = 0; for (const e of entries) { const d = t - e, d2 = T - e; const dd = extra && e === extra.tIn ? d2 : d; if (dd >= 0 && dd < .5) b += Math.exp(-dd / .12) * Math.cos(dd * 28) * .035; }
    x.save(); x.translate(485, 1570); x.scale(1 + b * .6, 1 - b); x.translate(-485, -1570); x.drawImage(img.box, BOX.x0, BOX.y0, 632, 406); x.restore();
    // hands + notes
    HT.forEach((a, i) => {
      if (t < a - .05 || t > a + 2.2) return;
      const N = NOTES[i], H = HANDS[i];
      const inP = eOut(seg(t, a, a + .45)), outP = eIn(seg(t, a + .8, a + 1.3)), off = (1 - inP) + outP;
      const dx = H.dir[0] * 520 * off, dy = H.dir[1] * 520 * off, rel = a + .7;
      if (t < rel) drawNote(i, N.cx + dx, N.cy + dy, N.ang, 1);
      else flight(i, t, rel, a + 1.5, [N.cx + dx, N.cy + dy], N.ang, 1);
      x.drawImage(img.hands[i], H.x0 + dx, H.y0 + dy);
    });
    if (extra) flight(extra.i, T, extra.t0, extra.tIn, extra.p0, -.3, .9, extra.chip);
    // pops
    entries.forEach((e, k) => {
      const isExtra = extra && k === entries.length - 1, d = (isExtra ? T : t) - e; if (d < 0 || d > .9) return; const p = d / .9;
      const sym = isExtra ? '+1' : '+' + NOTES[k].sym;
      x.save(); x.globalAlpha = 1 - eIn(p); x.translate(SLOT[0], SLOT[1] - 40 - eOut(p) * 170); const s = lerp(.6, 1.1, eOut(cl(p * 3))); x.scale(s, s);
      x.direction = 'ltr'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 62px H, Arial'; x.fillStyle = k % 2 ? TEAL : NAVY; x.fillText(sym, 0, 0); x.restore();
      const q = seg(d, 0, .45); if (q < 1) { x.save(); x.globalAlpha = (1 - q) * .6; x.strokeStyle = CYAN; x.lineWidth = 5; x.beginPath(); x.ellipse(SLOT[0], SLOT[1], 40 + q * 170, 10 + q * 45, 0, 0, 7); x.stroke(); x.restore(); }
    });
    // country chips
    HT.forEach((a, i) => {
      const p = seg(t, a + .3, a + .65), o = eIn(seg(t, a + 1.5, a + 1.8)); if (p <= 0 || o >= 1) return;
      const [label, [wx, wy]] = CHIPS[i]; chipAt([label, i], wx, wy - o * 30, p, o);
    });
    if (extra && T > extra.tIn + 1) extra = null;
    raf = requestAnimationFrame(frame);
  }
  let raf = 0, running = false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function still() { // static composition: the poster moment
    screen(); x.clearRect(0, 0, cv.width, cv.height); world();
    x.drawImage(img.box, BOX.x0, BOX.y0, 632, 406);
    NOTES.forEach((N, i) => drawNote(i, N.cx, N.cy, N.ang, 1));
    img.hands.forEach((h, i) => x.drawImage(h, HANDS[i].x0, HANDS[i].y0));
  }
  function start() {
    size();
    if (reduce) { still(); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }));
    io.observe(cv);
  }
  window.addEventListener('resize', () => { if (!img) return; size(); if (reduce) still(); });

  // after signing up: the visitor's own note flies into the box with their name on a chip
  window.stageCelebrate = function (name) {
    if (!img || reduce || t0 === null) return;
    const T = (performance.now() - t0) / 1000;
    extra = { i: 0, t0: T + .1, tIn: T + 1.3, p0: [VX + VW + 200, VY + 200], chip: [name.split(' ')[0] || name, -1] };
  };
})();
