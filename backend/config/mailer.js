'use strict';

const nodemailer = require('nodemailer');
const { adminEmail, userConfirmationEmail } = require('../utils/emailTemplates');

/* A single lazily-created transport, reused across requests. */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE) === 'true', // 465 = SSL, 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

/** Verify SMTP credentials/connection (used by /api/health). */
async function verifyMailer() {
  return getTransporter().verify();
}

/** Notify the company inbox about a new inquiry. Throws on failure. */
async function sendAdminNotification(data) {
  const mail = adminEmail(data);
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.CONTACT_TO || 'approval@derbylifesciences.com',
    replyTo: '"' + String(data.name).replace(/"/g, '') + '" <' + data.email + '>',
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });
}

/** Send a courtesy confirmation to the visitor (only when SEND_ACK=true). */
async function sendUserConfirmation(data) {
  if (String(process.env.SEND_ACK) !== 'true') return;
  const mail = userConfirmationEmail(data);
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: '"' + String(data.name).replace(/"/g, '') + '" <' + data.email + '>',
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });
}

module.exports = { verifyMailer, sendAdminNotification, sendUserConfirmation };
