'use strict';
/*
 * API endpoint configuration for the contact form.
 *
 * Frontend (Vercel) and backend (Railway/Render) live on DIFFERENT origins,
 * so the form must be told where the backend is. js/contact.js reads
 * window.DERBY_API_BASE if it is set.
 *
 * • Local development (localhost / 127.0.0.1): left UNSET on purpose, so
 *   contact.js uses its own same-origin detection (your local Express server
 *   serves both the site and the API on :4000).
 *
 * • Production: set it to your deployed backend's base URL below —
 *   NO trailing slash, NO "/api".  e.g.  https://derby-backend.up.railway.app
 */
(function () {
  var host = location.hostname;
  var isLocal = (host === 'localhost' || host === '127.0.0.1');

  if (!isLocal) {
    // 👉 AFTER you deploy the backend to Railway/Render, paste its URL here:
    window.DERBY_API_BASE = 'https://REPLACE-WITH-YOUR-BACKEND-URL.up.railway.app';
  }
})();
