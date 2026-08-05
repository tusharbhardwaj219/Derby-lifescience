/* ============================================================
   DERBY LIFESCIENCE — Signup interactions
   · Show/hide password (both fields)
   · Live password-strength meter
   · Client-side validation + simulated account creation
   NOTE: registration is simulated — no real backend is wired up.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var form = document.getElementById('signupForm');
  if (!form) return;

  var submitBtn = document.getElementById('signupBtn');
  var status = document.getElementById('signupStatus');

  /* --------------------------------------------------------
     Show / hide password (data-toggle points at input id)
     -------------------------------------------------------- */
  form.querySelectorAll('.sf__toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var input = document.getElementById(toggle.getAttribute('data-toggle'));
      if (!input) return;
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!showing));
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      input.focus();
    });
  });

  /* --------------------------------------------------------
     Password strength meter
     -------------------------------------------------------- */
  var pwInput = form.elements['password'];
  var pwStrength = document.getElementById('pwStrength');
  var pwLabel = pwStrength ? pwStrength.querySelector('.pw-strength__label') : null;

  function scorePassword(pw) {
    if (!pw) return 0;
    var score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    var variety = 0;
    if (/[a-z]/.test(pw)) variety++;
    if (/[A-Z]/.test(pw)) variety++;
    if (/\d/.test(pw)) variety++;
    if (/[^A-Za-z0-9]/.test(pw)) variety++;
    if (variety >= 3) score++;
    return Math.min(3, Math.max(1, score));
  }

  function updateStrength() {
    if (!pwStrength) return;
    var level = scorePassword(pwInput.value);
    pwStrength.setAttribute('data-level', String(level));
    if (pwLabel) {
      pwLabel.textContent = ['Enter a password', 'Weak', 'Medium', 'Strong'][level];
    }
  }
  if (pwInput) pwInput.addEventListener('input', updateStrength);

  /* --------------------------------------------------------
     Validation
     -------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[0-9+()\s-]{7,18}$/;

  var rules = {
    fullName: function (v) {
      if (!v.trim()) return 'Please enter your full name.';
      if (v.trim().length < 2) return 'That name looks too short.';
      return '';
    },
    company: function (v) { return v.trim() ? '' : 'Please enter your company name.'; },
    email: function (v) {
      if (!v.trim()) return 'Please enter your email address.';
      if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address.';
      return '';
    },
    mobile: function (v) {
      if (!v.trim()) return 'Please enter your mobile number.';
      if (!PHONE_RE.test(v.trim())) return 'Enter a valid mobile number.';
      return '';
    },
    password: function (v) {
      if (!v) return 'Please create a password.';
      if (v.length < 8) return 'Use at least 8 characters.';
      return '';
    },
    confirm: function (v) {
      if (!v) return 'Please confirm your password.';
      if (v !== (pwInput ? pwInput.value : '')) return 'Passwords do not match.';
      return '';
    }
  };

  function wrap(input) { return input.closest('.sf'); }

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

  // agreements
  var agreeBox = form.querySelector('.sform__agree');
  var agreeErr = form.querySelector('[data-error-for="agree"]');
  function validateAgree() {
    var ok = form.elements['terms'].checked && form.elements['privacy'].checked;
    if (agreeBox) agreeBox.classList.toggle('is-invalid', !ok);
    if (agreeErr) agreeErr.textContent = ok ? '' : 'Please accept the Terms and Privacy Policy to continue.';
    return ok;
  }
  ['terms', 'privacy'].forEach(function (n) {
    var box = form.elements[n];
    if (box) box.addEventListener('change', function () {
      if (agreeBox && agreeBox.classList.contains('is-invalid')) validateAgree();
    });
  });

  /* --------------------------------------------------------
     Submit (simulated)
     -------------------------------------------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (status) status.hidden = true;

    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });
    var agreeOk = validateAgree();

    if (firstInvalid) { firstInvalid.focus(); return; }
    if (!agreeOk) { form.elements['terms'].focus(); return; }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    var label = submitBtn.querySelector('.btn__label');
    var original = label ? label.textContent : '';
    if (label) label.textContent = 'Creating account…';

    window.setTimeout(function () {
      submitBtn.classList.remove('is-loading');
      if (label) label.textContent = original;
      if (status) status.hidden = false;

      window.setTimeout(function () {
        window.location.href = 'index.html';
      }, prefersReduced ? 200 : 1100);
    }, 1400);
  });

  /* --------------------------------------------------------
     Google button (demo placeholder)
     -------------------------------------------------------- */
  (function googleButton() {
    var btn = document.getElementById('googleBtn');
    if (!btn) return;
    var span = btn.querySelector('span');
    btn.addEventListener('click', function () {
      if (!span) return;
      var original = span.textContent;
      btn.disabled = true;
      span.textContent = 'Google sign-up isn’t configured in this demo';
      window.setTimeout(function () { span.textContent = original; btn.disabled = false; }, 1800);
    });
  })();

  /* --------------------------------------------------------
     Fit the card to the viewport height on desktop, so the
     page never scrolls. Reproduces "zoom out until it fits"
     automatically at 100% zoom on short screens.
     -------------------------------------------------------- */
  (function fitToViewport() {
    var card = document.querySelector('.signup-card');
    if (!card) return;

    function fit() {
      // reset to natural size before measuring
      card.style.zoom = '';
      card.style.maxHeight = 'none';
      card.style.overflowY = 'visible';
      if (window.innerWidth < 901) return;          // stacked mobile scrolls naturally

      var panel = card.parentElement;               // .auth__panel
      var cs = window.getComputedStyle(panel);
      var pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      var available = window.innerHeight - pad - 6; // usable height for the card
      var natural = card.offsetHeight;

      if (natural > available) {
        card.style.zoom = Math.max(0.62, available / natural);
      }
    }

    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = window.setTimeout(fit, 100); });
    window.addEventListener('load', fit);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fit); }
    fit();
    window.requestAnimationFrame(fit);
  })();
})();
