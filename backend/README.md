# Derby Lifescience — Backend

Node.js + Express backend for the Derby Lifescience landing page. The site is
**static** except the **Contact form**, which this service handles: it validates
the submission, stores it in **MongoDB**, and emails it (Nodemailer). The Express
server also serves the website itself, so everything runs on **one URL**.

## Structure

```
backend/
├── config/
│   ├── database.js        # MongoDB (Mongoose) connect + local-DB support
│   └── mailer.js          # Nodemailer transport + send functions
├── controllers/
│   └── contactController.js
├── middleware/
│   ├── errorHandler.js    # 404 + central error handler
│   └── validation.js      # express-validator rules + result handler
├── models/
│   └── Contact.js         # Mongoose schema
├── routes/
│   └── contactRoutes.js   # POST /api/contact (+ rate limit)
├── utils/
│   ├── emailTemplates.js  # admin + confirmation email bodies
│   └── localMongo.js      # zero-install local MongoDB (MONGODB_URI=local)
├── .env                   # your config (gitignored)
├── server.js              # app assembly + start + serves the frontend
└── package.json
```

## Setup

### 1. Install

```bash
cd backend
npm install
```

### 2. Configure `.env`

A `.env` already exists (copy `.env.example` if not). Key variables:

| Variable | Meaning |
|---|---|
| `PORT` | Server port (default 4000) |
| `MONGODB_URI` | `local` = zero-install DB on your PC · or an Atlas `mongodb+srv://…` string · or blank for email-only |
| `CONTACT_TO` | Inbox that receives inquiries (`info@fairfordpharma.com`) |
| `MAIL_FROM` | "From" address — must match `SMTP_USER` for Gmail |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | SMTP creds. Gmail needs a 16-char **App Password** |
| `SEND_ACK` | `true` = also email a confirmation to the visitor |
| `CORS_ORIGINS` | Allowed API origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Contact rate limit (default 5 / 15 min) |

**Gmail App Password:** enable 2-Step Verification, then create one at
<https://myaccount.google.com/apppasswords>, remove the spaces, use as `SMTP_PASS`.
Your normal login password will NOT work.

### 3. Run

```bash
npm run dev     # auto-restart on change
# or
npm start
```

Open <http://localhost:4000> — the whole site is served here. Submitting the
contact form posts to `/api/contact` on the same origin (no CORS issues).

Check <http://localhost:4000/api/health>:

```json
{ "success": true, "status": "ok", "smtp": "ok", "db": "connected" }
```

> After editing `.env` you must **restart** — `--watch` only reloads `.js` files.

## API

### `POST /api/contact`

Body:

```json
{ "name": "", "email": "", "phone": "", "company": "", "subject": "", "message": "" }
```

Responses:

- **200** `{ "success": true,  "message": "Your message has been sent successfully." }`
- **422** `{ "success": false, "message": "Validation failed.", "errors": [ { "field": "email", "message": "Enter a valid email address." } ] }`
- **429** `{ "success": false, "message": "Too many requests. Please try again in a little while." }`
- **500** `{ "success": false, "message": "Something went wrong. Please try again later." }`

A submission succeeds if it was **saved to the DB OR emailed** — so it's never
lost to a brief email/DB outage. The stored record's `emailStatus` is `sent`/`failed`.

### `GET /api/health`

Returns `smtp` (`ok`/`unconfigured`) and `db` (`connected`/`disconnected`).

## Security

Helmet (with a CSP tuned to the site's fonts/images/map), CORS allow-list,
express-validator input validation + sanitization, per-IP rate limiting, a hidden
honeypot field, HTML-escaping of all user input in emails, a 12 KB body cap, and
credentials kept only in `.env`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `db: disconnected` + `querySrv ECONNREFUSED` | Your network refuses SRV DNS (needed by `mongodb+srv://`) | Set DNS to `8.8.8.8`/`1.1.1.1`, **or** use `MONGODB_URI=local` |
| `smtp: unconfigured` | SMTP values still placeholders / wrong | Set a real Gmail App Password; restart |
| Form shows ❌ | Both DB and email are down | Get at least one working (easiest: `MONGODB_URI=local`) |
| `.env` edits ignored | `--watch` ignores `.env` | Restart the server |
