/* ============================================================
   DERBY LIFESCIENCE — Contact page interactions
   · Scroll-reveal animations (IntersectionObserver)
   · FAQ accordion (single-open, accessible)
   · Offset-aware smooth scrolling
   · Client-side form validation + simulated submit
   · Live "support availability" status from local time
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     1 · Scroll-reveal
     -------------------------------------------------------- */
  (function reveal() {
    var items = document.querySelectorAll('[data-animate]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || prefersReduced) {
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
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------------------
     2 · FAQ accordion
     -------------------------------------------------------- */
  (function faq() {
    var items = document.querySelectorAll('.faq__item');
    if (!items.length) return;

    function close(item) {
      var btn = item.querySelector('.faq__q');
      var panel = item.querySelector('.faq__panel');
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      panel.style.maxHeight = '';
    }

    function open(item) {
      var btn = item.querySelector('.faq__q');
      var panel = item.querySelector('.faq__panel');
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }

    items.forEach(function (item) {
      var btn = item.querySelector('.faq__q');
      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        items.forEach(function (other) { if (other !== item) close(other); });
        if (isOpen) { close(item); } else { open(item); }
      });
    });

    window.addEventListener('resize', function () {
      var openPanel = document.querySelector('.faq__item.is-open .faq__panel');
      if (openPanel) openPanel.style.maxHeight = openPanel.scrollHeight + 'px';
    });
  })();

  /* --------------------------------------------------------
     3 · Offset-aware smooth scroll for in-page links
     -------------------------------------------------------- */
  (function smoothScroll() {
    var HEADER_OFFSET = 96;
    var links = document.querySelectorAll('[data-scroll], a[href^="#"]');

    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;

      link.addEventListener('click', function (e) {
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
        window.scrollTo({ top: top < 0 ? 0 : top, behavior: prefersReduced ? 'auto' : 'smooth' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  })();

  /* --------------------------------------------------------
     4 · Contact form — validation + simulated submit
     -------------------------------------------------------- */
  (function contactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    var status = document.getElementById('formStatus');
    var statusTxt = status ? status.querySelector('.cform__status-txt') : null;
    var submitBtn = document.getElementById('submitBtn');
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var PHONE_RE = /^[0-9+()\s-]{7,20}$/;

    /* --- API endpoint -----------------------------------------
       Same-origin in production; on a Live Server dev port (or file://)
       it targets the local backend. Override with:
         <script>window.DERBY_API_BASE = 'https://api.example.com'</script>  */
    var DEV_PORTS = { '5500': 1, '5501': 1, '5502': 1, '3000': 1 };
    var API_BASE = (typeof window.DERBY_API_BASE === 'string')
      ? window.DERBY_API_BASE
      : (location.protocol === 'file:' || DEV_PORTS[location.port])
        ? 'http://localhost:4000'
        : '';
    var API_URL = API_BASE.replace(/\/$/, '') + '/api/contact';

    /* Maps the API's field names back to this form's input ids. */
    var API_TO_FIELD = { name: 'fullName', email: 'email', phone: 'phone', company: 'company', subject: 'subject', message: 'message' };

    var okMsg = 'Thank you for contacting Derby Lifescience. Your inquiry has been received successfully — our team will get back to you shortly.';
    var errMsg = 'Something went wrong. Please try again later.';

    function showStatus(type, msg) {
      if (!status) return;
      status.classList.remove('cform__status--ok', 'cform__status--err');
      status.classList.add(type === 'ok' ? 'cform__status--ok' : 'cform__status--err');
      if (statusTxt) statusTxt.textContent = msg;
      status.hidden = false;
      status.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
    }

    var rules = {
      fullName: function (v) {
        if (!v.trim()) return 'Please enter your full name.';
        if (v.trim().length < 2) return 'That name looks too short.';
        return '';
      },
      email: function (v) {
        if (!v.trim()) return 'Please enter your email address.';
        if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address.';
        return '';
      },
      phone: function (v) {
        if (!v.trim()) return '';
        if (!PHONE_RE.test(v.trim())) return 'Enter a valid phone number.';
        return '';
      },
      company: function () { return ''; },
      message: function (v) {
        if (!v.trim()) return 'Please tell us how we can help.';
        if (v.trim().length < 10) return 'Please add a little more detail (10+ characters).';
        return '';
      }
    };

    function wrap(input) { return input.closest('.ff'); }

    function setError(input, msg) {
      var box = wrap(input);
      var err = form.querySelector('[data-error-for="' + input.id + '"]');
      if (msg) {
        box.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        if (err) err.textContent = msg;
      } else {
        box.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        if (err) err.textContent = '';
      }
    }

    function validateField(input) {
      var rule = rules[input.name];
      if (!rule) return true;
      var msg = rule(input.value);
      setError(input, msg);
      return !msg;
    }

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      input.addEventListener('input', function () {
        if (wrap(input).classList.contains('is-invalid')) validateField(input);
      });
      input.addEventListener('blur', function () {
        if (input.value.trim()) validateField(input);
      });
    });

    function setLoading(on) {
      var label = submitBtn.querySelector('.btn__label');
      if (on) {
        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        if (label) { submitBtn.dataset.label = label.textContent; label.textContent = 'Sending…'; }
      } else {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        if (label && submitBtn.dataset.label) label.textContent = submitBtn.dataset.label;
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.hidden = true;

      var firstInvalid = null;
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        if (!input) return;
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      var payload = {
        name: form.elements.fullName.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone ? form.elements.phone.value.trim() : '',
        company: form.elements.company ? form.elements.company.value.trim() : '',
        subject: form.elements.subject ? form.elements.subject.value.trim() : '',
        message: form.elements.message.value.trim(),
        website: form.elements.website ? form.elements.website.value : '' // honeypot
      };

      setLoading(true);

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, statusCode: res.status, data: data };
          });
        })
        .then(function (r) {
          // Field-level validation errors from the server (422).
          if (r.statusCode === 422 && r.data && r.data.errors) {
            var firstServerInvalid = null;
            r.data.errors.forEach(function (er) {
              var input = form.elements[API_TO_FIELD[er.field] || er.field];
              if (input) { setError(input, er.message); if (!firstServerInvalid) firstServerInvalid = input; }
            });
            showStatus('err', (r.data && r.data.message) || errMsg);
            if (firstServerInvalid) firstServerInvalid.focus();
            return;
          }

          if (r.ok && r.data && r.data.success) {
            form.reset();
            showStatus('ok', okMsg);
          } else {
            showStatus('err', (r.data && r.data.message) || errMsg);
          }
        })
        .catch(function () {
          // Network failure / server unreachable.
          showStatus('err', errMsg);
        })
        .then(function () {
          setLoading(false);
        });
    });
  })();

  /* --------------------------------------------------------
     5 · Live support-availability status
        Mon–Fri 9:00–18:00 · Sat 10:00–14:00 · Sun closed
     -------------------------------------------------------- */
  (function supportStatus() {
    var el = document.getElementById('support');
    if (!el) return;
    var titleEl = document.getElementById('supportTitle');
    var hintEl = document.getElementById('supportHint');

    var OPEN = { 1: 540, 2: 540, 3: 540, 4: 540, 5: 540, 6: 600 }; // open minute-of-day
    var CLOSE = { 1: 1080, 2: 1080, 3: 1080, 4: 1080, 5: 1080, 6: 840 }; // close minute-of-day
    var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    function label(min) {
      var h = Math.floor(min / 60), m = min % 60;
      var ap = h < 12 ? 'AM' : 'PM', hr = h % 12; if (hr === 0) hr = 12;
      return hr + (m ? ':' + (m < 10 ? '0' + m : m) : ':00') + ' ' + ap;
    }

    function nextOpen(day, mins) {
      if (OPEN[day] !== undefined && mins < OPEN[day]) {
        return 'Opens today at ' + label(OPEN[day]);
      }
      for (var i = 1; i <= 7; i++) {
        var d = (day + i) % 7;
        if (OPEN[d] !== undefined) {
          return 'Opens ' + (i === 1 ? 'tomorrow' : DAYS[d]) + ' at ' + label(OPEN[d]);
        }
      }
      return 'We reply within 24 hours';
    }

    var now = new Date();
    var day = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes();
    var online = OPEN[day] !== undefined && mins >= OPEN[day] && mins < CLOSE[day];

    el.setAttribute('data-online', online ? 'true' : 'false');
    if (online) {
      if (titleEl) titleEl.textContent = 'Support available now';
      if (hintEl) hintEl.textContent = 'Typically replies within the hour';
    } else {
      if (titleEl) titleEl.textContent = 'Currently offline';
      if (hintEl) hintEl.textContent = nextOpen(day, mins);
    }
  })();
})();
