'use strict';

/* Builds the admin-notification and visitor-confirmation emails
   (plain-text + branded HTML). All user input is HTML-escaped on output. */

const BRAND = { pine: '#1E2821', ink: '#263229', primary: '#769382', deep: '#47624f', cream: '#F3EFE3', line: '#e7e2d5', muted: '#6b7669' };

function escapeHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function shell(inner) {
  return (
'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
'<body style="margin:0;padding:0;background:' + BRAND.cream + ';font-family:Arial,Helvetica,sans-serif;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + BRAND.cream + ';padding:28px 14px;"><tr><td align="center">' +
'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 34px rgba(30,40,33,.10);">' +
inner +
'</table></td></tr></table></body></html>'
  );
}

function header(subtitle) {
  return (
'<tr><td style="background:' + BRAND.pine + ';padding:26px 32px;">' +
'<div style="color:#fff;font-size:18px;font-weight:800;">Derby Lifescience</div>' +
'<div style="color:rgba(255,255,255,.66);font-size:12px;margin-top:3px;">' + escapeHtml(subtitle) + '</div>' +
'</td></tr>'
  );
}

function row(label, valueHtml) {
  return (
'<tr>' +
'<td style="padding:13px 0;border-bottom:1px solid ' + BRAND.line + ';vertical-align:top;width:120px;color:' + BRAND.muted + ';font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;">' + escapeHtml(label) + '</td>' +
'<td style="padding:13px 0;border-bottom:1px solid ' + BRAND.line + ';color:' + BRAND.ink + ';font-size:15px;line-height:1.6;">' + valueHtml + '</td>' +
'</tr>'
  );
}

/* ── Admin notification ─────────────────────────────────────── */
function adminEmail(d) {
  const subject = 'New Contact Form Inquiry – Derby Lifescience';

  const text = [
    'A new inquiry has been submitted through the Derby Lifescience website.',
    '', '----------------------------------------', '',
    'Name:', d.name, '',
    'Email:', d.email, '',
    'Phone:', d.phone || '—', '',
    'Company:', d.company || '—', '',
    'Subject:', d.subject || '—', '',
    'Message:', d.message, '',
    '----------------------------------------', '',
    'Submitted On:', d.date, '',
    'IP Address:', d.ip || '—', '',
    'Website:', 'Derby Lifescience'
  ].join('\n');

  const messageHtml = escapeHtml(d.message).replace(/\n/g, '<br>');
  const html = shell(
    header('New contact-form inquiry') +
    '<tr><td style="padding:26px 32px 6px;"><p style="margin:0;color:' + BRAND.ink + ';font-size:15px;line-height:1.6;">A new inquiry has been submitted through the Derby Lifescience website.</p></td></tr>' +
    '<tr><td style="padding:8px 32px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      row('Name', escapeHtml(d.name)) +
      row('Email', '<a href="mailto:' + encodeURIComponent(d.email) + '" style="color:' + BRAND.deep + ';text-decoration:none;">' + escapeHtml(d.email) + '</a>') +
      row('Phone', d.phone ? escapeHtml(d.phone) : '&mdash;') +
      row('Company', d.company ? escapeHtml(d.company) : '&mdash;') +
      row('Subject', d.subject ? escapeHtml(d.subject) : '&mdash;') +
    '</table></td></tr>' +
    '<tr><td style="padding:16px 32px 8px;"><div style="color:' + BRAND.muted + ';font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Message</div>' +
    '<div style="background:' + BRAND.cream + ';border:1px solid ' + BRAND.line + ';border-radius:12px;padding:16px 18px;color:' + BRAND.ink + ';font-size:15px;line-height:1.65;">' + messageHtml + '</div></td></tr>' +
    '<tr><td style="padding:14px 32px 26px;color:' + BRAND.muted + ';font-size:12px;line-height:1.7;border-top:1px solid ' + BRAND.line + ';">' +
    '<strong style="color:' + BRAND.ink + ';">Submitted:</strong> ' + escapeHtml(d.date) + '<br>' +
    '<strong style="color:' + BRAND.ink + ';">IP:</strong> ' + escapeHtml(d.ip || '—') +
    (d.userAgent ? '<br><strong style="color:' + BRAND.ink + ';">Browser:</strong> ' + escapeHtml(d.userAgent) : '') +
    '</td></tr>'
  );

  return { subject: subject, text: text, html: html };
}

/* ── Visitor confirmation ───────────────────────────────────── */
function userConfirmationEmail(d) {
  const subject = 'We received your message – Derby Lifescience';

  const text = [
    'Hello ' + d.name + ',', '',
    'Thank you for contacting Derby Lifescience.',
    'Your inquiry has been received successfully and our team will get back to you shortly.',
    '', 'For your records, here is a copy of your message:', '',
    d.message, '',
    '— Team Derby Lifescience', '',
    'This is an automated confirmation — please do not reply to this email.'
  ].join('\n');

  const messageHtml = escapeHtml(d.message).replace(/\n/g, '<br>');
  const html = shell(
    header('Advancing healthcare through quality, innovation & trust') +
    '<tr><td style="padding:28px 32px 8px;">' +
    '<p style="margin:0 0 14px;color:' + BRAND.ink + ';font-size:16px;line-height:1.6;">Hello ' + escapeHtml(d.name) + ',</p>' +
    '<p style="margin:0 0 14px;color:' + BRAND.ink + ';font-size:15px;line-height:1.65;">Thank you for contacting <strong>Derby Lifescience</strong>. Your inquiry has been received successfully, and our team will get back to you shortly.</p></td></tr>' +
    '<tr><td style="padding:6px 32px 8px;"><div style="color:' + BRAND.muted + ';font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Your message</div>' +
    '<div style="background:' + BRAND.cream + ';border:1px solid ' + BRAND.line + ';border-radius:12px;padding:16px 18px;color:' + BRAND.ink + ';font-size:15px;line-height:1.65;">' + messageHtml + '</div></td></tr>' +
    '<tr><td style="padding:18px 32px 28px;"><p style="margin:0;color:' + BRAND.deep + ';font-size:15px;font-weight:700;">— Team Derby Lifescience</p>' +
    '<p style="margin:10px 0 0;color:' + BRAND.muted + ';font-size:12px;">This is an automated confirmation — please do not reply to this email.</p></td></tr>'
  );

  return { subject: subject, text: text, html: html };
}

module.exports = { adminEmail, userConfirmationEmail, escapeHtml };
