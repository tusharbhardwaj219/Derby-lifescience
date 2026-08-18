'use strict';

/*
 * Vercel Serverless Function — POST /api/query
 *
 * Receives ONE consolidated stockist product enquiry (many products,
 * one Query ID), stores it in MongoDB Atlas (best-effort) and emails it
 * to the company via the Resend HTTP API (Vercel blocks outbound SMTP).
 *
 * The WhatsApp side is a pure client-side wa.me deep link (js/query.js) —
 * this endpoint is the email + database record half of the same enquiry.
 *
 * Config comes from Vercel Environment Variables (shared with /api/contact):
 *   RESEND_API_KEY   (required for email)
 *   CONTACT_TO       (recipient inbox; defaults to approval@derbylifesciences.com)
 *   MONGODB_URI      (optional — Atlas, for the query record)
 *   RESEND_FROM      (optional — verified sender)
 */

const mongoose = require('mongoose');

/* ---- MongoDB (best-effort, cached across warm invocations) ---- */
let connPromise = null;
async function getDb() {
  if (!process.env.MONGODB_URI) return false;
  if (mongoose.connection.readyState === 1) return true;
  if (!connPromise) {
    mongoose.set('strictQuery', true);
    connPromise = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }
  try { await connPromise; return mongoose.connection.readyState === 1; }
  catch (e) { connPromise = null; console.error('[query] db connect:', e.message); return false; }
}

const StockistQuery = mongoose.models.StockistQuery || mongoose.model('StockistQuery', new mongoose.Schema({
  queryId:  { type: String, index: true },
  name: String, company: String, mobile: String, email: String,
  city: String, state: String, gst: String, licence: String,
  products: [{ name: String, sku: String, qty: Number }],
  message: String,
  ip: String, userAgent: String,
  status:        { type: String, default: 'New' },      // New → Under Review → Contacted → Quotation Shared → Order Confirmed → Order Placed → Completed
  whatsappStatus:{ type: String, default: 'opened' },
  emailStatus:   { type: String, default: 'pending' }
}, { timestamps: true }));

/* ---- helpers ---- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function oneLine(v) { return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim(); }
function clampQty(n) { n = parseInt(n, 10); if (isNaN(n) || n < 1) n = 1; if (n > 100000) n = 100000; return n; }

/* ---- Email via Resend HTTP API ---- */
async function sendEmail(q) {
  if (!process.env.RESEND_API_KEY) { console.error('[query] RESEND_API_KEY not set'); return false; }
  const to = process.env.CONTACT_TO || process.env.contact_to || 'approval@derbylifesciences.com';

  const rows = q.products.map(function (p, i) {
    return '<tr>' +
      '<td style="padding:7px 10px;border-bottom:1px solid #eef1ee">' + (i + 1) + '</td>' +
      '<td style="padding:7px 10px;border-bottom:1px solid #eef1ee"><b>' + esc(p.name) + '</b></td>' +
      '<td style="padding:7px 10px;border-bottom:1px solid #eef1ee;color:#6b7669">' + esc(p.sku) + '</td>' +
      '<td style="padding:7px 10px;border-bottom:1px solid #eef1ee;text-align:right"><b>' + esc(p.qty) + '</b></td>' +
    '</tr>';
  }).join('');

  const info = function (label, val) {
    if (!val) return '';
    return '<tr><td style="padding:3px 0;color:#6b7669;width:150px">' + esc(label) + '</td><td style="padding:3px 0;color:#1E2821"><b>' + esc(val) + '</b></td></tr>';
  };

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px">' +
    '<h2 style="color:#1E2821;margin:0 0 4px">New Stockist Product Enquiry</h2>' +
    '<p style="margin:0 0 16px;color:#47624F;font-weight:700;font-size:15px">Query ID: ' + esc(q.queryId) + '</p>' +
    '<table style="font-size:14px;border-collapse:collapse;width:100%">' +
      info('Stockist Name', q.name) + info('Company Name', q.company) +
      info('Mobile', q.mobile) + info('Email', q.email) +
      info('Location', [q.city, q.state].filter(Boolean).join(', ')) +
      info('GST Number', q.gst) + info('Drug Licence', q.licence) +
    '</table>' +
    '<h3 style="color:#1E2821;margin:20px 0 8px;font-size:15px">Products Requested (' + q.products.length + ')</h3>' +
    '<table style="font-size:14px;border-collapse:collapse;width:100%;border:1px solid #eef1ee">' +
      '<thead><tr style="background:#f6f8f6;color:#47624F;text-align:left">' +
        '<th style="padding:8px 10px">#</th><th style="padding:8px 10px">Product</th>' +
        '<th style="padding:8px 10px">Code</th><th style="padding:8px 10px;text-align:right">Qty</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    (q.message ? '<h3 style="color:#1E2821;margin:20px 0 6px;font-size:15px">Additional Requirement</h3><p style="font-size:14px;line-height:1.6;color:#263229">' + esc(q.message).replace(/\n/g, '<br>') + '</p>' : '') +
    '<hr style="border:none;border-top:1px solid #eef1ee;margin:22px 0 10px">' +
    '<small style="color:#6b7669">Submitted: ' + esc(q.date) + ' &middot; IP: ' + esc(q.ip || '-') + '</small>' +
    '</div>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Derby Lifescience Website <onboarding@resend.dev>',
        to: [to],
        reply_to: q.email,
        subject: 'New Stockist Product Enquiry – ' + q.queryId,
        html: html
      })
    });
    if (r.ok) return true;
    console.error('[query] resend failed:', r.status, await r.text());
    return false;
  } catch (e) { console.error('[query] resend error:', e.message); return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success: false, message: 'Method not allowed.' }); }

  const b = (req.body && typeof req.body === 'object') ? req.body : {};

  // Validate the essentials
  const name = oneLine(b.name), email = oneLine(b.email), mobile = oneLine(b.mobile);
  const products = Array.isArray(b.products) ? b.products
    .filter(function (p) { return p && p.name; })
    .map(function (p) { return { name: oneLine(p.name), sku: oneLine(p.sku || p.name), qty: clampQty(p.qty || 1) }; }) : [];

  const errors = [];
  if (name.length < 2) errors.push({ field: 'name', message: 'Full name is required.' });
  if (mobile.replace(/\D/g, '').length < 10) errors.push({ field: 'mobile', message: 'Valid mobile number is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push({ field: 'email', message: 'Valid email is required.' });
  if (!products.length) errors.push({ field: 'products', message: 'At least one product is required.' });
  if (errors.length) return res.status(422).json({ success: false, message: 'Validation failed.', errors: errors });

  const queryId = oneLine(b.queryId) || ('DLS-QRY-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-000');
  const data = {
    queryId: queryId, name: name, email: email, mobile: mobile,
    company: oneLine(b.company || ''), city: oneLine(b.city || ''), state: oneLine(b.state || ''),
    gst: oneLine(b.gst || ''), licence: oneLine(b.licence || ''), message: String(b.message || '').trim(),
    products: products,
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    userAgent: oneLine(req.headers['user-agent'] || ''),
    date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })
  };

  // Save (best-effort) — never blocks the email.
  let saved = null;
  try {
    if (await getDb()) saved = await StockistQuery.create(Object.assign({}, data, {
      whatsappStatus: b.whatsappOpened ? 'opened' : 'pending', emailStatus: 'pending'
    }));
  } catch (e) { console.error('[query] db save:', e.message); }

  // Email the company (the real delivery path on Vercel).
  const emailOk = await sendEmail(data);
  if (saved) StockistQuery.updateOne({ _id: saved._id }, { $set: { emailStatus: emailOk ? 'sent' : 'failed' } }).catch(function () {});

  if (emailOk || saved) return res.status(200).json({ success: true, queryId: queryId, emailStatus: emailOk ? 'sent' : 'stored' });
  return res.status(500).json({ success: false, message: 'Could not record the enquiry.', queryId: queryId });
};
