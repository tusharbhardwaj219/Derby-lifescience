/* ============================================================
   DERBY LIFESCIENCE — Product catalogue (frontend only)
   · Renders every product image from /image as a card
   · Live search, accessible details modal (ESC / backdrop / focus trap)
   No backend, no API, no cart — showcase only.
   ============================================================ */
(function () {
  'use strict';

  var IMG_DIR = 'image/';

  /* ------------------------------------------------------------
     PRODUCT IMAGE MANIFEST
     A browser cannot read a folder listing without a server, so the
     filenames live here. To add/remove a product, just edit this list
     (the card, search and modal all update automatically).
     ------------------------------------------------------------ */
  var FILES = [
    'ACLOBY-P.png', 'ACLOBY-SP.png', 'ALOEVERA JUICE.png', 'AZEFAIR-500.png',
    'BECOZEST-Z.png', 'BENFOZET.png', 'CARTIBY-FORTE ADVANCE.png', 'COLDFAIR-FORTE.png',
    'CURCUMIN SYRUP.png', 'CURCUMIN TABLETS.png', 'DAPAGZIN-10.png', 'DERBY ZINC.png',
    'DERVIT ACTIVE-12G.png', 'DERVIT ACTIVE-4G.png', 'DIGYLAC.png', 'DIVALOBY-250.png',
    'DULEXA-20.png', 'DULEXA-30.png', 'ESOFAIR-40.png', 'ESOFAIR-L.png',
    'ETOXIFAIR-P.png', 'FAIR SHAPE.png', 'FAROPENAM-200.png', 'FEBUZEST-40.png',
    'FEXOFAIR-120.png', 'FLUCOZEST-150.png', 'FOLTRIME-I.png', 'FRESH-VIEW.png',
    'GABAFAIR-300.png', 'GABALIFE-NT 100-10.png', 'GABALIFE-NT 100-20.png', 'GASORAFT.png',
    'GEMFAIR-500.png', 'GEMFAIR-CCM.png', 'GEMFAIR-D3 60K.png', 'GEMFAIR-K27.png',
    'GEMFAIR-XT.png', 'GLYCOFAIR-GP2.png', 'GLYCOFAIR-M2 SR.png', 'HC QUINE.png',
    'HONEYZEST SYRUP.png', 'ITRA-100.png', 'ITRA-200.png', 'ITRA-PLUS.png',
    'KESH GLOSS.png', 'LEVETIRACETAM-500.png', 'LINZOFAIR-600.png', 'LIVFAIR-DS.png',
    'LIVFAIR-MPS.png', 'LIVFORD-DS.png', 'LULIFAIR CREAM 30gm.png', 'MECOFAIR-PLUS.png',
    'MIDODYN-5.png', 'MONTUBY-LC.png', 'MONTUFAIR-SR.png', 'MUCODRYL.png',
    'MULTIVITAMIN ACTIVE SYRUP.png', 'MULTIVITAMIN.png', 'NERIFAIR.png',
    'NERVIFAIR-FORTE INJECTION.png', 'NEUROZEST FORTE.png', 'NEUROZEST-LC.png',
    'OFLOFAIR-200.png', 'OFLOFAIR-OZ.png', 'OMEFAIR-20.png', 'PANTA-40.png',
    'PANTA-DSR.png', 'PLATOGAIN SACHET.png', 'POLYFAIR-L SYRUP.png', 'RABEE-DSR.png',
    'ROZANA.png', 'SCABIFAIR LOTION.png', 'SILOSYN-8.png', 'SILOSYN-8D.png',
    'SILYMARINE.png', 'SOFTOFAIR SACHET.png', 'SPASMOFAIR DROP.png', 'TELMIFAIR-40.png',
    'TELMIFAIR-AM.png', 'TELMIFAIR-H.png', 'TENDOSPINE-4D.png', 'TETMAFAIR SOAP.png',
    'TICAZEST-90.png', 'TINAGLIP-20.png', 'TINAGLIP-M 1000.png', 'TINAGLIP-M500.png',
    'TRENAFAIR-MF.png', 'TRYPOFAIR-10.png', 'TRYPOFAIR-25.png', 'VALENTINE-100.png',
    'VILDAFAIR-M 500.png', 'VITAMIN E-400.png', 'VITAMIN-C.png', 'VITAMIN-E 400.png',
    'ZINCOFAIR-AY-Z.png'
  ];

  /* ------------------------------------------------------------
     APPROVED PRODUCT DETAILS  ← fill this in
     Keyed by filename. Anything not supplied shows "Available on
     request" rather than invented information.

     'PANTA-40.png': {
       category: 'Gastrointestinal Care',
       description: '…',
       composition: '…',
       indications: '…',
       benefits: '…',
       dosageForm: '…',
       strengths: '…',
       packSize: '…',
       storage: '…',
       features: ['…', '…']
     },
     ------------------------------------------------------------ */
  var DETAILS = window.DERBY_PRODUCTS || {};

  var MARKETER   = 'Derby Lifescience';
  var PENDING    = 'Available on request';
  var FALLBACK   = 'Full product information — composition, indications, dosage form and pack ' +
                   'sizes — is available on request. Please contact our team for the complete ' +
                   'specification sheet.';
  var DISCLAIMER = 'For use under the supervision of a registered medical practitioner. This page is ' +
                   'a product listing and not medical advice. Always read the pack insert before use.';
  var RX         = 'For the use of a Registered Medical Practitioner &/or Pharmacist &/or Hospital &/or Laboratory.';

  var STORAGE = [
    'Store below 25°C in a dry place.',
    'Protect from direct sunlight and moisture.',
    'Keep out of reach of children.'
  ];
  var WARNINGS = [
    'Use only under medical supervision.',
    'Read the package insert before use.',
    'Not intended for self-medication.',
    'Do not exceed the recommended dose.'
  ];

  /* Indications & benefits are set per THERAPEUTIC CATEGORY (not per molecule),
     so nothing product-specific is invented beyond what the catalogue states. */
  var BY_CATEGORY = {
    'Analgesic & Anti-Inflammatory': {
      ind: ['Osteoarthritis', 'Rheumatoid arthritis', 'Joint & muscle pain', 'Back pain', 'Dental pain', 'Post-operative pain', 'Fever with pain'],
      ben: ['Fast pain relief', 'Reduces inflammation', 'Controls fever', 'Improves mobility', 'Suitable for acute & chronic pain management'] },
    'ENT (Cough, Cold & Anti-Allergic)': {
      ind: ['Allergic rhinitis', 'Cough & cold', 'Nasal congestion', 'Urticaria & allergic skin conditions', 'Bronchial allergy'],
      ben: ['Relieves allergic symptoms', 'Eases congestion', 'Loosens & clears mucus', 'Round-the-clock relief'] },
    'Dermatology & Anti-Fungal': {
      ind: ['Fungal skin infections', 'Ringworm (tinea)', 'Candidiasis', 'Scabies & parasitic infestation', 'Nail & scalp infections'],
      ben: ['Targets fungal infection at the source', 'Relieves itching & irritation', 'Supports faster skin recovery'] },
    'Neurology (Care of Brain & Nerves)': {
      ind: ['Neuropathic pain', 'Diabetic peripheral neuropathy', 'Nerve weakness & tingling', 'Adjunct in epilepsy', 'Vitamin B12 deficiency'],
      ben: ['Supports nerve repair & function', 'Relieves nerve-related pain', 'Improves nerve conduction'] },
    'Gastroenterology': {
      ind: ['Acid reflux (GERD)', 'Gastric & duodenal ulcer', 'Hyperacidity & heartburn', 'Indigestion & bloating', 'Gut flora imbalance'],
      ben: ['Sustained acid control', 'Relieves heartburn & bloating', 'Supports digestive health'] },
    'Cardiac & Hypertension': {
      ind: ['Hypertension (high blood pressure)', 'Cardiovascular risk reduction', 'Angina', 'Post-cardiac-event maintenance'],
      ben: ['Effective 24-hour blood pressure control', 'Supports cardiovascular protection', 'Convenient once-daily dosing'] },
    'Diabetic Care': {
      ind: ['Type 2 diabetes mellitus', 'Uncontrolled blood glucose on monotherapy', 'Adjunct to diet & exercise'],
      ben: ['Steady glycaemic control', 'Complementary dual/triple action', 'Supports long-term diabetes management'] },
    'Ayurvedic': {
      ind: ['Liver support & detoxification', 'Loss of appetite & indigestion', 'General wellness', 'Immunity support'],
      ben: ['Time-tested herbal formulation', 'Gentle on the system', 'Supports natural recovery'] },
    'Nutraceutical': {
      ind: ['Nutritional deficiency', 'Convalescence & recovery', 'Low energy & fatigue', 'General wellbeing'],
      ben: ['Supports immunity & energy', 'Replenishes essential vitamins & minerals', 'Aids recovery after illness'] },
    'Gynaecology (Women Care)': {
      ind: ['Heavy menstrual bleeding', 'Menstrual pain (dysmenorrhoea)', 'Pre-conception & antenatal supplementation'],
      ben: ['Targeted women-centric care', 'Supports maternal nutrition', 'Reduces excessive bleeding'] },
    'Orthopaedic Care': {
      ind: ['Osteoarthritis & joint degeneration', 'Osteoporosis & low bone density', 'Calcium / Vitamin D deficiency', 'Gout & hyperuricaemia'],
      ben: ['Supports bone & cartilage health', 'Improves joint mobility', 'Replenishes calcium & Vitamin D'] },
    'Ophthalmic': {
      ind: ['Dry eye syndrome', 'Eye irritation & grittiness', 'Lubrication for contact-lens wearers'],
      ben: ['Soothes and lubricates', 'Long-lasting comfort', 'Gentle for regular use'] },
    'Anti-Biotic': {
      ind: ['Respiratory tract infections', 'Urinary tract infections', 'Skin & soft tissue infections', 'Gastrointestinal infections'],
      ben: ['Broad-spectrum antibacterial action', 'Reliable clinical efficacy', 'Convenient dosing schedule'] }
  };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function nameOf(file) { return file.replace(/\.[a-z0-9]+$/i, ''); }

  /* The loader covers the page for ~3s. Anything above the fold must wait for it
     to hand off (loader.js adds html.is-ready) or the animation plays unseen. */
  function whenReady(cb) {
    var root = document.documentElement;
    if (root.classList.contains('is-ready') || !document.getElementById('loader')) { cb(); return; }
    if (!window.MutationObserver) { window.setTimeout(cb, 3000); return; }
    var mo = new MutationObserver(function () {
      if (root.classList.contains('is-ready')) { mo.disconnect(); cb(); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    window.setTimeout(function () { mo.disconnect(); cb(); }, 9000);   // safety net
  }

  /* dosage form is read straight from the product name where it's stated
     (e.g. "CURCUMIN SYRUP") — never guessed. */
  var FORMS = [
    [/\bsyrup\b/i, 'Syrup'], [/\btablets?\b/i, 'Tablet'], [/\bcapsules?\b/i, 'Capsule'],
    [/\bcream\b/i, 'Cream'], [/\blotion\b/i, 'Lotion'], [/\bsoap\b/i, 'Soap'],
    [/\bsachet\b/i, 'Sachet'], [/\binjection\b/i, 'Injection'], [/\bdrops?\b/i, 'Drops'],
    [/\bjuice\b/i, 'Juice'], [/\bgel\b/i, 'Gel'], [/\boil\b/i, 'Oil'],
    [/\bpowder\b/i, 'Powder'], [/\bshampoo\b/i, 'Shampoo']
  ];
  function formOf(name) {
    for (var i = 0; i < FORMS.length; i++) if (FORMS[i][0].test(name)) return FORMS[i][1];
    return '';
  }

  function describe(name, d, form) {
    if (!d.comp) return FALLBACK;
    var f = form ? form.toLowerCase() : 'product';
    var s = name + ' is a ' + f + ' containing ' + d.comp + '.';
    if (d.cat) s += ' It belongs to the Derby Lifesciences ' + d.cat + ' range';
    if (d.pack) s += ' and is supplied in a ' + d.pack + ' pack';
    return s + '.';
  }

  var PRODUCTS = FILES.map(function (file) {
    var name = nameOf(file);
    var d = DETAILS[file] || {};
    var form = d.dosageForm || formOf(name);
    var byCat = BY_CATEGORY[d.cat] || {};
    var has = !!d.comp;
    return {
      file: file,
      src: IMG_DIR + file,
      name: name,
      category: d.cat || '',
      genericName: d.generic || '',
      description: describe(name, d, form),
      composition: d.comp || '',
      strengths: d.comp || '',
      indications: has ? (d.ind || byCat.ind || []) : [],
      benefits: has ? (d.ben || byCat.ben || []) : [],
      dosageForm: form,
      packSize: d.pack || '',
      mrp: d.mrp ? ('₹ ' + d.mrp + '/-') : '',
      marketer: MARKETER,   // Derby Lifescience markets every product
      storage: has ? STORAGE : [],
      warnings: has ? WARNINGS : [],
      prescriptionStatus: has ? RX : '',
      features: [d.cat, form, d.pack].filter(Boolean)
    };
  });

  /* ============================================================
     1 · Render the grid (once) — filtering just hides cards,
         so images never reload while searching.
     ============================================================ */
  var grid = document.getElementById('productGrid');
  if (!grid) return;

  var ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
             'stroke-linecap="round" stroke-linejoin="round">' +
             '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';

  /* icons for the Add-to-Query button (CSS toggles plus↔check by .is-added) */
  var Q_PLUS  = '<svg class="dq-ico-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
  var Q_CHECK = '<svg class="dq-ico-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  grid.innerHTML = PRODUCTS.map(function (p, i) {
    return '' +
      '<article class="p-card" data-animate data-name="' + esc(p.name.toLowerCase()) + '" ' +
               'data-form="' + esc(p.dosageForm) + '">' +
        '<button class="p-card__media" type="button" data-index="' + i + '" ' +
                'aria-haspopup="dialog" aria-label="View details for ' + esc(p.name) + '">' +
          (p.dosageForm ? '<span class="p-card__badge">' + esc(p.dosageForm) + '</span>' : '') +
          '<img src="' + esc(p.src) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" />' +
          '<span class="p-card__zoom" aria-hidden="true">' + ZOOM + '</span>' +
        '</button>' +
        '<h3 class="p-card__name">' + esc(p.name) + '</h3>' +
        '<div class="p-card__actions">' +
          '<a class="btn p-card__contact" href="contact.html" aria-label="Contact about ' + esc(p.name) + '">Contact</a>' +
          '<button class="btn btn--primary p-card__query" type="button" data-index="' + i + '" aria-pressed="false">' +
            Q_PLUS + Q_CHECK + '<span class="p-card__query-label">Add to Query</span>' +
          '</button>' +
        '</div>' +
      '</article>';
  }).join('');

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.p-card'));

  /* fade each packshot in once it has actually loaded (kills the pop-in) */
  cards.forEach(function (card) {
    var media = card.querySelector('.p-card__media');
    var img = media.querySelector('img');
    if (img.complete) { media.classList.add('is-loaded'); }
    else {
      img.addEventListener('load', function () { media.classList.add('is-loaded'); });
      img.addEventListener('error', function () { media.classList.add('is-loaded'); });
    }
  });

  /* ============================================================
     2 · Search · filter · sort
     ============================================================ */
  var input   = document.getElementById('productSearch');
  var clearBt = document.getElementById('searchClear');
  var countEl = document.getElementById('productCount');
  var emptyEl = document.getElementById('productEmpty');
  var sortEl  = document.getElementById('productSort');
  var chipBox = document.getElementById('productFilters');

  var activeForm = '';        // '' = all

  /* build the dosage-form chips from what the products actually declare */
  (function buildChips() {
    if (!chipBox) return;
    var counts = {};
    PRODUCTS.forEach(function (p) { if (p.dosageForm) counts[p.dosageForm] = (counts[p.dosageForm] || 0) + 1; });
    var forms = Object.keys(counts).sort();

    var html = '<button class="p-chip" type="button" data-form="" aria-pressed="true">All' +
               '<span class="p-chip__n">' + PRODUCTS.length + '</span></button>';
    html += forms.map(function (f) {
      return '<button class="p-chip" type="button" data-form="' + esc(f) + '" aria-pressed="false">' +
             esc(f) + '<span class="p-chip__n">' + counts[f] + '</span></button>';
    }).join('');
    chipBox.innerHTML = html;

    chipBox.addEventListener('click', function (e) {
      var chip = e.target.closest('.p-chip');
      if (!chip) return;
      activeForm = chip.getAttribute('data-form');
      chipBox.querySelectorAll('.p-chip').forEach(function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });
      apply();
    });
  })();

  function setCount(n) {
    if (!countEl) return;
    countEl.innerHTML = (n === PRODUCTS.length)
      ? '<b>' + PRODUCTS.length + '</b> products'
      : 'Showing <b>' + n + '</b> of ' + PRODUCTS.length + ' products';
  }

  function apply() {
    var q = (input ? input.value : '').trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var okName = !q || card.getAttribute('data-name').indexOf(q) !== -1;
      var okForm = !activeForm || card.getAttribute('data-form') === activeForm;
      var match = okName && okForm;
      card.hidden = !match;
      if (match) shown++;
    });
    if (emptyEl) emptyEl.hidden = shown !== 0;
    if (clearBt) clearBt.hidden = !q;
    setCount(shown);
  }

  function sortCards(dir) {
    var sorted = cards.slice().sort(function (a, b) {
      var an = a.getAttribute('data-name'), bn = b.getAttribute('data-name');
      return dir === 'za' ? bn.localeCompare(an) : an.localeCompare(bn);
    });
    var frag = document.createDocumentFragment();
    sorted.forEach(function (c) { frag.appendChild(c); });
    grid.appendChild(frag);          // re-orders without destroying loaded images
  }

  setCount(PRODUCTS.length);

  if (input) {
    var t;
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(apply, 90);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; apply(); }
    });
  }
  if (clearBt) {
    clearBt.addEventListener('click', function () { input.value = ''; apply(); input.focus(); });
  }
  if (sortEl) {
    sortEl.addEventListener('change', function () { sortCards(sortEl.value); });
  }

  /* press "/" anywhere to jump to search */
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (document.activeElement.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    e.preventDefault();
    if (input) { input.focus(); input.select(); }
  });

  /* ---------- hero counters (run once the loader has handed off) ---------- */
  whenReady(function () {
    var nodes = document.querySelectorAll('.p-counter');
    if (!nodes.length) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodes.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduced) { el.textContent = target; return; }
      var start = null, dur = 1600;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  });

  /* ---------- back to top ---------- */
  (function toTop() {
    var btn = document.getElementById('toTop');
    if (!btn) return;
    function check() { btn.hidden = window.pageYOffset < 600; }
    window.addEventListener('scroll', check, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    check();
  })();

  /* ---------- button ripple ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn');
    if (!btn) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var r = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    var s = document.createElement('span');
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top  = (e.clientY - r.top - size / 2) + 'px';
    btn.appendChild(s);
    setTimeout(function () { s.remove(); }, 600);
  });

  /* ============================================================
     3 · Reveal on scroll
     ============================================================ */
  whenReady(function reveal() {
    var items = document.querySelectorAll('[data-animate]');
    if (!items.length) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (el) { io.observe(el); });
  });

  /* ============================================================
     4 · Details modal
     ============================================================ */
  var modal = document.getElementById('productModal');
  if (!modal) return;

  var elImage = document.getElementById('pmImage');
  var elCat   = document.getElementById('pmCategory');
  var elTitle = document.getElementById('pmTitle');
  var elDesc  = document.getElementById('pmDesc');
  var elTags  = document.getElementById('pmTags');
  var elSpecs = document.getElementById('pmSpecs');
  var elDisc  = document.getElementById('pmDisclaimer');
  var elPos   = document.getElementById('pmPos');
  var btnPrev = document.getElementById('pmPrev');
  var btnNext = document.getElementById('pmNext');
  var lastFocus = null, isOpen = false, current = 0;

  /* only step through what's currently visible in the grid */
  function visibleIndexes() {
    return cards.reduce(function (acc, card, i) {
      if (!card.hidden) acc.push(i);
      return acc;
    }, []);
  }
  function step(dir) {
    var vis = visibleIndexes();
    if (vis.length < 2) return;
    var at = vis.indexOf(current);
    var next = vis[(at + dir + vis.length) % vis.length];
    show(next);
    if (window.DerbyProductAssemble) window.DerbyProductAssemble(false);   // re-assemble the new packshot
  }

  function fill(p) {
    elImage.src = p.src;
    elImage.alt = p.name;
    elTitle.textContent = p.name;
    elDesc.textContent  = p.description;
    elDisc.textContent  = DISCLAIMER;

    if (p.category) { elCat.textContent = p.category; elCat.hidden = false; }
    else { elCat.textContent = ''; elCat.hidden = true; }

    elTags.innerHTML = p.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    elTags.hidden = !p.features.length;

    function list(items) {
      return '<ul class="pm__list">' + items.map(function (i) {
        return '<li>' + esc(i) + '</li>';
      }).join('') + '</ul>';
    }

    var rows = [
      ['Generic Name',        p.genericName],
      ['Composition',         p.composition],
      ['Strength',            p.strengths],
      ['Dosage Form',         p.dosageForm],
      ['Pack Size',           p.packSize],
      ['M.R.P.',              p.mrp],
      ['Indications',         p.indications],
      ['Benefits',            p.benefits],
      ['Storage',             p.storage],
      ['Warnings',            p.warnings],
      ['Prescription',        p.prescriptionStatus],
      ['Marketed by',         p.marketer]
    ];

    elSpecs.innerHTML = rows.map(function (r) {
      var v = r[1];
      var isArr = Array.isArray(v);
      var empty = isArr ? !v.length : !v;
      var val = empty ? esc(PENDING) : (isArr ? list(v) : esc(v));
      var cls = empty ? ' class="is-pending"' : (r[0] === 'M.R.P.' ? ' class="is-mrp"' : '');
      return '<div class="pm__row"><dt>' + esc(r[0]) + '</dt><dd' + cls + '>' + val + '</dd></div>';
    }).join('');
  }

  function focusables() {
    return modal.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
  }

  /* swap the modal's contents to another product (used by prev/next) */
  function show(index) {
    var p = PRODUCTS[index];
    if (!p) return;
    current = index;
    fill(p);
    var vis = visibleIndexes();
    if (elPos) elPos.textContent = (vis.indexOf(index) + 1) + ' of ' + vis.length;
    var single = vis.length < 2;
    if (btnPrev) btnPrev.hidden = single;
    if (btnNext) btnNext.hidden = single;
    syncHash(index);
    syncModalQueryBtn();
  }

  function open(index) {
    var p = PRODUCTS[index];
    if (!p) return;
    lastFocus = document.activeElement;
    show(index);
    modal.hidden = false;
    document.documentElement.classList.add('pm-open');
    window.requestAnimationFrame(function () {
      modal.classList.add('is-open');
      isOpen = true;
      var c = modal.querySelector('.pm__close');
      if (c) c.focus();
    });
    if (window.DerbyProductAssemble) window.DerbyProductAssemble(true);   // fly the packshot together, then reveal details
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('pm-open');
    if (location.hash) {                       // drop the deep-link on close
      history.replaceState(null, '', location.pathname + location.search);
    }
    window.setTimeout(function () {
      modal.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 380);
  }

  /* ---------- shareable deep links (#product=NAME) ---------- */
  function slug(name) { return encodeURIComponent(name.replace(/\s+/g, '-')); }

  function syncHash(index) {
    var p = PRODUCTS[index];
    if (!p) return;
    history.replaceState(null, '', '#product=' + slug(p.name));
  }

  function openFromHash() {
    var m = /#product=(.+)$/.exec(location.hash);
    if (!m) return;
    var want = decodeURIComponent(m[1]).replace(/-/g, ' ').toLowerCase();
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].name.toLowerCase() === want) { open(i); return; }
    }
  }

  grid.addEventListener('click', function (e) {
    var trigger = e.target.closest('.p-card__media');
    if (!trigger) return;
    open(parseInt(trigger.getAttribute('data-index'), 10));
  });

  /* ---------- Add to Query (enquiry basket) ---------- */
  /* toggle the product in the basket without leaving the page */
  grid.addEventListener('click', function (e) {
    var q = e.target.closest('.p-card__query');
    if (!q) return;
    var p = PRODUCTS[parseInt(q.getAttribute('data-index'), 10)];
    if (!p || !window.DerbyQuery) return;
    if (window.DerbyQuery.has(p.name)) {
      window.DerbyQuery.remove(p.name);
    } else {
      window.DerbyQuery.add({ sku: p.name, name: p.name, category: p.category || '', src: p.src, qty: 1 });
      q.classList.add('just-added');
      window.setTimeout(function () { q.classList.remove('just-added'); }, 450);
    }
  });

  /* keep every card button — and the modal button — mirroring the basket */
  var btnPmQuery = document.getElementById('pmAddQuery');
  function syncModalQueryBtn() {
    if (!btnPmQuery || !window.DerbyQuery) return;
    var p = PRODUCTS[current];
    var on = !!(p && window.DerbyQuery.has(p.name));
    btnPmQuery.classList.toggle('is-added', on);
    var lbl = btnPmQuery.querySelector('.pm-q-label');
    if (lbl) lbl.textContent = on ? 'Added to Query' : 'Add to Query';
  }
  function syncQueryButtons() {
    if (!window.DerbyQuery) return;
    Array.prototype.forEach.call(grid.querySelectorAll('.p-card__query'), function (btn) {
      var p = PRODUCTS[parseInt(btn.getAttribute('data-index'), 10)];
      var on = !!(p && window.DerbyQuery.has(p.name));
      btn.classList.toggle('is-added', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var lbl = btn.querySelector('.p-card__query-label');
      if (lbl) lbl.textContent = on ? 'Added' : 'Add to Query';
    });
    syncModalQueryBtn();
  }
  document.addEventListener('derbyquery:change', syncQueryButtons);
  if (btnPmQuery) btnPmQuery.addEventListener('click', function () {
    var p = PRODUCTS[current];
    if (!p || !window.DerbyQuery) return;
    if (window.DerbyQuery.has(p.name)) window.DerbyQuery.remove(p.name);
    else window.DerbyQuery.add({ sku: p.name, name: p.name, category: p.category || '', src: p.src, qty: 1 });
  });
  syncQueryButtons();   // reflect a query restored from a previous visit

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) close();
  });

  if (btnPrev) btnPrev.addEventListener('click', function () { step(-1); });
  if (btnNext) btnNext.addEventListener('click', function () { step(1); });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1);  return; }
    if (e.key !== 'Tab') return;

    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* open a shared link once the loader has cleared */
  whenReady(openFromHash);
})();
