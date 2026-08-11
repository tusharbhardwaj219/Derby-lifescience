'use strict';

const mongoose = require('mongoose');
const { startLocalMongo, stopLocalMongo } = require('../utils/localMongo');

let usingLocal = false;

/** True only when Mongoose is actually connected. */
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/** Mask user:pass in a URI before logging. */
function safeUri(uri) {
  return String(uri).replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:****@');
}

/**
 * Connect to MongoDB. Never throws — a DB problem must not stop the API from
 * booting and emailing inquiries. Supports MONGODB_URI=local (embedded mongod).
 * Returns true on success.
 */
async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('  ℹ  MONGODB_URI not set — running without a database (inquiries are emailed only).');
    return false;
  }

  const setting = uri.trim().toLowerCase();
  if (setting === 'local' || setting === 'embedded') {
    // The embedded MongoDB is a DEV-only convenience. In production (e.g. Railway)
    // it must never run — set a real Atlas URI there instead.
    if (process.env.NODE_ENV === 'production') {
      console.error('  ⚠  MONGODB_URI=local is dev-only — set a real Atlas connection string in production. Running without a database for now.');
      return false;
    }
    try {
      uri = await startLocalMongo();
      usingLocal = true;
    } catch (e) {
      console.error('  ⚠  Could not start local MongoDB: ' + e.message);
      return false;
    }
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 });
    console.log('  ✅ MongoDB connected → ' + safeUri(uri));
    mongoose.connection.on('error', function (e) { console.error('[mongo] error:', e.message); });
    mongoose.connection.on('disconnected', function () { console.warn('[mongo] disconnected'); });
    return true;
  } catch (e) {
    console.error(
      '  ⚠  MongoDB connection failed: ' + e.message +
      '\n     The API will still run and email inquiries, but they will NOT be saved.'
    );
    return false;
  }
}

async function disconnectDB() {
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  if (usingLocal) { await stopLocalMongo(); usingLocal = false; }
}

module.exports = { connectDB, disconnectDB, isDbConnected };
