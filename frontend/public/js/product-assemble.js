/* ============================================================
   DERBY LIFESCIENCE — Product "assembly" animation
   ------------------------------------------------------------
   The packshot inside the details modal is broken into a grid of
   fragments that fly in from all four sides, arc toward the centre
   and lock together into the finished product — then a soft brand
   glow, a light-sweep and a gentle scale settle it into place.

   · HTML / CSS / JS only — no libraries, no markup changes
   · GPU-only work (transform / opacity / filter); cleans up after
     itself and never shifts layout (an absolute overlay sits on top
     of the existing #pmImage, measured with transform-independent
     offset* metrics so the panel's open-scale can't distort it)
   · Honours prefers-reduced-motion (skips straight to the image)
   · Re-entrant: a newer run cancels the one in flight

   API — called by js/products.js:
     window.DerbyProductAssemble(true)   // on open  (also eases details in)
     window.DerbyProductAssemble(false)  // on prev / next
   ============================================================ */
(function () {
  'use strict';

  var modal = document.getElementById('productModal');
  if (!modal) return;
  var media = modal.querySelector('.pm__media');
  var panel = modal.querySelector('.pm__panel');
  var img   = document.getElementById('pmImage');
  if (!media || !img) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var raf    = window.requestAnimationFrame ||
               function (cb) { return window.setTimeout(cb, 16); };
  var token  = 0;                 // bumps on every run so stale runs bail out

  /* ---- transform helper ---- */
  function tf(x, y, rot, sc) {
    return 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + rot + 'deg) scale(' + sc + ')';
  }

  /* ---- strip any overlay / state a previous run left behind ---- */
  function reset() {
    var old = media.querySelector('.pa');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    media.classList.remove('pa-run', 'pa-done');
  }

  /* ---- ease the details column in (open only); always safe to call ---- */
  function revealDetails() {
    if (!panel) return;
    panel.classList.add('pm-seq--in');
    window.setTimeout(function () {
      panel.classList.remove('pm-seq', 'pm-seq--in');
    }, 700);
  }

  /* ---- wait until the modal is on-screen and the packshot has real
          layout dimensions (offset* ignores the panel's open transform) ---- */
  function whenMeasurable(mine, cb) {
    var tries = 0;
    (function poll() {
      if (mine !== token) return;                       // superseded
      if (!modal.hidden && img.offsetWidth > 4 && img.offsetHeight > 4 &&
          img.complete && img.naturalWidth) { cb(); return; }
      if (++tries > 90) { reset(); revealDetails(); return; }   // ~1.5s safety
      raf(poll);
    })();
  }

  /* ---- a few micro-particles drifting out as the product settles ---- */
  function sparkle(pa, small) {
    var n = small ? 6 : 9;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'pa__spark';
      s.style.left = '50%'; s.style.top = '50%';
      pa.appendChild(s);
      var ang = Math.random() * Math.PI * 2;
      var rad = 26 + Math.random() * 74;
      var tx = Math.cos(ang) * rad, ty = Math.sin(ang) * rad;
      s.animate([
        { opacity: 0, transform: 'translate(-50%,-50%) scale(0.4)' },
        { opacity: 0.9,
          transform: 'translate(calc(-50% + ' + (tx * 0.5) + 'px),calc(-50% + ' + (ty * 0.5) + 'px)) scale(1)',
          offset: 0.4 },
        { opacity: 0,
          transform: 'translate(calc(-50% + ' + tx + 'px),calc(-50% + ' + ty + 'px)) scale(0.6)' }
      ], { duration: 700 + Math.random() * 320, delay: Math.random() * 130, easing: 'ease-out', fill: 'forwards' });
    }
  }

  /* ---- build the fragment stage and play the assembly ---- */
  function build(mine, withDetails, safety) {
    var src = img.currentSrc || img.getAttribute('src');
    if (!src) { window.clearTimeout(safety); reset(); revealDetails(); return; }

    var w = img.offsetWidth,  h = img.offsetHeight;
    var x = img.offsetLeft,   y = img.offsetTop;

    var small = window.matchMedia('(max-width: 600px)').matches;
    var COLS  = small ? 3 : 4;       // 9 pieces on phones, 12 on larger screens
    var ROWS  = 3;

    /* stage overlays the packshot box exactly */
    var pa = document.createElement('div');
    pa.className = 'pa';
    pa.style.left = x + 'px'; pa.style.top = y + 'px';
    pa.style.width = w + 'px'; pa.style.height = h + 'px';

    var glow = document.createElement('div');
    glow.className = 'pa__glow';
    pa.appendChild(glow);

    var offX = media.clientWidth  * 0.52;   // how far out pieces start (scales with the box → responsive)
    var offY = media.clientHeight * 0.58;
    var cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2;
    var maxD = Math.hypot(cx, cy) || 1;

    var cellW = 100 / COLS, cellH = 100 / ROWS;
    var bgW = COLS * 100,   bgH = ROWS * 100;

    var pieces = [], anims = [];
    var safeSrc = String(src).replace(/"/g, '\\"');

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var el = document.createElement('div');
        el.className = 'pa__piece';
        var posX = COLS > 1 ? (c / (COLS - 1)) * 100 : 50;
        var posY = ROWS > 1 ? (r / (ROWS - 1)) * 100 : 50;
        el.style.cssText =
          'left:' + (c * cellW) + '%;top:' + (r * cellH) + '%;' +
          'width:' + cellW + '%;height:' + cellH + '%;' +
          'background-image:url("' + safeSrc + '");' +
          'background-size:' + bgW + '% ' + bgH + '%;' +
          'background-position:' + posX + '% ' + posY + '%;';
        pa.appendChild(el);
        pieces.push(el);

        /* entry direction: edges from their own side, corners diagonally,
           interior pieces nudged to the nearer side so all four are used */
        var dx = c === 0 ? -1 : (c === COLS - 1 ? 1 : 0);
        var dy = r === 0 ? -1 : (r === ROWS - 1 ? 1 : 0);
        if (dx === 0 && dy === 0) dx = c < COLS / 2 ? -1 : 1;

        var sX  = dx * offX * (0.8 + Math.random() * 0.5);
        var sY  = dy * offY * (0.8 + Math.random() * 0.5);
        var rot = (Math.random() * 2 - 1) * 20;              // gentle spin
        var sc  = 0.55 + Math.random() * 0.15;
        var blur = small ? 3 : 5;                            // subtle motion-blur
        /* a perpendicular nudge at the mid-point gives a curved path */
        var mX = sX * 0.42 + (dy ? (Math.random() * 2 - 1) * 26 : 0);
        var mY = sY * 0.42 + (dx ? (Math.random() * 2 - 1) * 26 : 0);

        var dist  = Math.hypot(c - cx, r - cy);
        var delay = (1 - dist / maxD) * 210 + Math.random() * 45;   // outer pieces lead
        var dur   = 720 + Math.random() * 180;

        var a = el.animate([
          { transform: tf(sX, sY, rot, sc),               opacity: 0, filter: 'blur(' + blur + 'px)',        offset: 0 },
          { transform: tf(mX, mY, rot * 0.4, (sc + 1) / 2), opacity: 1, filter: 'blur(' + (blur * 0.5) + 'px)', offset: 0.55 },
          { transform: tf(0, 0, 0, 1),                    opacity: 1, filter: 'blur(0px)',                    offset: 1 }
        ], { duration: dur, delay: delay, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'both' });
        anims.push(a);
      }
    }

    /* light-sweep + its clip wrapper (played at the end) */
    var shineWrap = document.createElement('div');
    shineWrap.className = 'pa__shine-wrap';
    var shine = document.createElement('div');
    shine.className = 'pa__shine';
    shineWrap.appendChild(shine);
    pa.appendChild(shineWrap);

    media.appendChild(pa);

    /* ---- resolve: cross-fade to the crisp image + flourish ---- */
    var settled = false;
    function finish() {
      if (settled || mine !== token) return;
      settled = true;
      window.clearTimeout(safety);

      media.classList.add('pa-done');                       // reveals #pmImage with a pop
      pieces.forEach(function (p) {
        p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
      });
      glow.animate([
        { opacity: 0,    transform: 'translate(-50%,-50%) scale(0.72)' },
        { opacity: 0.85, transform: 'translate(-50%,-50%) scale(1.04)' },
        { opacity: 0,    transform: 'translate(-50%,-50%) scale(1.24)' }
      ], { duration: 920, easing: 'ease-out', fill: 'forwards' });
      shine.animate([
        { transform: 'translateX(-160%) skewX(-18deg)' },
        { transform: 'translateX(180%) skewX(-18deg)' }
      ], { duration: 720, delay: 120, easing: 'cubic-bezier(0.4,0,0.2,1)', fill: 'forwards' });
      sparkle(pa, small);
      if (withDetails) revealDetails();

      window.setTimeout(function () { if (mine === token) reset(); }, 1150);
    }

    if (window.Promise) {
      window.Promise.all(anims.map(function (a) { return a.finished; })).then(finish, finish);
    }
    window.setTimeout(finish, 1350);                        // fallback if .finished is unsupported
  }

  /* ---- public entry point ---- */
  function run(withDetails) {
    if (!img) return;
    var mine = ++token;
    reset();

    if (reduce.matches) return;                             // no fragmentation on reduced-motion

    media.classList.add('pa-run');                          // hide the packshot until it's assembled
    if (withDetails && panel) panel.classList.add('pm-seq'); // hold the details column back

    var safety = window.setTimeout(revealDetails, 1500);    // details always appear, even on failure

    whenMeasurable(mine, function () {
      try { build(mine, withDetails, safety); }
      catch (e) { window.clearTimeout(safety); reset(); revealDetails(); }
    });
  }

  window.DerbyProductAssemble = run;
})();
