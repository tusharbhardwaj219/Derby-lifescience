'use strict';

/*
 * Vercel Serverless Function — POST /api/contact
 *
 * Runs on the SAME Vercel deployment as the website (same origin → no CORS,
 * no separate backend URL). Validates → saves to MongoDB Atlas → emails via
 * GoDaddy SMTP → responds. Config comes from Vercel Environment Variables.
 */

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

/* ---- MongoDB connection, cached across warm invocations ---- */
let connPromise = null;
async function getDb() {
  if (!process.env.MONGODB_URI) return false;
  if (mongoose.connection.readyState === 1) return true;
  if (!connPromise) {
    mongoose.set('strictQuery', true);
    connPromise = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  }
  try { await connPromise; return mongoose.connection.readyState === 1; }
  catch (e) { connPromise = null; console.error('[contact] db connect failed:', e.message); return false; }
}

const ContactSchema = new mongoose.Schema(
  {
    name: String, email: String, phone: String, company: String,
    subject: String, message: String, ip: String, userAgent: String,
    emailStatus: { type: String, default: 'pending' }
  },
  { timestamps: true }
);
const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);

/* ---- helpers ---- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function oneLine(v) { return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim(); }
function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const b = (req.body && typeof req.body === 'object') ? req.body : {};

  // Honeypot — bots fill this hidden field. Silently accept and drop.
  if (typeof b.website === 'string' && b.website.trim() !== '') {
    return res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
  }

  // Validate
  const name = oneLine(b.name);
  const email = oneLine(b.email);
  const message = String(b.message || '').trim();
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

  // 1 · Save (best-effort)
  let saved = null;
  try {
    if (await getDb()) saved = await Contact.create(Object.assign({}, data, { emailStatus: 'pending' }));
  } catch (e) { console.error('[contact] db save failed:', e.message); }

  // 2 · Email the company (+ optional visitor confirmation)
  let emailOk = false;
  try {
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const to = process.env.CONTACT_TO;
    const text = 'A new inquiry from the Derby Lifescience website.\n\n' +
      'Name: ' + data.name + '\nEmail: ' + data.email + '\nPhone: ' + (data.phone || '-') +
      '\nCompany: ' + (data.company || '-') + '\nSubject: ' + data.subject +
      '\n\nMessage:\n' + data.message + '\n\nSubmitted: ' + data.date + '\nIP: ' + (data.ip || '-');
    const html = '<h2 style="color:#1E2821">New Contact Form Inquiry</h2>' +
      '<p><b>Name:</b> ' + esc(data.name) + '<br><b>Email:</b> ' + esc(data.email) +
      '<br><b>Phone:</b> ' + esc(data.phone || '-') + '<br><b>Company:</b> ' + esc(data.company || '-') +
      '<br><b>Subject:</b> ' + esc(data.subject) + '</p>' +
      '<p><b>Message:</b><br>' + esc(data.message).replace(/\n/g, '<br>') + '</p>' +
      '<hr><small>Submitted: ' + esc(data.date) + ' &middot; IP: ' + esc(data.ip || '-') + '</small>';

    await transport().sendMail({
      from: from, to: to,
      replyTo: '"' + data.name.replace(/"/g, '') + '" <' + data.email + '>',
      subject: 'New Contact Form Inquiry – Derby Lifescience',
      text: text, html: html
    });
    emailOk = true;

    if (String(process.env.SEND_ACK) === 'true') {
      transport().sendMail({
        from: from, to: '"' + data.name.replace(/"/g, '') + '" <' + data.email + '>',
        subject: 'We received your message – Derby Lifescience',
        text: 'Hello ' + data.name + ',\n\nThank you for contacting Derby Lifescience. Your inquiry has been received and our team will get back to you shortly.\n\n— Team Derby Lifescience',
        html: '<p>Hello ' + esc(data.name) + ',</p><p>Thank you for contacting <b>Derby Lifescience</b>. Your inquiry has been received and our team will get back to you shortly.</p><p>— Team Derby Lifescience</p>'
      }).catch(function (e) { console.warn('[contact] ack failed:', e.message); });
    }
  } catch (e) { console.error('[contact] email failed:', e.message); }

  if (saved) {
    Contact.updateOne({ _id: saved._id }, { $set: { emailStatus: emailOk ? 'sent' : 'failed' } })
      .catch(function () {});
  }

  if (emailOk || saved) {
    return res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
  }
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
};
