'use strict';

const { body, validationResult } = require('express-validator');

/* Validation + sanitization for the contact form.
   .trim() sanitizes; the checks validate. We do NOT .escape() here — escaping
   is done at HTML-render time in the email templates, so stored data and the
   plain-text email stay readable and we never double-encode. */
const contactValidationRules = [
  body('name')
    .trim().notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
  body('email')
    .trim().notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .isLength({ max: 254 }).withMessage('Email address is too long.')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' }).trim()
    .matches(/^[0-9+()\s-]{7,20}$/).withMessage('Enter a valid phone number.'),
  body('company')
    .optional({ values: 'falsy' }).trim()
    .isLength({ max: 120 }).withMessage('Company name is too long.'),
  body('subject')
    .optional({ values: 'falsy' }).trim()
    .isLength({ max: 150 }).withMessage('Subject is too long.'),
  body('message')
    .trim().notEmpty().withMessage('Message is required.')
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be 10–5000 characters.')
];

/** Turn express-validator results into a 422 response, or continue. */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(422).json({
    success: false,
    message: 'Validation failed.',
    errors: errors.array().map(function (e) {
      return { field: e.path, message: e.msg };
    })
  });
}

module.exports = { contactValidationRules, handleValidation };
