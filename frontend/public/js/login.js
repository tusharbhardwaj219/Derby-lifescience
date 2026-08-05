/* ============================================================
   DERBY LIFESCIENCE — Login interactions
   · Password show/hide toggle
   · Client-side validation + simulated sign-in
   · "Remember me" email persistence (localStorage)
   · Google button (demo placeholder)
   NOTE: authentication is simulated — no real backend is wired up.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORE_KEY = 'derby_login_email';

  var form = document.getElementById('loginForm');
  if (!form) return;

  var emailInput = form.elements['email'];
  var passwordInput = form.elements['password'];
  var rememberInput = form.elements['remember'];
  var loginBtn = document.getElementById('loginBtn');
  var status = document.getElementById('loginStatus');

  /* --------------------------------------------------------
     Prefill remembered email
     -------------------------------------------------------- */
  try {
    var saved = window.localStorage.getItem(STORE_KEY);
    if (saved) {
      emailInput.value = saved;
      if (rememberInput) rememberInput.checked = true;
    }
  } catch (e) { /* localStorage unavailable — ignore */ }

  /* --------------------------------------------------------
     Password show / hide
     -------------------------------------------------------- */
  (function passwordToggle() {
    var toggle = document.getElementById('passwordToggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var showing = passwordInput.type === 'text';
      passwordInput.type = showing ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!showing));
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      passwordInput.focus();
    });
  })();

  /* --------------------------------------------------------
     Validation
     -------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var rules = {
    email: function (v) {
      if (!v.trim()) return 'Please enter your email address.';
      if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address.';
      return '';
    },
    password: function (v) {
      if (!v) return 'Please enter your password.';
      if (v.length < 6) return 'Password must be at least 6 characters.';
      return '';
    }
  };

  function wrap(input) { return input.closest('.lf'); }

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

  [emailInput, passwordInput].forEach(function (input) {
    input.addEventListener('input', function () {
      if (wrap(input).classList.contains('is-invalid')) validateField(input);
    });
    input.addEventListener('blur', function () {
      if (input.value.trim()) validateField(input);
    });
  });

  /* --------------------------------------------------------
     Submit (simulated)
     -------------------------------------------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (status) status.hidden = true;

    var okEmail = validateField(emailInput);
    var okPass = validateField(passwordInput);
    if (!okEmail) { emailInput.focus(); return; }
    if (!okPass) { passwordInput.focus(); return; }

    // remember-me persistence
    try {
      if (rememberInput && rememberInput.checked) {
        window.localStorage.setItem(STORE_KEY, emailInput.value.trim());
      } else {
        window.localStorage.removeItem(STORE_KEY);
      }
    } catch (e) { /* ignore */ }

    loginBtn.classList.add('is-loading');
    loginBtn.disabled = true;
    var label = loginBtn.querySelector('.btn__label');
    var original = label ? label.textContent : '';
    if (label) label.textContent = 'Signing in…';

    window.setTimeout(function () {
      loginBtn.classList.remove('is-loading');
      if (label) label.textContent = original;
      if (status) status.hidden = false;

      // Simulated success → send the user to the site home ("dashboard").
      window.setTimeout(function () {
        window.location.href = 'index.html';
      }, prefersReduced ? 200 : 1000);
    }, 1300);
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
      span.textContent = 'Google sign-in isn’t configured in this demo';
      window.setTimeout(function () {
        span.textContent = original;
        btn.disabled = false;
      }, 1800);
    });
  })();

  /* --------------------------------------------------------
     Back link — go back within the site if possible,
     otherwise follow the href (home).
     -------------------------------------------------------- */
  (function backLink() {
    var link = document.querySelector('.back-link');
    if (!link) return;
    link.addEventListener('click', function (e) {
      var sameSite = document.referrer && document.referrer.indexOf(window.location.origin) === 0;
      if (window.history.length > 1 && sameSite) {
        e.preventDefault();
        window.history.back();
      }
    });
  })();
})();
