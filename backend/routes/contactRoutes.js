'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { contactValidationRules, handleValidation } = require('../middleware/validation');
const { submitContact } = require('../controllers/contactController');

const router = express.Router();

/* Spam guard: default 5 submissions per 15 min, per IP (env-configurable). */
const contactLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in a little while.' }
});

// POST /api/contact  →  rate limit → validate → controller
router.post('/', contactLimiter, contactValidationRules, handleValidation, submitContact);

module.exports = router;
