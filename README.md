# ShieldScan — AI External Threat Exposure Scanner

**Know your exposure before attackers do.**

ShieldScan scans any domain's public-facing attack surface and generates a plain-English AI threat report with prioritized, step-by-step fixes. Built for small businesses who can't afford $10k/year enterprise security tools.

## What It Scans

- **DNS Configuration** — Records, zone config, dangling entries, DNSSEC
- **SSL/TLS Security** — Certificate chain, cipher suites, protocol versions, expiration
- **Email Authentication** — SPF, DKIM, DMARC policy analysis and scoring
- **HTTP Security Headers** — CSP, HSTS, X-Frame-Options, Permissions-Policy
- **Subdomain Exposure** — Certificate transparency log enumeration, risk assessment
- **Port & Service Exposure** — Open ports, exposed services, database access
- **Technology Fingerprinting** — Stack identification, framework detection, known CVEs

## Features

- **AI Threat Analysis** — Plain-English executive summary of your security posture
- **Risk Scoring** — A-F letter grade with category breakdowns
- **Step-by-Step Fixes** — Every finding includes exact remediation instructions
- **PDF Export** — One-click report export for sharing with your team
- **Zero Install** — Runs entirely in the browser
- **Privacy-First** — Scans only publicly available data, no agents or credentials needed

## Price

$39 one-time purchase. Unlimited scans.

## Demo

Try the built-in demo domains:
- `acmecorp.com` — Grade C, significant email and SSL gaps
- `globalretail.io` — Grade D, expired cert and exposed admin panel
- `startupfast.dev` — Grade A, well-secured with minor improvements

## Tech Stack

- Single HTML file, zero dependencies
- Pure CSS (OKLCH color space, responsive)
- Vanilla JavaScript
- Google Fonts (DM Sans, DM Mono)

## Deployment

Drop `index.html` on any static host (Netlify, Vercel, GitHub Pages).

For production scanning capabilities, connect to backend APIs for:
- DNS-over-HTTPS (Cloudflare/Google)
- Certificate Transparency logs
- Port scanning service
- HTTP header inspection proxy

## License

Proprietary — TGE SC LLC. All rights reserved.
