'use strict';

/* 404 — JSON for the API, a small HTML page for the website. */
function notFound(req, res) {
  if (req.path.indexOf('/api') === 0) {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  return res.status(404).type('html').send(
    '<!doctype html><meta charset="utf-8"><title>404 — Derby Lifescience</title>' +
    '<div style="font:16px/1.6 system-ui,sans-serif;max-width:520px;margin:18vh auto;padding:0 24px;color:#263229;text-align:center">' +
    '<h1 style="font-size:56px;margin:0;color:#769382">404</h1>' +
    '<p style="margin:8px 0 22px">That page doesn\'t exist.</p>' +
    '<a href="/" style="color:#47624f;font-weight:700">← Back to home</a></div>'
  );
}

/* Central error handler — logs the detail server-side, never leaks internals. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && /CORS/.test(err.message || '')) {
    return res.status(403).json({ success: false, message: 'Origin not allowed.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large.' });
  }
  console.error('[error]', (err && err.message) || err);
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
}

module.exports = { notFound, errorHandler };
