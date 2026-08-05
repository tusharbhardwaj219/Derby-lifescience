/* ============================================================
   DERBY LIFESCIENCE — Home page
   · Fade-in / slide-up reveal for hero content
   · Smooth scrolling for in-page links
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     1 · Reveal (hero is above the fold, so this runs on load)
     -------------------------------------------------------- */
  (function reveal() {
    var items = document.querySelectorAll('[data-animate]');
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
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------------
     2 · Parallax media layers
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
     3 · Animated statistic counters
     -------------------------------------------------------- */
  (function counters() {
    var nodes = document.querySelectorAll('.counter');
    if (!nodes.length) return;

    function fmt(n) { return n.toLocaleString('en-IN'); }

    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduced) { el.textContent = fmt(target); return; }
      var dur = 1700, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);   // easeOutCubic
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
     4 · Smooth scroll for in-page anchors
     -------------------------------------------------------- */
  (function smoothScroll() {
    var OFFSET = 96;
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
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
})();
