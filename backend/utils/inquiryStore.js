'use strict';

const fs = require('fs');
const path = require('path');

/*
 * Durable, dependency-free capture of every inquiry.
 *
 * The contact form must succeed the instant a valid submission arrives — it must
 * NOT hang on a slow email (Gmail can take 5–8s) or fail because the database is
 * momentarily down. So every inquiry is appended here first (a local append is
 * effectively instant and never depends on the network). Email + MongoDB then
 * happen in the background. This guarantees an inquiry is never lost, even if
 * both the DB and the email fail.
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'inquiries.jsonl');

/** Append one inquiry as a JSON line. Best-effort but synchronous-durable. */
function appendInquiry(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const record = {
      at: new Date().toISOString(),
      name: data.name, email: data.email, phone: data.phone,
      company: data.company, subject: data.subject, message: data.message,
      ip: data.ip, userAgent: data.userAgent
    };
    fs.appendFileSync(FILE, JSON.stringify(record) + '\n', 'utf8');
    return true;
  } catch (e) {
    console.error('[inquiry-store] could not write inquiry file:', e.message);
    return false;
  }
}

module.exports = { appendInquiry, FILE, DATA_DIR };
