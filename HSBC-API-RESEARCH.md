# HSBC Hong Kong Open API research

_Round-4 redo, single-bank scope. Fetched 2026-05-20 ~18:30 HKT. All claims marked `verified` (URL fetched HTTP 200 + content matched) or `unverified — source: <url>`._

## Portal entry point

HSBC operates **two related portals** relevant to HK:

| Portal | URL | Status (2026-05-20 18:30 HKT) | Role |
| --- | --- | --- | --- |
| **Global developer portal** | `https://develop.hsbc.com/` | HTTP 200 — `verified` | Real product catalogue, getting-started, registration, app management. Title: "Welcome to HSBC Developer Portal". |
| Global alias | `https://developer.hsbc.com/` | HTTP 200 → redirects to `develop.hsbc.com/` — `verified` | Vanity domain |
| **HK-specific portal** | `https://developer.hsbc.com.hk/` | HTTP 200 — `verified` | Title + og:meta: "OpenAPI Developer Portal for HSBC Hong Kong". **Pure Angular SPA**, no SSR — links + catalogue load via client-side JS, not visible to anonymous `curl`. |

**Practical entry point for wealth-flow:** `https://develop.hsbc.com/` — that's where the registration form, API catalogue, and getting-started docs actually serve real content to unauthenticated visitors. The `.com.hk` host appears to be a thinner HK-branded wrapper around the same backend.

Probed-and-dead candidates (all 404, recorded for diligence): `api.hsbc.com.hk/`, `www.hsbc.com.hk/openapi/`, `www.hsbc.com.hk/open-banking/`, `www.hsbc.com.hk/api/`, `www.about.hsbc.com.hk/our-business/open-api`, `developer.hsbc.com/products`.

## HKMA Open API Phase coverage

HKMA's [Open API Framework](https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/fintech/open-application-programming-interface-api-for-the-banking-sector/) defines four phases: I product info, II customer acquisition, III account information, IV transactions.

HSBC's portal organises Open Banking APIs into three groups (per `develop.hsbc.com` main nav, `verified`):

| HSBC group | HKMA phase mapping |
| --- | --- |
| **Open Data** | Phase I — product info, branch/ATM locator, rates |
| **Account Information** | Phase III — balances, transactions (with consent) |
| **Payments** | Phase IV — payment initiation (with consent) |

Plus separate non-Phase-aligned tracks: Corporate APIs (Treasury, Trade Finance, Securities Services, BaaS, PayMe for Business, Merchant Services / Omni Collect).

**Verdict:** HSBC HK appears to publish **all four HKMA phases** at the framework level — Phase I via Open Data; Phase II implicit in account opening flows under Corporate APIs; Phase III/IV via Open Banking Account Information + Payments. `verified — source: https://develop.hsbc.com/` main navigation lists Open Data + Account Information + Payments as Open Banking categories.

Caveat: whether HK-specific endpoints exist for every category (vs UK-only) needs login to confirm. The example we fetched (`Treasury - Payment Initiation`, `verified`) covers HSBC's global payments network but doesn't itemise HK eligibility on the public overview page. `unverified — source: https://develop.hsbc.com/api-overview/treasury-payment-initiation` (no per-country endpoint list visible anonymously).

## Authentication model

**Client ID + Client Secret per registered App.** `verified — source: https://develop.hsbc.com/knowledge-article/get-started-corporate-banking-apis`:

> "The admin user can use Apps to control the Client ID and Secret credentials that are used to connect your applications to our APIs."

OAuth 2.0 is the industry-standard wrapper for HSBC's commercial APIs, but the exact grant types (`client_credentials` for Open Data, `authorization_code` for Account Information + Payments under HKMA Phase III/IV) are **not explicitly documented on public-anonymous pages** — `unverified — source: develop.hsbc.com getting-started page (login-gated detail)`.

**Sandbox availability:** YES — "test facility" is granted on registration. `verified — source: https://develop.hsbc.com/knowledge-article/get-started-corporate-banking-apis`:
> "Registration allows you to access the API documentation and the test facility, enabling you to complete your integration to our services."

**Production prerequisites:**

| Track | Path to production |
| --- | --- |
| **Open Banking APIs** | Self-serve registration → activate email → request access → use sandbox → move to production. (`verified` — page states "Register now to access our Open Banking APIs immediately") |
| **Corporate APIs** (Treasury, Trade Finance, etc.) | "You must first be onboarded as a customer to HSBC" + Relationship Manager review + Client Integration contact assigned. `verified` quote: *"In order to use the services in the live environment you must first be onboarded as a customer to HSBC."* |
| **Open Data APIs (HKMA Phase I)** | Public — generally no auth or just app-level API key in line with HKMA Phase I norms. `unverified` for HSBC specifically — needs login or HKMA aggregator dashboard check. |

**mTLS / certs:** not stated on public pages. Industry standard for HKMA Phase III/IV is **eIDAS or OBIE-style mTLS + signed JWS**, almost certainly required for Account Information + Payments. `unverified — source: not on develop.hsbc.com anonymously-readable pages`.

**TSP licence:** HKMA Phase III/IV historically require the third party to be an authorised institution OR have a contractual relationship with HSBC + customer consent. For a hobbyist/solo dev: realistically blocked. `unverified — source: HKMA framework documentation (not fetched in this subtask)`.

## What an unlicensed third party can pull

Today, anonymously (no signup):

| Endpoint family | Likely available? | Verified? |
| --- | --- | --- |
| Branch / ATM locator (HKMA Phase I baseline) | very likely under Open Data | `unverified — source: https://develop.hsbc.com/apis (returned 429 on our probe; need login or repeated polite fetch)` |
| FX / TT rate board (HKMA Phase I baseline) | very likely under Open Data | `unverified` (same) |
| Time-deposit rate board (HKMA Phase I baseline) | very likely under Open Data | `unverified` (same) |
| Product catalogue (credit cards, mortgages, accounts) | very likely under Open Data | `unverified` (same) |
| Account balance / transactions | gated — Phase III, customer-consent OAuth | `verified` (gated, per navigation hierarchy) |
| Payment initiation | gated — Phase IV, customer-consent OAuth | `verified` (gated) |
| Treasury / Corporate Payment Initiation | requires existing HSBC corporate customer status | `verified — source: https://develop.hsbc.com/api-overview/treasury-payment-initiation` + getting-started page |

**Honest read:** the public overview pages confirm HSBC has the right categories listed; per-endpoint URLs and rate-limit details for HK-specific Open Data endpoints require either (a) registering on `develop.hsbc.com` (free, self-serve), or (b) following links from HKMA's aggregator (`apidashboard.hkma.gov.hk` — was unreachable in this probe). The `429 Too Many Requests` response on the `/apis` list page tells us the catalogue exists but is bot-protected.

## Rate limits & SDKs

- **Rate limits (portal):** observed `429 Too Many Requests` on `https://develop.hsbc.com/apis` after a single fetch from our IP — Cloudflare/Akamai-style bot protection on the public catalogue. Per-API runtime limits **not published on public pages**. `unverified`.
- **Official SDK:** YES — "HSBC SDK" appears under **Tools → Developer tools** in main nav (`verified — source: https://develop.hsbc.com/` nav). Languages and SDK scope **not visible to anonymous visitors**. Also: "File validator" + "HSBC Account Insights" tools listed.
- **Cost:** not stated on public pages. Open Banking standard is free; Corporate/Treasury is contract-based and typically tied to existing commercial relationship pricing. `unverified`.
- **Terms of use:** registration form requires acceptance; full T&C text gated behind signup flow. `unverified — source: gated`.
- **Maintenance windows:** not published on public pages. `unverified`.

## Time-to-first-useful-call estimate

For an unlicensed individual developer hitting **Open Banking sandbox** (the realistic wealth-flow scope):

| Step | Estimate | Blocking? |
| --- | --- | --- |
| Register on `develop.hsbc.com` | 5 min | self-serve |
| Email confirmation | 5–30 min | manual |
| Create Organisation + first App | 5 min | self-serve |
| Approval for Open Banking API access | **same session — "immediate" per portal copy** | non-blocking |
| Approval for Corporate API access | "a member of our team will review your registration" — duration unspecified | days, manual |
| Obtain Client ID/Secret | with App creation | self-serve |
| First sandbox OAuth + GET on Open Data | ~10 min after credentials | self-serve |
| **Total — Open Banking sandbox, Open Data tier — realistic** | **~30–60 min** | **achievable same day** |

For **production Open Banking** (Account Info / Payments, Phase III/IV with customer consent): add mTLS cert provisioning + customer consent UX + HKMA-aligned TPP onboarding — realistically **weeks-to-months** and likely blocked for a non-licensed-institution developer.

For **Corporate APIs** (Treasury, Trade Finance): blocked unless you are/become an HSBC corporate customer with a Relationship Manager.

## Recommendation for wealth-flow

Given wealth-flow is a **browser-only, no-backend SPA** (`docs/architecture.md` Principle #1), realistic HSBC HK integration:

1. **DO build now — Open Data tier (HKMA Phase I):** branch/ATM locator + FX rate board + time-deposit rate board + product catalogue. These are the only HSBC endpoints compatible with a no-backend, no-server-secrets architecture. Slot into `src/integrations/banks/hsbc_hk/` per sibling SCAFFOLD-DESIGN.md, surfaced in `src/modules/banks/BanksPanel.tsx` alongside BOCHK equivalents (sibling BOCHK research recommends the same).
2. **DO NOT build now — Open Banking Account Info / Payments (Phase III/IV):** require mTLS + customer consent + likely TPP licence; incompatible with browser-only and almost certainly blocked for unlicensed party.
3. **NEVER build — Corporate / Treasury / BaaS / PayMe for Business:** these are commercial contract products, not relevant to a personal wealth tracker.
4. **First useful endpoint to target:** FX rate board, mirroring the BOCHK recommendation. This unlocks the cross-bank FX comparison story that's central to wealth-flow's value prop. If FX is not exposed via HSBC Open Data, fall back to branch/ATM locator (almost-guaranteed Phase I baseline).
5. **Action item:** sign up on `develop.hsbc.com`, enumerate the actual Open Data endpoint list, then update this doc and the SCAFFOLD-DESIGN provider stub. Should take <1 hour of clock time.

## Citations

All URLs fetched 2026-05-20 ~18:30 HKT unless noted:

- `https://develop.hsbc.com/` — main developer portal landing, HTTP 200 verified. Source for: nav structure (APIs / Solutions / Corporate / BaaS / PayMe / Open Banking sub-nav: Account Information / Payments / Open Data / Partnerships), SDK + tooling mentions, registration flow language.
- `https://developer.hsbc.com/` — HTTP 200, redirects to `develop.hsbc.com/` (vanity alias verified).
- `https://developer.hsbc.com.hk/` — HTTP 200 verified. Title `HSBC OpenAPI Developer Portal`, og:meta `OpenAPI Developer Portal for HSBC Hong Kong`. Pure Angular SPA — content not visible to anonymous static fetch.
- `https://develop.hsbc.com/knowledge-article/get-started-corporate-banking-apis` — HTTP 200 verified. Source for: onboarding flow, Client ID/Secret model, Relationship Manager requirement for corporate APIs, sandbox-on-registration policy.
- `https://develop.hsbc.com/api-overview/treasury-payment-initiation` — HTTP 200 verified. Source for: confirmation that per-API overview pages exist anonymously; per-country eligibility not visible without login.
- `https://develop.hsbc.com/apis` — HTTP 429 Too Many Requests on first fetch. Source for: catalogue exists but is bot-protected. Treated as unverified for endpoint enumeration.
- `https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/fintech/open-application-programming-interface-api-for-the-banking-sector/` — HTTP 200 verified (per sibling BOCHK research, same session). Source for HKMA four-phase framework.
- `https://apisandbox.bochk.com/`, `https://apidashboard.hkma.gov.hk/` — referenced for completeness; HKMA dashboard returned 000 (unreachable from this network in this probe).

**Claims marked `unverified`:** exact HK Open Data endpoint list, exact OAuth grant types per phase, mTLS requirements, rate limits, SDK languages, T&C text, maintenance windows, pricing. All require either (a) `develop.hsbc.com` account signup, (b) HKMA aggregator dashboard read, or (c) repeat fetch of `/apis` after Cloudflare cooldown. Out of scope for this read-only, time-budgeted subtask.
