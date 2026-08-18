/* ============================================================
   DERBY LIFESCIENCE — Stockist Product Query & Enquiry System
   ------------------------------------------------------------
   A B2B "add-to-query" (enquiry basket) experience — NOT a
   checkout. Stockists collect products across the catalogue,
   set quantities, then submit ONE consolidated enquiry that
   goes out over WhatsApp (wa.me deep link) + email (/api/query).

   · Vanilla JS, no libraries, no framework
   · Self-injects the basket / drawer / form / success UI into
     <body>, so any page that loads this file gets the basket
   · Persists to localStorage (survives navigation & refresh)
   · Centralised CONFIG so the WhatsApp number / email / API path
     can be changed in one place, and future integrations
     (Cloud API, CRM, admin dashboard…) can slot in cleanly
   · No secrets in the frontend — only a public wa.me number

   Public API:  window.DerbyQuery
     .add(item) .remove(sku) .setQty(sku,n) .has(sku)
     .count() .items() .clear() .open()
   Fires  document → 'derbyquery:change'  after every mutation
   (js/products.js listens to keep the card buttons in sync).
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     CENTRAL CONFIGURATION  ← change these in one place
     ========================================================== */
  var CONFIG = {
    whatsappNumber:  '918595939722',              // +91 85959 39722 (digits only, no +)
    whatsappDisplay: '+91 85959 39722',
    companyEmail:    'approval@derbylifesciences.com',
    companyName:     'Derby Lifescience',
    idPrefix:        'DLS-QRY',
    apiPath:         '/api/query',                // serverless email/record endpoint (same origin)
    storageKey:      'derby_query_v1',
    seqKey:          'derby_query_seq_v1',
    maxQty:          100000,
    imageDir:        'image/'
  };

  /* ==========================================================
     ICONS
     ========================================================== */
  var I = {
    basket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/><path d="M9.5 13h5"/></svg>',
    plus:   '<svg class="dq-ico-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    check:  '<svg class="dq-ico-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    checkPlain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    x:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    trash:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7"/></svg>',
    back:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    arrow:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.05 3.8 3.9-1.02A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.13 15.06l-.3-.18-2.32.6.62-2.26-.19-.3A8.1 8.1 0 0 1 12.04 3.8zm4.6 10.2c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z"/></svg>',
    mail:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/></svg>'
  };

  /* ==========================================================
     HELPERS
     ========================================================== */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clampQty(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > CONFIG.maxQty) n = CONFIG.maxQty;
    return n;
  }
  function totalUnits() { return state.reduce(function (s, it) { return s + it.qty; }, 0); }

  /* ==========================================================
     STORAGE  (localStorage-backed; degrades to in-memory)
     ========================================================== */
  var state = [];
  (function loadState() {
    try {
      var raw = window.localStorage.getItem(CONFIG.storageKey);
      var arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        state = arr.filter(function (it) { return it && it.sku && it.name; })
                   .map(function (it) {
          return { sku: String(it.sku), name: String(it.name), category: String(it.category || ''),
                   src: String(it.src || ''), qty: clampQty(it.qty || 1) };
        });
      }
    } catch (e) { state = []; }
  })();

  function persist() {
    try { window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) {}
  }
  function emitChange() {
    persist();
    render();
    try { document.dispatchEvent(new CustomEvent('derbyquery:change', { detail: { count: state.length } })); } catch (e) {}
  }
  function find(sku) { for (var i = 0; i < state.length; i++) if (state[i].sku === sku) return i; return -1; }

  /* ==========================================================
     PUBLIC API
     ========================================================== */
  var API = {
    add: function (item) {
      if (!item || !item.sku) return;
      var i = find(item.sku);
      if (i === -1) {
        state.push({ sku: String(item.sku), name: String(item.name || item.sku),
          category: String(item.category || ''), src: String(item.src || ''),
          qty: clampQty(item.qty || 1) });
        toast('Product added to your query', I.check);
        bumpCount();
      } else {
        state[i].qty = clampQty(state[i].qty + (item.qty ? clampQty(item.qty) : 1));
        toast('Quantity updated', I.check);
        bumpCount();
      }
      emitChange();
    },
    remove: function (sku) { var i = find(sku); if (i !== -1) { state.splice(i, 1); emitChange(); } },
    setQty: function (sku, n) { var i = find(sku); if (i !== -1) { state[i].qty = clampQty(n); emitChange(); } },
    has:    function (sku) { return find(sku) !== -1; },
    count:  function () { return state.length; },
    items:  function () { return state.map(function (it) { return { sku: it.sku, name: it.name, category: it.category, src: it.src, qty: it.qty }; }); },
    clear:  function () { if (state.length) { state = []; emitChange(); } },
    open:   function () { openState('drawer'); }
  };
  window.DerbyQuery = API;

  /* ==========================================================
     BUILD & INJECT UI
     ========================================================== */
  var root, fab, fabCount, listEl, footCountEl, sendBtn, formEl, toastWrap;
  var lastSubmitted = null;

  function buildUI() {
    /* floating basket */
    fab = document.createElement('button');
    fab.className = 'dq-fab';
    fab.id = 'dqFab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Open my product query');
    fab.innerHTML = I.basket +
      '<span class="dq-fab__label">My Query</span>' +
      '<span class="dq-fab__count" id="dqCount">0</span>';

    /* overlay root */
    root = document.createElement('div');
    root.className = 'dq-root';
    root.id = 'dqRoot';
    root.hidden = true;
    root.innerHTML =
      '<div class="dq-backdrop" data-dq="backdrop" aria-hidden="true"></div>' +

      /* ---- DRAWER ---- */
      '<aside class="dq-drawer" role="dialog" aria-modal="true" aria-label="My product query">' +
        '<div class="dq-drawer__head">' +
          '<div><h2>My Product Query</h2><p>Add products, set quantities, send one enquiry.</p></div>' +
          '<button class="dq-x" type="button" data-dq="close" aria-label="Close query">' + I.x + '</button>' +
        '</div>' +
        '<div class="dq-drawer__body" id="dqList"></div>' +
        '<div class="dq-drawer__foot" id="dqFoot">' +
          '<div class="dq-confirm" id="dqConfirm">' +
            '<span>Clear the whole query?</span>' +
            '<span class="dq-confirm__act">' +
              '<button type="button" class="dq-confirm__yes" data-dq="clear-yes">Clear</button>' +
              '<button type="button" class="dq-confirm__no" data-dq="clear-no">Keep</button>' +
            '</span>' +
          '</div>' +
          '<div class="dq-foot__meta">' +
            '<span id="dqFootCount">0 products</span>' +
            '<button type="button" class="dq-btn--danger dq-btn" data-dq="clear-ask" id="dqClearAsk">Clear Query</button>' +
          '</div>' +
          '<div class="dq-foot__actions">' +
            '<button type="button" class="dq-btn dq-btn--ghost" data-dq="close">Continue Browsing</button>' +
            '<button type="button" class="dq-btn dq-btn--primary" id="dqSend" data-dq="send">Send Enquiry ' + I.arrow + '</button>' +
          '</div>' +
        '</div>' +
      '</aside>' +

      /* ---- ENQUIRY FORM ---- */
      '<div class="dq-modal" id="dqFormModal">' +
        '<div class="dq-modal__card" role="dialog" aria-modal="true" aria-label="Stockist enquiry form">' +
          '<div class="dq-modal__head">' +
            '<button class="dq-back" type="button" data-dq="to-drawer" aria-label="Back to query">' + I.back + '</button>' +
            '<div><h2>Stockist Enquiry</h2><p>Your selected products are attached automatically.</p></div>' +
            '<button class="dq-x" type="button" data-dq="close" aria-label="Close">' + I.x + '</button>' +
          '</div>' +
          '<form class="dq-form" id="dqForm" novalidate>' +
            '<div class="dq-hp" aria-hidden="true"><label>Company URL (leave empty)<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>' +
            '<div class="dq-form__products" id="dqFormProducts"></div>' +
            '<p class="dq-form__section-t">Your details</p>' +
            '<div class="dq-form__grid">' +
              field('name', 'Full Name', 'text', true, 'Rahul Sharma') +
              field('company', 'Stockist / Company Name', 'text', true, 'ABC Pharma Distributors') +
              field('mobile', 'Mobile Number', 'tel', true, '98XXXXXXXX') +
              field('email', 'Email Address', 'email', true, 'you@company.com') +
              field('city', 'City', 'text', false, 'Delhi') +
              field('state', 'State', 'text', false, 'Delhi') +
              field('gst', 'GST Number', 'text', false, '07ABCDE1234F1Z5') +
              field('licence', 'Drug Licence No.', 'text', false, 'Optional') +
              '<div class="dq-field dq-col-2">' +
                '<label for="dqf-message">Additional Requirement / Message</label>' +
                '<textarea id="dqf-message" name="message" placeholder="I require availability and quotation for the above products."></textarea>' +
                '<span class="dq-field__err"></span>' +
              '</div>' +
            '</div>' +
            '<button type="submit" class="dq-btn dq-btn--primary dq-btn--block" id="dqSubmit" style="margin-top:20px">Submit Enquiry ' + I.arrow + '</button>' +
          '</form>' +
        '</div>' +
      '</div>' +

      /* ---- SUCCESS ---- */
      '<div class="dq-modal" id="dqSuccessModal">' +
        '<div class="dq-modal__card" role="dialog" aria-modal="true" aria-label="Enquiry submitted">' +
          '<div class="dq-success">' +
            '<div class="dq-success__check">' + I.checkPlain + '</div>' +
            '<h2>Enquiry Submitted</h2>' +
            '<div class="dq-success__id" id="dqSuccessId">—</div>' +
            '<p class="dq-success__msg">Your enquiry has been sent to ' + esc(CONFIG.companyName) + '. Our team will contact you shortly to discuss product availability, MOQ, quotation and order confirmation.</p>' +
            '<div class="dq-success__contact">' +
              '<a href="https://wa.me/' + CONFIG.whatsappNumber + '" target="_blank" rel="noopener">' + I.whatsapp + '<span>WhatsApp: ' + esc(CONFIG.whatsappDisplay) + '</span></a>' +
              '<a href="mailto:' + esc(CONFIG.companyEmail) + '">' + I.mail + '<span>' + esc(CONFIG.companyEmail) + '</span></a>' +
            '</div>' +
            '<div class="dq-success__detail" id="dqSuccessDetail"></div>' +
            '<div class="dq-success__actions">' +
              '<button type="button" class="dq-btn dq-btn--primary dq-btn--block" data-dq="close">Continue Browsing Products</button>' +
              '<button type="button" class="dq-btn dq-btn--ghost dq-btn--block" data-dq="toggle-detail">View Query Details</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* toasts */
    toastWrap = document.createElement('div');
    toastWrap.className = 'dq-toasts';
    toastWrap.id = 'dqToasts';
    toastWrap.setAttribute('aria-live', 'polite');

    document.body.appendChild(fab);
    document.body.appendChild(root);
    document.body.appendChild(toastWrap);

    fabCount   = document.getElementById('dqCount');
    listEl     = document.getElementById('dqList');
    footCountEl = document.getElementById('dqFootCount');
    sendBtn    = document.getElementById('dqSend');
    formEl     = document.getElementById('dqForm');

    wireEvents();
    render();
  }

  function field(name, label, type, required, ph) {
    return '<div class="dq-field" data-field="' + name + '">' +
      '<label for="dqf-' + name + '">' + esc(label) + (required ? ' <span class="req">*</span>' : '') + '</label>' +
      '<input id="dqf-' + name + '" name="' + name + '" type="' + type + '" placeholder="' + esc(ph) + '"' +
        (required ? ' data-required="1"' : '') + (name === 'mobile' ? ' inputmode="numeric"' : '') + ' autocomplete="off" />' +
      '<span class="dq-field__err"></span>' +
    '</div>';
  }

  /* ==========================================================
     RENDER
     ========================================================== */
  function render() {
    if (!fabCount) return;
    var n = state.length;
    fabCount.textContent = n;
    if (footCountEl) footCountEl.textContent = n + (n === 1 ? ' product' : ' products');
    if (sendBtn) sendBtn.disabled = n === 0;
    if (sendBtn) sendBtn.style.opacity = n === 0 ? '0.5' : '';
    renderList();
  }

  function renderList() {
    if (!listEl) return;
    if (!state.length) {
      listEl.innerHTML =
        '<div class="dq-empty">' +
          '<div class="dq-empty__icon">' + I.basket + '</div>' +
          '<h3>Your Query is Empty</h3>' +
          '<p>Browse our products and add the ones you are interested in to build a single enquiry.</p>' +
          '<button type="button" class="dq-btn dq-btn--primary" data-dq="close">Browse Products</button>' +
        '</div>';
      return;
    }
    listEl.innerHTML = state.map(function (it) {
      var bg = it.src ? " style=\"background-image:url('" + esc(it.src) + "')\"" : '';
      return '<div class="dq-item" data-sku="' + esc(it.sku) + '">' +
        '<div class="dq-item__thumb"' + bg + '></div>' +
        '<div class="dq-item__main">' +
          '<div class="dq-item__top">' +
            '<div>' +
              '<div class="dq-item__name">' + esc(it.name) + '</div>' +
              (it.category ? '<div class="dq-item__cat">' + esc(it.category) + '</div>' : '') +
            '</div>' +
            '<button class="dq-item__remove" type="button" data-act="remove" aria-label="Remove ' + esc(it.name) + '">' + I.trash + '</button>' +
          '</div>' +
          '<div class="dq-item__sku">Code: ' + esc(it.sku) + '</div>' +
          '<div class="dq-item__row">' +
            '<div class="dq-stepper">' +
              '<button type="button" data-act="dec" aria-label="Decrease quantity">&minus;</button>' +
              '<input type="number" data-act="qty" value="' + it.qty + '" min="1" aria-label="Quantity for ' + esc(it.name) + '" />' +
              '<button type="button" data-act="inc" aria-label="Increase quantity">+</button>' +
            '</div>' +
            '<span class="dq-stepper__unit">Units</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderFormProducts() {
    var box = document.getElementById('dqFormProducts');
    if (!box) return;
    box.innerHTML =
      '<h4>' + I.check + ' Selected Products (' + state.length + ')</h4>' +
      '<ol>' + state.map(function (it, i) {
        return '<li><b>' + (i + 1) + '. ' + esc(it.name) + '</b><span>Qty: ' + it.qty + '</span></li>';
      }).join('') + '</ol>';
  }

  /* ==========================================================
     COUNTER BUMP + TOAST
     ========================================================== */
  function bumpCount() {
    if (!fabCount) return;
    fabCount.classList.remove('is-bump');
    /* force reflow so the animation restarts */
    void fabCount.offsetWidth;
    fabCount.classList.add('is-bump');
  }

  function toast(msg, icon) {
    if (!toastWrap) return;
    var t = document.createElement('div');
    t.className = 'dq-toast';
    t.innerHTML = (icon || I.check) + '<span>' + esc(msg) + '</span>';
    toastWrap.appendChild(t);
    window.setTimeout(function () {
      t.classList.add('is-out');
      window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, 2400);
  }

  /* ==========================================================
     OPEN / CLOSE STATE MACHINE   (drawer | form | success)
     ========================================================== */
  var lastFocus = null;
  function openState(s) {
    if (s === 'drawer' && !document.getElementById('dqConfirm')) { /* noop guard */ }
    lastFocus = document.activeElement;
    if (s === 'form') renderFormProducts();
    root.hidden = false;
    root.classList.remove('is-drawer', 'is-form', 'is-success');
    root.classList.add('is-' + s);
    document.documentElement.classList.add('dq-lock');
    window.requestAnimationFrame(function () {
      root.classList.add('is-in');
      var f = activePanel();
      var focusTarget = f && f.querySelector('input, button, [href], textarea');
      if (focusTarget) { try { focusTarget.focus(); } catch (e) {} }
    });
    hideConfirm();
  }
  function goDrawer() {
    root.classList.remove('is-form', 'is-success');
    root.classList.add('is-drawer');
  }
  function closeAll() {
    root.classList.remove('is-in');
    document.documentElement.classList.remove('dq-lock');
    window.setTimeout(function () {
      root.hidden = true;
      root.classList.remove('is-drawer', 'is-form', 'is-success');
      hideConfirm();
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    }, 420);
  }
  function activePanel() {
    if (root.classList.contains('is-form')) return document.getElementById('dqFormModal');
    if (root.classList.contains('is-success')) return document.getElementById('dqSuccessModal');
    return root.querySelector('.dq-drawer');
  }

  function showConfirm() { var c = document.getElementById('dqConfirm'); if (c) c.classList.add('is-open'); }
  function hideConfirm() { var c = document.getElementById('dqConfirm'); if (c) c.classList.remove('is-open'); }

  /* ==========================================================
     EVENTS
     ========================================================== */
  function wireEvents() {
    fab.addEventListener('click', function () { openState('drawer'); });

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-dq]');
      if (!t) return;
      var act = t.getAttribute('data-dq');
      if (act === 'close') return closeAll();
      if (act === 'backdrop') { if (!root.classList.contains('is-form')) closeAll(); return; }  // don't lose a filled form
      if (act === 'to-drawer') return goDrawer();
      if (act === 'send') { if (state.length) openState('form'); return; }
      if (act === 'clear-ask') return showConfirm();
      if (act === 'clear-no') return hideConfirm();
      if (act === 'clear-yes') { API.clear(); hideConfirm(); toast('Query cleared', I.trash); return; }
      if (act === 'toggle-detail') {
        var d = document.getElementById('dqSuccessDetail');
        if (d) d.classList.toggle('is-open');
        t.textContent = (d && d.classList.contains('is-open')) ? 'Hide Query Details' : 'View Query Details';
        return;
      }
    });

    /* item controls (event-delegated) */
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var row = e.target.closest('.dq-item');
      if (!row) return;
      var sku = row.getAttribute('data-sku');
      var act = btn.getAttribute('data-act');
      var i = find(sku);
      if (i === -1) return;
      if (act === 'inc') API.setQty(sku, state[i].qty + 1);
      else if (act === 'dec') API.setQty(sku, state[i].qty - 1);
      else if (act === 'remove') {
        row.classList.add('is-removing');
        window.setTimeout(function () { API.remove(sku); }, 260);
      }
    });
    listEl.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-act="qty"]');
      if (!inp) return;
      var row = e.target.closest('.dq-item');
      if (row) API.setQty(row.getAttribute('data-sku'), inp.value);
    });

    formEl.addEventListener('submit', handleSubmit);

    /* keyboard: ESC + a simple Tab trap on the active panel */
    document.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (root.classList.contains('is-form')) goDrawer(); else closeAll();
        return;
      }
      if (e.key !== 'Tab') return;
      var panel = activePanel();
      if (!panel) return;
      var f = panel.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
      f = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null && !el.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ==========================================================
     VALIDATION + SUBMIT
     ========================================================== */
  function fieldEl(name) { return formEl.querySelector('[data-field="' + name + '"]'); }

  function setError(name, msg) {
    var wrap = fieldEl(name);
    if (!wrap) return;
    wrap.classList.toggle('is-invalid', !!msg);
    var input = wrap.querySelector('input, textarea');
    if (input) input.classList.toggle('is-invalid', !!msg);
    var err = wrap.querySelector('.dq-field__err');
    if (err) err.textContent = msg || '';
  }

  function validate(data) {
    var ok = true;
    ['name', 'company', 'mobile', 'email'].forEach(function (n) { setError(n, ''); });
    if (data.name.length < 2) { setError('name', 'Please enter your full name.'); ok = false; }
    if (data.company.length < 2) { setError('company', 'Company / stockist name is required.'); ok = false; }
    if ((data.mobile.replace(/\D/g, '')).length < 10) { setError('mobile', 'Enter a valid mobile number.'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) { setError('email', 'Enter a valid email address.'); ok = false; }
    return ok;
  }

  function collectForm() {
    function v(n) { var el = formEl.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; }
    return {
      name: v('name'), company: v('company'), mobile: v('mobile'), email: v('email'),
      city: v('city'), state: v('state'), gst: v('gst'), licence: v('licence'), message: v('message')
    };
  }

  function genQueryId() {
    var d = new Date();
    var ymd = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var seq = { date: ymd, n: 0 };
    try { var s = JSON.parse(window.localStorage.getItem(CONFIG.seqKey) || 'null'); if (s && s.date === ymd) seq = s; } catch (e) {}
    seq.n += 1;
    try { window.localStorage.setItem(CONFIG.seqKey, JSON.stringify(seq)); } catch (e) {}
    var nnn = ('000' + seq.n).slice(-3);
    return CONFIG.idPrefix + '-' + ymd + '-' + nnn;
  }

  function buildWhatsAppText(q) {
    var lines = [];
    lines.push('*New Stockist Product Enquiry*');
    lines.push('');
    lines.push('Query ID: ' + q.queryId);
    lines.push('Stockist Name: ' + q.name);
    lines.push('Company Name: ' + q.company);
    lines.push('Mobile: ' + q.mobile);
    lines.push('Email: ' + q.email);
    var loc = [q.city, q.state].filter(Boolean).join(', ');
    if (loc) lines.push('Location: ' + loc);
    if (q.gst) lines.push('GST: ' + q.gst);
    if (q.licence) lines.push('Drug Licence: ' + q.licence);
    lines.push('');
    lines.push('*Products Requested:*');
    q.products.forEach(function (p, i) { lines.push((i + 1) + '. ' + p.name + ' — Qty: ' + p.qty); });
    lines.push('');
    if (q.message) { lines.push('Additional Requirement:'); lines.push(q.message); lines.push(''); }
    lines.push('Please share product availability, MOQ, quotation and further order details.');
    lines.push('Thank you.');
    return lines.join('\n');
  }

  function postQuery(payload) {
    var base = window.DERBY_API_BASE || '';
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, 12000) : null;
    return fetch(base + CONFIG.apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.ok; }).catch(function () { return false; })
      .then(function (ok) { if (timer) window.clearTimeout(timer); return ok; });
  }

  var submitting = false;                             // QA-01: re-entrancy guard
  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;                           // block double-submit (Enter key / rapid clicks)

    /* QA-02: honeypot — a real stockist never fills this hidden field */
    var hp = formEl.querySelector('[name="website"]');
    if (hp && hp.value.trim() !== '') return;         // silently drop bot submissions

    if (!state.length) { toast('Your query is empty'); goDrawer(); return; }
    var data = collectForm();
    if (!validate(data)) {
      var firstBad = formEl.querySelector('.dq-field.is-invalid input, .dq-field.is-invalid textarea');
      if (firstBad) firstBad.focus();
      return;
    }

    submitting = true;
    var submit = document.getElementById('dqSubmit');
    if (submit) { submit.classList.add('is-loading'); submit.disabled = true; }   // disabled also blocks Enter-submit

    var queryId = genQueryId();
    var products = state.map(function (it) { return { name: it.name, sku: it.sku, qty: it.qty }; });
    var q = {
      queryId: queryId, name: data.name, company: data.company, mobile: data.mobile, email: data.email,
      city: data.city, state: data.state, gst: data.gst, licence: data.licence, message: data.message,
      products: products
    };

    /* WhatsApp deep link — opened on this user click so it isn't popup-blocked */
    var waUrl = 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(buildWhatsAppText(q));
    var waWin = window.open(waUrl, '_blank');

    var payload = {
      queryId: queryId, name: data.name, company: data.company, mobile: data.mobile, email: data.email,
      city: data.city, state: data.state, gst: data.gst, licence: data.licence, message: data.message,
      products: products, website: hp ? hp.value : '', whatsappOpened: !!waWin, createdAt: new Date().toISOString()
    };
    postQuery(payload);   // fire-and-forget; success screen never blocks on email

    window.setTimeout(function () {
      submitting = false;
      if (submit) { submit.classList.remove('is-loading'); submit.disabled = false; }
      lastSubmitted = { queryId: queryId, products: products, waUrl: waUrl };
      API.clear();                 // enquiry sent → empty the basket
      showSuccess(lastSubmitted, !waWin);
    }, 650);
  }

  function showSuccess(sub, waBlocked) {
    var idEl = document.getElementById('dqSuccessId');
    if (idEl) idEl.textContent = sub.queryId;
    var detail = document.getElementById('dqSuccessDetail');
    if (detail) {
      detail.classList.remove('is-open');
      detail.innerHTML = '<h4>Query ' + esc(sub.queryId) + '</h4><ol>' +
        sub.products.map(function (p) { return '<li>' + esc(p.name) + ' — <span>Qty: ' + p.qty + '</span></li>'; }).join('') +
        '</ol>' +
        (waBlocked ? '<p style="margin-top:12px;font-size:12.5px;color:var(--pr-soft)">If WhatsApp did not open, <a href="' + esc(sub.waUrl) + '" target="_blank" rel="noopener" style="color:var(--pr-deep);font-weight:700">tap here to send it</a>.</p>' : '');
    }
    var toggleBtn = root.querySelector('[data-dq="toggle-detail"]');
    if (toggleBtn) toggleBtn.textContent = 'View Query Details';
    openState('success');
  }

  /* ==========================================================
     INIT
     ========================================================== */
  function init() {
    buildUI();
    /* let listeners (products.js) sync their card buttons to any restored query */
    try { document.dispatchEvent(new CustomEvent('derbyquery:change', { detail: { count: state.length } })); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
