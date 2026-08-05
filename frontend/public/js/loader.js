/* ============================================================
   DERBY LIFESCIENCE — Ultra-premium particle loader
   Canvas particle universe → magnetic convergence into the logo
   → reveal → dissolve → seamless hand-off to the homepage.
   Vanilla JS + Canvas (no framework dependency).
   ============================================================ */
(function () {
  'use strict';

  var loader = document.getElementById('loader');
  if (!loader) return;

  var root = document.documentElement;

  /* ---------- when should the intro play? ----------
     ONLY on a refresh (F5 / Ctrl+R / the reload button).
     Clicking a link, back/forward, and first arrival → skip.

     This reads the navigation TYPE straight from the Navigation Timing API.
     It deliberately does NOT use document.referrer: the server sends
     `Referrer-Policy: no-referrer`, which makes the referrer permanently
     empty, so any same-site check based on it silently fails and the
     loader would play on every page click. It is also deliberately not
     sessionStorage-based — that survives refreshes, which made the loader
     never appear at all. */
  var isReload = false;
  try {
    var navEntries = performance.getEntriesByType ? performance.getEntriesByType('navigation') : null;
    if (navEntries && navEntries.length && navEntries[0].type) {
      isReload = navEntries[0].type === 'reload';
    } else if (performance.navigation) {
      isReload = performance.navigation.type === 1;   // legacy fallback
    }
  } catch (e) {}

  if (!isReload) {                                    // not a refresh → no intro
    if (loader.parentNode) loader.parentNode.removeChild(loader);
    root.classList.add('is-ready');                   // release the hero intro immediately
    return;
  }

  var bar = document.getElementById('loaderBar');
  var canvas = document.getElementById('loaderCanvas');
  var stageEl = loader.querySelector('.loader__stage');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('is-loading');

  /* ---------- timeline (ms) ---------- */
  var T_DARK      = 500;    // background begins deepening to pine
  var T_CONV_IN   = 1200;   // particles start converging
  var T_CONV_OUT  = 2050;   // fully assembled into the logo
  var T_REVEAL    = 2100;   // crisp logo + name + tagline + rings appear
  var MIN_MS      = reduced ? 400 : 2900;
  var EXIT_MS     = reduced ? 150 : 820;
  var SAFETY_MS   = 8000;

  /* progress bar (eases toward 100% across MIN_MS) */
  var pStart = null, done = false, loaded = false, minDone = false;
  function progress(ts) {
    if (pStart === null) pStart = ts;
    var p = Math.min((ts - pStart) / MIN_MS, 1);
    var eased = 1 - Math.pow(1 - p, 2);
    if (bar) bar.style.width = (eased * 100).toFixed(1) + '%';
    if (p < 1 && !done) window.requestAnimationFrame(progress);
  }
  window.requestAnimationFrame(progress);

  /* ---------- scene class toggles ---------- */
  window.setTimeout(function () { loader.classList.add('is-dark'); }, reduced ? 0 : T_DARK);
  window.setTimeout(function () { loader.classList.add('reveal'); }, reduced ? 60 : T_REVEAL);

  /* ---------- completion / hand-off ---------- */
  function finish() {
    if (done) return;
    done = true;
    if (bar) bar.style.width = '100%';
    if (particles) dissolveStart = performance.now();     // burst the network apart
    loader.classList.add('is-done');
    root.classList.add('is-ready');                       // release the hero intro on the page beneath
    window.setTimeout(function () {
      root.classList.remove('is-loading');
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, EXIT_MS);
  }
  function maybeFinish() { if (loaded && minDone) finish(); }
  if (document.readyState === 'complete') { loaded = true; }
  else { window.addEventListener('load', function () { loaded = true; maybeFinish(); }); }
  window.setTimeout(function () { minDone = true; maybeFinish(); }, MIN_MS);
  window.setTimeout(finish, SAFETY_MS);

  /* ============================================================
     Canvas particle system  (skipped entirely for reduced motion)
     ============================================================ */
  if (reduced || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var W, H, dpr, cx, cy;
  var particles = null, dissolveStart = 0;
  var t0 = performance.now();

  var COLORS = ['#769382', '#A8B8AD', '#cfe0d6', '#8fae9d'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r = stageEl.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---- build logo-shaped targets by sampling a canvas-drawn "D"
          (drawn on-canvas, never a cross-origin image → works on file://) ---- */
  function logoTargets() {
    var ow = 200, oh = 230;
    var off = document.createElement('canvas');
    off.width = ow; off.height = oh;
    var o = off.getContext('2d');
    o.fillStyle = '#000';
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.font = '800 210px "Hanken Grotesk", system-ui, -apple-system, sans-serif';
    o.fillText('D', ow / 2, oh / 2 + 8);

    var data = o.getImageData(0, 0, ow, oh).data;
    var pts = [], gap = 3, targetH = 128, scale = targetH / oh;
    for (var y = 0; y < oh; y += gap) {
      for (var x = 0; x < ow; x += gap) {
        if (data[(y * ow + x) * 4 + 3] > 128) {
          pts.push({ x: cx + (x - ow / 2) * scale, y: cy + (y - oh / 2) * scale });
        }
      }
    }
    for (var i = pts.length - 1; i > 0; i--) {           // shuffle
      var j = (Math.random() * (i + 1)) | 0, tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp;
    }
    return pts;
  }

  function build() {
    var targets = logoTargets();
    var NLOGO = Math.min(targets.length, 760);
    var NAMB = 150;
    var arr = [];

    for (var i = 0; i < NLOGO; i++) {
      var t = targets[i];
      var depth = 0.45 + Math.random() * 0.55;
      var ang = Math.random() * Math.PI * 2, rad = 140 + Math.random() * Math.max(W, H) * 0.5;
      arr.push({
        logo: true,
        x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad,
        tx: t.x, ty: t.y, sx: 0, sy: 0, captured: false,
        homeX: cx + Math.cos(ang) * rad, homeY: cy + Math.sin(ang) * rad,
        depth: depth, size: (1.1 + Math.random() * 1.7) * depth,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        seed: Math.random() * Math.PI * 2, spd: 0.4 + Math.random() * 0.7,
        vx: 0, vy: 0, op: 0
      });
    }
    for (var k = 0; k < NAMB; k++) {
      var d2 = 0.4 + Math.random() * 0.6;
      arr.push({
        logo: false,
        x: Math.random() * W, y: Math.random() * H,
        homeX: Math.random() * W, homeY: Math.random() * H,
        depth: d2, size: (0.8 + Math.random() * 1.6) * d2,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        seed: Math.random() * Math.PI * 2, spd: 0.3 + Math.random() * 0.6,
        vx: 0, vy: 0, op: 0
      });
    }
    return arr;
  }
  particles = build();

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function frame(now) {
    var e = now - t0;
    ctx.clearRect(0, 0, W, H);

    var ambP = Math.min(e / 600, 1);                        // ambient fade-in
    var convRaw = (e - T_CONV_IN) / (T_CONV_OUT - T_CONV_IN);
    var convP = Math.max(0, Math.min(convRaw, 1));
    var conv = easeInOut(convP);
    var dissolving = dissolveStart > 0;
    var dP = dissolving ? Math.min((now - dissolveStart) / 700, 1) : 0;

    /* energy ripples during convergence */
    if (convP > 0.05 && convP < 1 && !dissolving) {
      var rings = 2;
      for (var ri = 0; ri < rings; ri++) {
        var rp = (convP + ri * 0.5) % 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 30 + rp * 150, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(168,184,173,' + (0.18 * (1 - rp) * Math.sin(convP * Math.PI)).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    var i, p;
    /* update positions */
    for (i = 0; i < particles.length; i++) {
      p = particles[i];

      if (dissolving) {
        if (p.vx === 0 && p.vy === 0) {
          var a = Math.atan2(p.y - cy, p.x - cx) + (Math.random() - 0.5) * 0.5;
          var sp = 2 + Math.random() * 5;
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
        }
        p.x += p.vx; p.y += p.vy;
        p.op = (1 - dP) * (p._baseOp || 0.6);
        continue;
      }

      if (p.logo && convP > 0) {
        if (!p.captured) { p.sx = p.x; p.sy = p.y; p.captured = true; }
        p.x = p.sx + (p.tx - p.sx) * conv;
        p.y = p.sy + (p.ty - p.sy) * conv;
        // tiny shimmer once assembled
        if (convP >= 1) {
          p.x = p.tx + Math.sin(now * 0.001 * p.spd + p.seed) * 0.6;
          p.y = p.ty + Math.cos(now * 0.001 * p.spd + p.seed) * 0.6;
        }
      } else {
        // ambient drift with depth parallax
        var amp = 10 + (1 - p.depth) * 26;
        p.x = p.homeX + Math.sin(now * 0.0004 * p.spd + p.seed) * amp;
        p.y = p.homeY + Math.cos(now * 0.0005 * p.spd + p.seed * 1.3) * amp;
      }

      // opacity: fade in, then logo particles settle to a faint sparkle after assembly
      var base;
      if (p.logo) {
        base = convP >= 1
          ? 0.9 - Math.min((e - T_CONV_OUT) / 450, 1) * 0.66   // 0.9 → ~0.24
          : (0.35 + conv * 0.55);
      } else {
        base = 0.22 * ambP;
      }
      p._baseOp = base;
      p.op = base * ambP;
    }

    /* molecular connections while converging */
    if (convP > 0.12 && convP < 0.98 && !dissolving) {
      var ca = Math.sin(convP * Math.PI) * 0.4;
      ctx.lineWidth = 1;
      for (i = 0; i < particles.length; i += 11) {
        var a1 = particles[i]; if (!a1.logo) continue;
        for (var j = i + 11; j < Math.min(i + 66, particles.length); j += 11) {
          var b1 = particles[j]; if (!b1.logo) continue;
          var dx = a1.x - b1.x, dy = a1.y - b1.y, dd = dx * dx + dy * dy;
          if (dd < 2600) {
            ctx.strokeStyle = 'rgba(118,147,130,' + (ca * (1 - dd / 2600)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
          }
        }
      }
    }

    /* draw particles */
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      if (p.op <= 0.01) continue;
      ctx.globalAlpha = p.op;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!(dissolving && dP >= 1)) window.requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  window.requestAnimationFrame(frame);
})();
