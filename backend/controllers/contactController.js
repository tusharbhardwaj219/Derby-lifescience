'use strict';

const Contact = require('../models/Contact');
const { isDbConnected } = require('../config/database');
const { sendAdminNotification, sendUserConfirmation } = require('../config/mailer');

/** Collapse newlines/tabs in single-line fields (anti header-injection). */
function oneLine(v) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim();
}

/**
 * POST /api/contact
 * Validation + rate limiting run as middleware before this. Here we:
 *  1. drop spam (honeypot), 2. save to MongoDB, 3. email the company +
 *  confirm the visitor, 4. record the email outcome, 5. respond.
 * Success = the inquiry was captured (saved OR emailed) — never a total loss.
 */
async function submitContact(req, res, next) {
  try {
    // 1 · Honeypot: a hidden field real users never fill. If a bot filled it,
    //     pretend success and silently drop the submission.
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

    // 2 · Persist first (when the DB is connected).
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

    // 3 · Email the company; confirm the visitor (best-effort).
    let emailOk = false;
    try {
      await sendAdminNotification(data);
      emailOk = true;
      sendUserConfirmation(data).catch(function (e) {
        console.warn('[contact] confirmation email failed:', e.message);
      });
    } catch (e) {
      console.error('[contact] delivery failed:', e.message);
    }

    // 4 · Record the email outcome on the stored inquiry.
    if (saved) {
      Contact.updateOne({ _id: saved._id }, { $set: { emailStatus: emailOk ? 'sent' : 'failed' } })
        .catch(function (e) { console.warn('[contact] status update failed:', e.message); });
    }

    // 5 · Respond. Only a total loss (neither saved nor emailed) is an error.
    if (emailOk || saved) {
      return res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitContact };
