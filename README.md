# Topside — AI External Threat Exposure Scanner

**Know your exposure before attackers do.**

Topside scans a domain's public-facing attack surface and generates a plain-English threat report with prioritized, step-by-step fixes. Built for small businesses that need a useful first pass without enterprise pricing or unnecessary telemetry.

## What It Scans

- **DNS Configuration** — A, AAAA, MX, NS, TXT, and CNAME records
- **Email Authentication** — SPF, DKIM, and DMARC policy analysis
- **Certificate Transparency** — Public subdomain enumeration through crt.sh
- **HTTP Security** — HTTPS reachability, redirects, server headers, HSTS, CSP, clickjacking protection, and content-type sniffing
- **AI Threat Analysis** — Plain-English findings with prioritized remediation steps

## Features

- **Risk Scoring** — A-F grade with category breakdowns
- **Step-by-Step Fixes** — Every finding includes practical remediation instructions
- **Raw Scan Data** — Transparent underlying results in the report
- **PDF Export** — One-click report export for sharing
- **Privacy-First** — Public-domain checks only, no agents, no credentials, no telemetry

## Pricing

Topside (formerly ShieldScan) is sold as a one-time **Topside License** (product key `shieldscan_license`, kept from the old name so existing licenses keep working).
The price is configured by the owner in the platform dashboard and rendered live on the
pricing page from `GET /products`. Nothing in this repo hardcodes a price or price key.

Topside is a first-pass awareness tool. It is not a penetration test, compliance certification, or replacement for managed security services.

## How payments work

The platform runs Stripe. This app never touches Stripe, never renders card fields and never stores card data. `server.js` calls the platform API with `Authorization: Bearer $META_APP_TOKEN` against `$META_API_URL` (both injected at deploy time; the token never reaches the browser).

| Route | What it does |
|---|---|
| `GET /` | Pricing page. Fetches `/api/products` (proxy of `GET /products`) on every load. |
| `GET /app` | **The paid scanner.** Server calls `GET /paid?user=<buyer>&product=shieldscan_license` and serves the scanner only when `paid === true`. Unpaid buyers are redirected to pricing. If `/paid` errors or is unreachable, access stays locked and a "try again" screen is shown. |
| `POST /api/checkout` | Validates the price key against the live catalog, then `POST /checkout` with a fresh `Idempotency-Key`. Returns the hosted checkout URL to redirect to. |
| `POST /api/portal` | `POST /portal` for billing management. A one-time buyer gets a friendly "nothing to manage" message (404 `NO_BILLING_CUSTOMER`). |
| `POST /api/restore` | Restores a license on a new browser from a license key (server-verified via `/paid`). |
| `GET /api/access` | Display-only access status (and the owner's license key) for the pricing page. Never used for gating. |
| `GET /healthz` | Health check. |

**Buyer id / license key:** a random guest token (`g_<uuid>`) kept in an HttpOnly cookie. The same value is sent to `/paid`, `/checkout` and `/portal`, and is never taken from the checkout request body. After purchase the pricing page shows it as the buyer's **license key**. Pasting it into "Restore with your license key" (`POST /api/restore`) verifies it with `/paid` on the server, then binds this browser to it, so access survives cleared cookies and new devices. Keys are unguessable UUIDs and restore is rate-limited per IP.

No consumables are sold, so `/purchases` and a `granted_purchases` table are not needed. If credits are ever added, drain `GET /purchases` server-side with an insert-if-new `granted_purchases (id TEXT PRIMARY KEY)` table.

## Current App

`index.html` is the scanner (served only at `/app` after the paywall check). It performs live browser-based checks against Cloudflare DNS-over-HTTPS, crt.sh certificate transparency, and public HTTPS endpoints. `shieldscan.html` is the earlier demo build and is not served.

## Deployment

Built with the root `Dockerfile` (Node 20, zero dependencies). The platform injects `PORT`, `META_API_URL` and `META_APP_TOKEN`. **First-time setup: redeploy after this change so the token is injected.**

Run locally: `META_API_URL=... META_APP_TOKEN=... PORT=8080 node server.js`

## Tech Stack

- Vanilla JavaScript, single-file scanner UI
- Node.js `http` server, no npm dependencies
- Responsive CSS with OKLCH color tokens
- DM Sans and DM Mono via Google Fonts

## License

Proprietary — TGE SC LLC. All rights reserved.
