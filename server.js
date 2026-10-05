'use strict';
// Topside server: serves the app and wires the platform's managed payments.
// The platform runs Stripe. This server never touches Stripe or card data; it only
// calls the platform HTTP API, and it keeps META_APP_TOKEN on the server.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 8080;
// Gate on the product KEY, never a price id. Prices and price keys always come from GET /products.
// Product key kept from the original ShieldScan name on purpose: renaming it would lock out existing buyers.
const PRODUCT_KEY = 'shieldscan_license';
const COOKIE = 'ss_buyer';
const BUYER_RE = /^g_[0-9a-f-]{36}$/;
const TIMEOUT_MS = 6000;

const SCANNER_HTML = fs.readFileSync(path.join(__dirname, 'index.html'));
const PRICING_HTML = fs.readFileSync(path.join(__dirname, 'pricing.html'));

// ---------- platform API ----------
// Env vars are read per request (never hardcoded); the token is injected at deploy time.
function metaBase() {
  const u = process.env.META_API_URL;
  if (!u) throw new Error('META_API_URL is not set');
  return u.replace(/\/+$/, '');
}

async function meta(method, p, { body, headers } = {}) {
  const token = process.env.META_APP_TOKEN;
  if (!token) throw new Error('META_APP_TOKEN is not set');
  const res = await fetch(metaBase() + p, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, data }; // any 2xx = success
}

async function getProducts() {
  const r = await meta('GET', '/products');
  if (!r.ok || !r.data || !Array.isArray(r.data.products)) {
    throw new Error(`GET /products failed (${r.status})`);
  }
  return r.data.products;
}

// Returns 'paid' | 'unpaid' | 'error'. No answer = no access.
async function checkPaid(user) {
  try {
    const q = `?user=${encodeURIComponent(user)}&product=${encodeURIComponent(PRODUCT_KEY)}`;
    const r = await meta('GET', '/paid' + q);
    if (!r.ok || !r.data || typeof r.data !== 'object') {
      console.error(`GET /paid failed (${r.status})`);
      return 'error';
    }
    return r.data.paid === true ? 'paid' : 'unpaid';
  } catch (e) {
    console.error('GET /paid unreachable:', e.message);
    return 'error';
  }
}

// ---------- buyer id ----------
// YOUR_BUYER_ID = a random guest token in an HttpOnly cookie. Same value is used for
// /paid, /checkout and /portal. It is never accepted from the request body or query.
function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* skip */ }
    }
  }
  return out;
}

function setBuyerCookie(req, res, id) {
  const secure = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${id}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax${secure}`);
}

function buyerId(req, res) {
  let id = parseCookies(req)[COOKIE];
  if (!id || !BUYER_RE.test(id)) {
    id = 'g_' + crypto.randomUUID();
    setBuyerCookie(req, res, id);
  }
  return id;
}

// License key = the buyer id. A paid buyer can copy it and restore access on another
// browser/device. Keys are random UUIDs (unguessable); restore is also rate-limited per IP.
const restoreHits = new Map();
function restoreAllowed(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
  const now = Date.now();
  const hits = (restoreHits.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  restoreHits.set(ip, hits);
  if (restoreHits.size > 10_000) restoreHits.clear();
  return hits.length <= 10;
}

// ---------- helpers ----------
function baseHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store');
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function json(res, status, obj) {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(obj));
}

function readJson(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

const RETRY_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Topside: try again</title>
<style>body{font-family:system-ui,sans-serif;background:#f8f7fb;color:#24212b;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}
.c{max-width:440px;text-align:center;background:#fff;border:1px solid #e6e3ee;border-radius:14px;padding:36px 28px}
h1{font-size:1.3rem;margin:0 0 10px}p{color:#5d5868;line-height:1.6;margin:0 0 22px}
button,a{font:inherit;font-weight:600;padding:10px 20px;border-radius:9px;border:none;cursor:pointer;text-decoration:none;display:inline-block;margin:4px}
button{background:#5b3fd1;color:#fff}a{color:#5b3fd1;border:2px solid #e6e3ee}</style></head>
<body><div class="c"><h1>We can't confirm your access right now</h1>
<p>Our license check didn't answer. Your purchase is safe, this is usually temporary. Try again in a moment.</p>
<button onclick="location.reload()">Try again</button><a href="/">Back to pricing</a></div></body></html>`;

// ---------- routes ----------
async function handle(req, res) {
  baseHeaders(res);
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const m = req.method;

  if (p === '/healthz' && (m === 'GET' || m === 'HEAD')) return send(res, 200, 'text/plain', 'ok\n');

  // Public pricing page (renders GET /products live in the browser via /api/products)
  if ((p === '/' || p === '/pricing') && m === 'GET') {
    buyerId(req, res);
    return send(res, 200, 'text/html; charset=utf-8', PRICING_HTML);
  }

  // PAID FEATURE: the scanner. Gated on the server via /paid before anything is served.
  if ((p === '/app' || p === '/app/') && m === 'GET') {
    const user = buyerId(req, res);
    const state = await checkPaid(user);
    if (state === 'paid') return send(res, 200, 'text/html; charset=utf-8', SCANNER_HTML);
    if (state === 'unpaid') { res.writeHead(302, { Location: '/?locked=1' }); return res.end(); }
    return send(res, 503, 'text/html; charset=utf-8', RETRY_HTML); // locked + friendly retry
  }

  // Live catalog proxy (keeps the token server-side)
  if (p === '/api/products' && m === 'GET') {
    try { return json(res, 200, { products: await getProducts() }); }
    catch (e) { console.error(e.message); return json(res, 502, { error: 'PRODUCTS_UNAVAILABLE' }); }
  }

  // Display-only access status for the pricing page. The real gate is /app.
  if (p === '/api/access' && m === 'GET') {
    const user = buyerId(req, res);
    const state = await checkPaid(user);
    const out = { product: PRODUCT_KEY, paid: state === 'paid', state };
    if (state === 'paid') out.licenseKey = user; // shown only to the buyer who owns it
    return json(res, 200, out);
  }

  if ((p === '/api/checkout' || p === '/api/portal' || p === '/api/restore') && m === 'POST') {
    // JSON-only + SameSite=Lax cookie blocks cross-site form posts
    if (!(req.headers['content-type'] || '').startsWith('application/json')) {
      return json(res, 415, { error: 'JSON_REQUIRED' });
    }
    let body;
    try { body = await readJson(req); } catch { return json(res, 400, { error: 'BAD_REQUEST' }); }

    // Restore a license on this browser using a license key
    if (p === '/api/restore') {
      if (!restoreAllowed(req)) return json(res, 429, { error: 'TOO_MANY_ATTEMPTS' });
      const key = typeof body.key === 'string' ? body.key.trim().toLowerCase() : '';
      if (!BUYER_RE.test(key)) return json(res, 400, { error: 'INVALID_KEY' });
      const state = await checkPaid(key);
      if (state === 'paid') { setBuyerCookie(req, res, key); return json(res, 200, { restored: true }); }
      if (state === 'unpaid') return json(res, 404, { error: 'KEY_NOT_FOUND' });
      return json(res, 503, { error: 'TRY_AGAIN' });
    }

    const user = buyerId(req, res);

    if (p === '/api/checkout') {
      const price = typeof body.price === 'string' ? body.price : '';
      try {
        // Only accept a price key that exists in the live catalog right now
        const products = await getProducts();
        const known = products.some((pr) => (pr.prices || []).some((x) => x.key === price));
        if (!known) return json(res, 400, { error: 'PRICE_NOT_FOUND' });
        const r = await meta('POST', '/checkout', {
          body: { price, user },
          headers: { 'Idempotency-Key': crypto.randomUUID() }, // fresh per attempt
        });
        if (!r.ok || !r.data || typeof r.data.url !== 'string' || !r.data.url.startsWith('https://')) {
          console.error(`POST /checkout failed (${r.status})`, r.data && r.data.error);
          return json(res, 502, { error: (r.data && r.data.error && r.data.error.code) || 'CHECKOUT_FAILED' });
        }
        return json(res, 200, { url: r.data.url });
      } catch (e) {
        console.error('checkout error:', e.message);
        return json(res, 502, { error: 'CHECKOUT_UNAVAILABLE' });
      }
    }

    // /api/portal
    try {
      const r = await meta('POST', '/portal', { body: { user } });
      if (r.ok && r.data && typeof r.data.url === 'string' && r.data.url.startsWith('https://')) {
        return json(res, 200, { url: r.data.url });
      }
      if (r.status === 404) return json(res, 404, { error: 'NO_BILLING_CUSTOMER' });
      console.error(`POST /portal failed (${r.status})`);
      return json(res, 502, { error: 'PORTAL_FAILED' });
    } catch (e) {
      console.error('portal error:', e.message);
      return json(res, 502, { error: 'PORTAL_UNAVAILABLE' });
    }
  }

  // Old demo build stays private; nothing else is served.
  return send(res, 404, 'text/plain', 'Not found\n');
}

http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error('unhandled:', e);
    if (!res.headersSent) send(res, 500, 'text/plain', 'Server error\n');
    else res.end();
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Topside listening on 0.0.0.0:${PORT}`);
  if (!process.env.META_API_URL || !process.env.META_APP_TOKEN) {
    console.warn('META_API_URL / META_APP_TOKEN missing: payments stay locked until a fresh deploy injects them.');
  }
});
