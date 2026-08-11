# Derby Lifescience — Deployment Guide

Split deployment (recommended — keeps the Express backend intact):

```
Vercel        →  Frontend (static site in frontend/public)
Railway       →  Node.js + Express backend  (the backend/ folder)
MongoDB Atlas →  Database
GoDaddy       →  Domain + Email
```

Do the **backend first** (you need its URL for the frontend).

---

## Step 1 — Backend → Railway

1. Go to <https://railway.app> → **New Project** → **Deploy from GitHub repo** → pick
   `Derby-lifescience`.
2. Open the service → **Settings**:
   - **Root Directory** = `backend`
   - Start command is auto-detected (`npm start`). Leave build command empty.
3. **Variables** tab → add these (use your REAL values — they are NOT in the repo):

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas string (`mongodb+srv://…/derby?retryWrites=true&w=majority`) |
   | `CONTACT_TO` | `approval@derbylifesciences.com` |
   | `MAIL_FROM` | `Derby Lifescience Website <approval@derbylifesciences.com>` |
   | `SMTP_HOST` | `smtpout.secureserver.net` |
   | `SMTP_PORT` | `465` |
   | `SMTP_SECURE` | `true` |
   | `SMTP_USER` | `approval@derbylifesciences.com` |
   | `SMTP_PASS` | your GoDaddy mailbox password |
   | `SEND_ACK` | `true` |
   | `CORS_ORIGINS` | `https://derbylifesciences.com,https://www.derbylifesciences.com` |
   | `RATE_LIMIT_MAX` | `100` |

4. **Deploy.** When it's live, **Settings → Networking → Generate Domain** to get a public
   URL like `https://derby-backend-production.up.railway.app`.
5. **Test the backend:** open `https://<your-railway-url>/api/health` — you want:
   ```json
   { "success": true, "smtp": "ok", "db": "connected" }
   ```
   (`db: connected` confirms Atlas works from Railway — the SRV DNS issue you had locally does not exist there.)

> MongoDB Atlas: make sure **Network Access** allows Railway. Easiest: add
> `0.0.0.0/0` (allow from anywhere) under Atlas → Network Access.

---

## Step 2 — Point the frontend at the backend

Edit **`frontend/public/js/config.js`** and replace the placeholder with your Railway URL:

```js
window.DERBY_API_BASE = 'https://derby-backend-production.up.railway.app';
```

(No trailing slash, no `/api`.) Commit + push:

```bash
git add frontend/public/js/config.js
git commit -m "Point contact form at Railway backend"
git push
```

---

## Step 3 — Frontend → Vercel

1. Vercel → your project → **Settings → Build and Deployment → Root Directory** =
   `frontend/public` → **Save**.
2. **Deployments → Redeploy** (Vercel also auto-redeploys on the push from Step 2).
3. Your site is now at `https://derbylifesciences.com/` (with the **"s"**).

---

## Step 4 — Test the whole flow

1. Open `https://derbylifesciences.com/contact.html`.
2. Submit the form. It should show the green success message.
3. Check the **approval@derbylifesciences.com** inbox and your Atlas `derby` database
   (`contacts` collection) for the inquiry.

If the form errors, open the browser **DevTools → Network → `contact`** row and check the
status. A **CORS** error means the Vercel domain isn't in `CORS_ORIGINS` on Railway.

---

## Email / DNS (do this carefully — do NOT delete records blindly)

Your domain's nameservers now point to **Vercel**, so Vercel is authoritative for DNS.
That means the **MX / SPF / DKIM** records that make email work must exist **in Vercel's DNS**
(they currently do **not** — the domain has no MX records, so inbound email is broken).

**Don't guess the values.** Get the exact **MX, SPF (TXT), and DKIM** records from
GoDaddy's email setup (GoDaddy → Email & Office → your mailbox → *Manage DNS / server
settings*), then add those same records in **Vercel → your domain → DNS**, alongside the
existing website A/CNAME records (do not remove those). Sending already works via SMTP;
this restores **receiving**.

Send screenshots of Vercel → DNS and GoDaddy → email DNS settings and the exact records
to add can be confirmed.
