'use strict';

/*
 * Vercel Serverless Function — POST /api/contact
 *
 * Email is sent via the Resend HTTP API (Vercel blocks outbound SMTP, so
 * nodemailer/GoDaddy SMTP cannot work here). Inquiry is also saved to MongoDB
 * Atlas (best-effort). Config comes from Vercel Environment Variables:
 *   RESEND_API_KEY   (required for email)
 *   CONTACT_TO       (recipient inbox)
 *   MONGODB_URI      (optional — Atlas, for saving a record)
 */

const mongoose = require('mongoose');

/* ---- MongoDB (best-effort, cached) ---- */
let connPromise = null;
async function getDb() {
  if (!process.env.MONGODB_URI) return false;
  if (mongoose.connection.readyState === 1) return true;
  if (!connPromise) {
    mongoose.set('strictQuery', true);
    connPromise = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }
  try { await connPromise; return mongoose.connection.readyState === 1; }
  catch (e) { connPromise = null; console.error('[contact] db connect:', e.message); return false; }
}
const Contact = mongoose.models.Contact || mongoose.model('Contact', new mongoose.Schema({
  name: String, email: String, phone: String, company: String, subject: String,
  message: String, ip: String, userAgent: String, emailStatus: { type: String, default: 'pending' }
}, { timestamps: true }));

/* ---- helpers ---- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function oneLine(v) { return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim(); }

/* ---- Email via Resend HTTP API (works on Vercel; no SMTP) ---- */
async function sendEmail(data) {
  if (!process.env.RESEND_API_KEY) { console.error('[contact] RESEND_API_KEY not set'); return false; }
  const to = process.env.CONTACT_TO || process.env.contact_to || 'info@fairfordpharma.com';
  const html =
    '<h2 style="color:#1E2821;margin:0 0 12px">New Contact Form Inquiry</h2>' +
    '<p style="font-size:15px;line-height:1.6"><b>Name:</b> ' + esc(data.name) +
    '<br><b>Email:</b> ' + esc(data.email) +
    '<br><b>Phone:</b> ' + esc(data.phone || '-') +
    '<br><b>Company:</b> ' + esc(data.company || '-') +
    '<br><b>Subject:</b> ' + esc(data.subject) + '</p>' +
    '<p style="font-size:15px;line-height:1.6"><b>Message:</b><br>' + esc(data.message).replace(/\n/g, '<br>') + '</p>' +
    '<hr><small style="color:#6b7669">Submitted: ' + esc(data.date) + ' &middot; IP: ' + esc(data.ip || '-') + '</small>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Derby Lifescience Website <onboarding@resend.dev>',
        to: [to],
        reply_to: data.email,
        subject: 'New Contact Form Inquiry – Derby Lifescience',
        html: html
      })
    });
    if (r.ok) return true;
    console.error('[contact] resend failed:', r.status, await r.text());
    return false;
  } catch (e) { console.error('[contact] resend error:', e.message); return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success: false, message: 'Method not allowed.' }); }

  const b = (req.body && typeof req.body === 'object') ? req.body : {};

  // Honeypot
  if (typeof b.website === 'string' && b.website.trim() !== '') {
    return res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
  }

  // Validate
  const name = oneLine(b.name), email = oneLine(b.email), message = String(b.message || '').trim();
  const errors = [];
  if (name.length < 2) errors.push({ field: 'name', message: 'Full name is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push({ field: 'email', message: 'Enter a valid email address.' });
  if (message.length < 10) errors.push({ field: 'message', message: 'Message must be at least 10 characters.' });
  if (errors.length) return res.status(422).json({ success: false, message: 'Validation failed.', errors: errors });

  const data = {
    name: name, email: email, message: message,
    phone: oneLine(b.phone || ''), company: oneLine(b.company || ''),
    subject: oneLine(b.subject || '') || 'General Inquiry',
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    userAgent: oneLine(req.headers['user-agent'] || ''),
    date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })
  };

  // Save (best-effort) — never blocks the email.
  let saved = null;
  try { if (await getDb()) saved = await Contact.create(Object.assign({}, data, { emailStatus: 'pending' })); }
  catch (e) { console.error('[contact] db save:', e.message); }

  // Email via Resend (the real delivery path on Vercel).
  const emailOk = await sendEmail(data);

  if (saved) Contact.updateOne({ _id: saved._id }, { $set: { emailStatus: emailOk ? 'sent' : 'failed' } }).catch(function () {});

  if (emailOk || saved) return res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
};
