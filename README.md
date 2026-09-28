# ShieldScan — AI External Threat Exposure Scanner

**Know your exposure before attackers do.**

ShieldScan scans a domain's public-facing attack surface and generates a plain-English threat report with prioritized, step-by-step fixes. Built for small businesses that need a useful first pass without enterprise pricing or unnecessary telemetry.

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
- **Zero Install** — Runs entirely in the browser
- **Privacy-First** — Public-domain checks only, no agents, no credentials, no telemetry

## Price and Product Link

**$29 one-time. Unlimited scans.**

Storefront: https://tgescllc.netlify.app

ShieldScan is a first-pass awareness tool. It is not a penetration test, compliance certification, or replacement for managed security services.

## Current App

The production entrypoint is `index.html`. It performs live browser-based checks against Cloudflare DNS-over-HTTPS, crt.sh certificate transparency, and public HTTPS endpoints. `shieldscan.html` is retained as the earlier demo build.

## Tech Stack

- Single HTML file, zero runtime dependencies
- Vanilla JavaScript
- Responsive CSS with OKLCH color tokens
- DM Sans and DM Mono via Google Fonts

## Deployment

Deploy `index.html` on any static host such as Netlify, Vercel, or GitHub Pages.

For deeper production coverage, add a backend proxy or service for checks that browsers cannot perform directly, including port scanning, full certificate inspection, and complete response-header analysis.

## License

Proprietary — TGE SC LLC. All rights reserved.
