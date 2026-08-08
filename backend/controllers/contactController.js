'use strict';

const Contact = require('../models/Contact');
const { isDbConnected } = require('../config/database');
const { sendAdminNotification, sendUserConfirmation } = require('../config/mailer');
const { appendInquiry } = require('../utils/inquiryStore');

/** Collapse newlines/tabs in single-line fields (anti header-injection). */
function oneLine(v) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim();
}

/**
 * Background delivery — runs AFTER the user has already been told "success".
 * Saves to MongoDB (if connected) and emails the company + visitor. Every
 * outcome is logged; nothing here can affect the user-facing response, so a
 * slow (5–8s) or failing email never shows the visitor an error.
 */
function deliverInBackground(data) {
  (async function () {
    let saved = null;

    if (isDbConnected()) {
      try {
        saved = await Contact.create({
          name: data.name, email: data.email, phone: data.phone,
          company: data.company, subject: data.subject, message: data.message,
          ip: data.ip, userAgent: data.userAgent, emailStatus: 'pending'
        });
      } catch (e) {
        console.error('[contact] db save failed:', e.message);
      }
    }

    let emailOk = false;
    try {
      await sendAdminNotification(data);
      emailOk = true;
      sendUserConfirmation(data).catch(function (e) {
        console.warn('[contact] confirmation email failed:', e.message);
      });
    } catch (e) {
      console.error('[contact] delivery email failed:', e.message);
    }

    if (saved) {
      Contact.updateOne({ _id: saved._id }, { $set: { emailStatus: emailOk ? 'sent' : 'failed' } })
        .catch(function (e) { console.warn('[contact] status update failed:', e.message); });
    }

    if (!saved && !emailOk) {
      // Neither DB nor email worked — but the inquiry is safe in data/inquiries.jsonl.
      console.error('[contact] NOTE: inquiry from ' + data.email +
        ' was saved to data/inquiries.jsonl only (DB + email both unavailable).');
    }
  })().catch(function (e) {
    console.error('[contact] background delivery crashed:', e.message);
  });
}

/**
 * POST /api/contact
 * Validation + rate limiting run as middleware before this. Here we durably
 * capture the inquiry, respond immediately, then deliver in the background.
 */
function submitContact(req, res) {
  // Honeypot: a hidden field real users never fill. If a bot filled it,
  // pretend success and silently drop the submission.
  if (typeof req.body.website === 'string' && req.body.website.trim() !== '') {
    return res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
  }

  const data = {
    name: oneLine(req.body.name),
    email: oneLine(req.body.email),
    phone: oneLine(req.body.phone || ''),
    company: oneLine(req.body.company || ''),
    subject: oneLine(req.body.subject || '') || 'General Inquiry',
    message: String(req.body.message || '').trim(),
    ip: req.ip,
    userAgent: oneLine(req.get('user-agent') || ''),
    date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })
  };

  // 1 · Durable capture first — instant, no network, cannot fail the request.
  appendInquiry(data);

  // 2 · Tell the user immediately. The submission is safely captured.
  res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });

  // 3 · Deliver (DB + email) in the background — never blocks or fails the response.
  deliverInBackground(data);
}

module.exports = { submitContact };
