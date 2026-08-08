'use strict';

/*
 * Zero-install local MongoDB for development (used when MONGODB_URI=local).
 *
 * Runs a real `mongod` (via mongodb-memory-server) that persists to
 * backend/.mongo-data on the standard port 27017 — so data survives restarts
 * and MongoDB Compass can browse it at mongodb://127.0.0.1:27017 (db: derby).
 *
 * If a mongod is ALREADY on 27017 (a real install, or our own instance left
 * over from a `node --watch` restart), we reuse it — this avoids the WiredTiger
 * dbPath lock clashing on quick restarts.
 *
 * DEV convenience only. For a live deployment set a real MONGODB_URI.
 */

const path = require('path');
const fs = require('fs');
const net = require('net');

const PORT = Number(process.env.LOCAL_DB_PORT) || 27017;
const DB_NAME = 'derby';
const DATA_DIR = path.join(__dirname, '..', '.mongo-data');
const URI = 'mongodb://127.0.0.1:' + PORT + '/' + DB_NAME;

let mongod = null;

function portInUse(port) {
  return new Promise(function (resolve) {
    const sock = new net.Socket();
    sock.setTimeout(1000);
    sock.once('connect', function () { sock.destroy(); resolve(true); });
    sock.once('timeout', function () { sock.destroy(); resolve(false); });
    sock.once('error', function () { resolve(false); });
    sock.connect(port, '127.0.0.1');
  });
}

async function startLocalMongo() {
  if (mongod) return URI;

  if (await portInUse(PORT)) {
    console.log('  🗄  Reusing MongoDB already running on port ' + PORT);
    return URI;
  }

  let MongoMemoryServer;
  try {
    MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
  } catch (e) {
    throw new Error(
      'MONGODB_URI=local needs the "mongodb-memory-server" package. Run `npm install` ' +
      'in backend/, or set a real MONGODB_URI (e.g. a MongoDB Atlas connection string).'
    );
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  function clearLocks() {
    ['mongod.lock', 'WiredTiger.lock'].forEach(function (name) {
      try { fs.rmSync(path.join(DATA_DIR, name), { force: true }); } catch (e) { /* ignore */ }
    });
  }
  function spawn() {
    return MongoMemoryServer.create({
      instance: { port: PORT, dbPath: DATA_DIR, storageEngine: 'wiredTiger' }
    });
  }

  // A mongod killed uncleanly (terminal closed without Ctrl+C) can leave the
  // data dir LOCKED or CORRUPTED (mongod aborts with fassert on start), which
  // used to silently drop the DB to "disconnected". We self-heal: clear stale
  // locks and try; if the data is corrupted, reset the dir and retry once.
  // Inquiries are never lost — they're also captured in data/inquiries.jsonl.
  clearLocks();
  try {
    mongod = await spawn();
  } catch (e) {
    console.warn('  ⚠  Local MongoDB data was unusable (' + String(e.message).split('\n')[0] + ')');
    console.warn('     Resetting backend/.mongo-data and retrying…');
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e2) { /* ignore */ }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    mongod = await spawn();
  }
  console.log('  🗄  Local MongoDB started on port ' + PORT + '  (data: backend/.mongo-data)');
  return URI;
}

async function stopLocalMongo() {
  if (mongod) {
    try { await mongod.stop({ doCleanup: false }); } catch (e) { /* ignore */ }
    mongod = null;
  }
}

module.exports = { startLocalMongo, stopLocalMongo, URI, DATA_DIR, PORT };
