/* ============================================================
   DERBY LIFESCIENCE — About page experience
   · Scroll reveal (fade-up + line-by-line headlines)
   · Parallax media layers
   · Animated counters
   · Magnetic buttons + cursor glow
   · Smooth scrolling + newsletter
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --------------------------------------------------------
     1 · Reveal on scroll
     -------------------------------------------------------- */
  (function reveal() {
    var items = document.querySelectorAll('[data-animate], .reveal-lines, .journey__track');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------------
     2 · Parallax media
     -------------------------------------------------------- */
  (function parallax() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!els.length || reduced) return;

    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;      // skip offscreen
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
      ticking = false;
    }

    function onScroll() {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* --------------------------------------------------------
     3 · Counters
     -------------------------------------------------------- */
  (function counters() {
    var nodes = document.querySelectorAll('.counter');
    if (!nodes.length) return;

    function fmt(n) { return n.toLocaleString('en-IN'); }

    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduced) { el.textContent = fmt(target); return; }
      var dur = 1800, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased));
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------------
     4 · Magnetic buttons
     -------------------------------------------------------- */
  (function magnetic() {
    if (!finePointer || reduced) return;
    document.querySelectorAll('.btn--magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (x * 0.22).toFixed(1) + 'px,' + (y * 0.32).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transition = 'transform 0.4s cubic-bezier(0.22,1,0.36,1)';
        btn.style.transform = '';
        window.setTimeout(function () { btn.style.transition = ''; }, 400);
      });
    });
  })();

  /* --------------------------------------------------------
     5 · Cursor glow
     -------------------------------------------------------- */
  (function cursorGlow() {
    var glow = document.getElementById('cursorGlow');
    if (!glow || !finePointer || reduced) return;

    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

    function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) translate(-50%,-50%)';
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        window.requestAnimationFrame(loop);
      } else { running = false; }
    }

    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('is-on');
      if (!running) { running = true; window.requestAnimationFrame(loop); }
    }, { passive: true });

    document.addEventListener('mouseleave', function () { glow.classList.remove('is-on'); });
  })();

  /* --------------------------------------------------------
     6 · Smooth scroll
     -------------------------------------------------------- */
  (function smoothScroll() {
    var OFFSET = 90;
    document.querySelectorAll('[data-scroll], a[href^="#"]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      link.addEventListener('click', function (e) {
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - OFFSET;
        window.scrollTo({ top: top < 0 ? 0 : top, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  })();

  /* --------------------------------------------------------
     7 · Timeline rail — arrows, progress, drag-to-scroll
        (native scrollbar is hidden in CSS)
     -------------------------------------------------------- */
  (function timelineRail() {
    var rail = document.getElementById('tlRail');
    if (!rail) return;
    var prev = document.getElementById('tlPrev');
    var next = document.getElementById('tlNext');
    var bar = document.getElementById('tlProgress');

    function step() {
      var card = rail.querySelector('.tl-card');
      return card ? card.getBoundingClientRect().width + 20 : rail.clientWidth * 0.8;
    }

    function update() {
      var max = rail.scrollWidth - rail.clientWidth;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max - 2;
      if (bar) {
        var ratio = Math.min(rail.clientWidth / rail.scrollWidth, 1);
        bar.style.width = (ratio * 100) + '%';
        var travel = max > 0 ? rail.scrollLeft / max : 0;
        bar.style.transform = 'translateX(' + (travel * ((1 / ratio) - 1) * 100) + '%)';
      }
    }

    if (prev) prev.addEventListener('click', function () { rail.scrollLeft -= step(); });
    if (next) next.addEventListener('click', function () { rail.scrollLeft += step(); });
    rail.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);

    // drag to scroll (mouse / pen — touch keeps native momentum)
    var down = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true; moved = false;
      startX = e.clientX; startLeft = rail.scrollLeft;
      rail.classList.add('is-drag');
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      rail.classList.remove('is-drag');
    });
    // swallow the click that ends a drag
    rail.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    update();
    window.setTimeout(update, 300);
  })();

  /* --------------------------------------------------------
     8 · Newsletter (simulated)
     -------------------------------------------------------- */
  (function newsletter() {
    var form = document.getElementById('newsForm');
    if (!form) return;
    var input = document.getElementById('newsEmail');
    var msg = document.getElementById('newsMsg');
    var RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      if (!RE.test(v)) {
        msg.textContent = 'Please enter a valid email address.';
        msg.classList.add('is-err');
        input.focus();
        return;
      }
      msg.classList.remove('is-err');
      msg.textContent = 'Thank you — you’re on the list.';
      form.reset();
    });
  })();
})();
