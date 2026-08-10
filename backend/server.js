'use strict';

// Load .env sitting next to this file (works from any launch directory).
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB, disconnectDB, isDbConnected } = require('./config/database');
const { verifyMailer } = require('./config/mailer');
const contactRoutes = require('./routes/contactRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const PORT = Number(process.env.PORT) || 4000;
const isProd = process.env.NODE_ENV === 'production';

/* ── Build the Express app ─────────────────────────────────── */
const app = express();

app.set('trust proxy', 1);      // correct client IPs behind a proxy (rate limiting)
app.disable('x-powered-by');

// Security headers. CSP is tuned to what the website actually loads:
// Google Fonts, Unsplash images, and the Google Maps embed on the contact page.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://plus.unsplash.com'],
      frameSrc: ["'self'", 'https://www.google.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));

app.use(express.json({ limit: '12kb' }));
app.use(express.urlencoded({ extended: false, limit: '12kb' }));
if (!isProd) app.use(morgan('tiny'));

// CORS — only the configured origins (the site is same-origin, so this is a safety net).
const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);                 // same-origin / curl / server-to-server
    if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'OPTIONS']
}));

/* ── API routes ────────────────────────────────────────────── */
app.get('/api/health', async function (req, res) {
  let smtp = 'unconfigured';
  try { await verifyMailer(); smtp = 'ok'; } catch (e) { smtp = 'unconfigured'; }
  res.json({ success: true, status: 'ok', smtp: smtp, db: isDbConnected() ? 'connected' : 'disconnected' });
});

app.use('/api/contact', contactRoutes);

/* ── Serve the website (single origin, no separate Live Server needed) ── */
const SITE_DIR = path.resolve(__dirname, '..', 'frontend', 'public');
if (fs.existsSync(SITE_DIR)) {
  app.use(express.static(SITE_DIR, {
    extensions: ['html'],           // /about also serves about.html
    index: 'index.html',
    setHeaders: function (res) {
      if (!isProd) res.setHeader('Cache-Control', 'no-store'); // edits show on a plain reload
    }
  }));
} else {
  console.warn('  ⚠  Website folder not found at ' + SITE_DIR + ' — serving API only.');
}

app.use(notFound);
app.use(errorHandler);

/* ── Startup config check (loud, so failures aren't silent) ── */
function warnAboutConfig() {
  const LINE = '═'.repeat(60);
  const PLACEHOLDERS = ['your-address@gmail.com', 'your-16-char-app-password'];
  const stillExample = ['SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].filter(function (k) {
    const v = process.env[k] || '';
    return PLACEHOLDERS.some(function (p) { return v.indexOf(p) !== -1; });
  });
  if (stillExample.length) {
    console.warn('\n' + LINE);
    console.warn('  ⚠  EMAIL NOT CONFIGURED — the contact form cannot send email.');
    console.warn('     Still placeholder in .env: ' + stillExample.join(', '));
    console.warn('     Set a real Gmail address + 16-char App Password:');
    console.warn('       https://myaccount.google.com/apppasswords');
    console.warn('     (MAIL_FROM must match SMTP_USER.) Then restart the server.');
    console.warn(LINE + '\n');
  }
}

/* ── Start ─────────────────────────────────────────────────── */
(async function start() {
  await connectDB();          // never throws; logs its own status
  warnAboutConfig();

  const server = app.listen(PORT, function () {
    const url = 'http://localhost:' + PORT;
    console.log('');
    console.log('  ✅ Derby Lifescience is running');
    console.log('');
    console.log('     Website : ' + url);
    console.log('     Health  : ' + url + '/api/health');
    console.log('     Inquiries → ' + (process.env.CONTACT_TO || 'approval@derbylifesciences.com'));
    console.log('');
  });

  ['SIGINT', 'SIGTERM'].forEach(function (sig) {
    process.on(sig, function () {
      console.log('\n' + sig + ' received — shutting down.');
      server.close(async function () {
        await disconnectDB();
        process.exit(0);
      });
    });
  });
})();

module.exports = app;
