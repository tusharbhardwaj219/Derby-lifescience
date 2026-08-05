'use strict';

const mongoose = require('mongoose');

/* One contact-form submission. Field set matches the frontend form
   (name, email, phone, company, subject, message) plus request metadata. */
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    subject: { type: String, trim: true, maxlength: 150, default: 'General Inquiry' },
    message: { type: String, required: [true, 'Message is required'], trim: true, minlength: 10, maxlength: 5000 },

    // Request metadata (handy for an admin panel later).
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    // Did the notification email go out for this inquiry?
    emailStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' }
  },
  { timestamps: true } // createdAt / updatedAt
);

// Admin listings would be newest-first.
contactSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
