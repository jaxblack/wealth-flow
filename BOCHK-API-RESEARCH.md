# BOCHK / 中银香港 Open API research

_Round-4 redo, single-bank scope. Fetched 2026-05-20 ~18:15 HKT. All claims either marked `verified` (URL fetched 200 + content matches) or `unverified — source: <url>`._

## Portal entry point

- **Official portal:** `https://api.bochk.com/` — `BOCHK Open API Portal — Connect Your Business with Finance API` (`verified`, HTTP 200, fetched 2026-05-20 18:15 HKT).
- **Sandbox host:** `https://apisandbox.bochk.com/` — `verified`, returns HTTP 400 on bare GET (host live, expects authenticated request); `https://apisandbox.bochk.com/auth/oauth/v2/token` returns 405 on GET (expects POST).
- **Contact:** `api@bochk.com` (per FAQ, `verified`).
- Portal landing meta keyword tags self-confirm: `"Open API,API,developer,developers,bochk,Portal,API portal,developer portal,bank api,banking api,api developer"`.

The portal sub-pages we confirmed reachable:
- `https://api.bochk.com/API_index.html` — API catalogue (`verified` 200)
- `https://api.bochk.com/FAQ.html` — `verified` 200, source of most facts below
- `https://api.bochk.com/Partnerwithus.html` — `verified` 200, source of auth flow below
- `https://api.bochk.com/sign_up.html`, `https://api.bochk.com/login.html`, `https://api.bochk.com/contactus.html` — `verified` 200

## HKMA Open API Phase coverage

HKMA's [Open API Framework](https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/fintech/open-application-programming-interface-api-for-the-banking-sector/) ("issued on 18 July 2018, takes a risk-based principle and a four-phase approach", `verified` 200) defines four phases:

| Phase | Scope (HKMA canonical) | Typical examples |
| --- | --- | --- |
| I | Product information | Deposit rates, FX rates, branch locations, product catalogues |
| II | Customer acquisition | Application submission, eligibility check |
| III | Account information | Balance, account profile (requires customer consent) |
| IV | Transactions | Payments, transfers (requires customer consent) |

**What BOCHK publishes (per portal evidence):**
- **Phase I & II BOTH present** — `verified` indirectly: BOCHK FAQ splits APIs into two categories: **"product information type"** (no certificate, sandbox auto-granted on signup) and **"product application type"** (SSL cert required, manual approval required, PKI 3-field payload encryption). These map cleanly to HKMA Phase I and Phase II respectively.
- **Phase III & IV: unverified / not visible to unauthenticated visitors.** The public API_index page we fetched showed only one tile ("BOC Business Comprehensive Insurance Plan", a product-application API) — the full catalogue requires login. `unverified — source: https://api.bochk.com/API_index.html (login required for full list)`. Historical HKMA progress reports (not fetched in this subtask) indicate BOCHK launched Phase III/IV in 2021-2022 cohort, but **treat as unverified for this doc**.

## Authentication model

**OAuth 2.0 — Client Credentials Grant** (`verified` per `Partnerwithus.html` Step 3).

- **Token endpoint (sandbox):** `https://apisandbox.bochk.com/auth/oauth/v2/token` (`verified` host reachable, 405 on GET).
- **Token endpoint (production):** not separately documented on the public page; FAQ implies same path on `api.bochk.com` (`unverified — source: https://api.bochk.com/Partnerwithus.html`).
- **Request shape (verbatim from portal):**
  ```
  POST /auth/oauth/v2/token
  Content-Type: application/x-www-form-urlencoded

  grant_type=client_credentials&client_id={Client ID}&client_secret={Client Secret}
  ```
- **Response:** `{ "token_type": "bearer", "access_token": "...", "expires_in": 1800, "scope": "/api" }` — token valid 1800 ms per docs literal (almost certainly a docs typo for **1800 seconds = 30 min**; treat as 30 min until verified live).
- **Sandbox availability:** **YES** — free, no certificate required for product-information APIs. Sandbox tokens auto-issued on app registration if the app only subscribes to product-information APIs.
- **Production prerequisites (product-information APIs):** Sign up → register App → click "Move to Production" → production Client ID/Secret issued. **No SSL cert required.**
- **Production prerequisites (product-application / higher-tier APIs):** All of the above, **plus**:
  1. SSL certificate upload (PKI public key exchange)
  2. App approval (manual review by BOCHK)
  3. Per-call payload must be wrapped into 3 fields: `token` + `checksum` + `digest` (PKI-encrypted)
  4. Additional documents during "Move to Production" application — implied TSP-licence-style review
- **mTLS:** SSL-certificate upload is one-way (client uploads cert for server-side verification of signed payloads), **not mTLS handshake**. `verified — source: https://api.bochk.com/FAQ.html` ("SSL Certificate for public key exchange" + "encrypted into 3 input parameters").
- **TSP licence:** the portal mentions TSPs ("Technology Service Providers") in passing in the sandbox/production FAQ; whether HKMA's TSP onboarding is mandatory for Phase III/IV BOCHK APIs is **unverified — source: not on the public portal pages**.

## What an unlicensed third party can pull

These are derivable today by anyone with just an email address (sandbox tier, product-information APIs):

| Endpoint family | BOCHK exposes? | Verified? | Notes |
| --- | --- | --- | --- |
| OAuth token issuance | YES (sandbox + production) | `verified` (host reachable) | `/auth/oauth/v2/token` — no cert needed for product-info APIs |
| Insurance product catalogue (e.g. "BOC Business Comprehensive Insurance Plan") | YES (visible on `API_index.html`) | `verified` (tile present on public page) | Only public-facing tile we could see anonymously; full catalogue gated by login |
| Branch / ATM locator | likely (HKMA Phase I baseline for all retail banks) | `unverified — source: https://api.bochk.com/API_index.html (login required)` | All HK retail banks publish this under HKMA Phase I |
| FX rate board / TT board | likely (HKMA Phase I baseline) | `unverified` | Same reasoning |
| Time deposit rate board | likely (HKMA Phase I baseline) | `unverified` | Same reasoning |
| Credit-card / mortgage product info | likely (HKMA Phase I baseline) | `unverified` | Same reasoning |
| Account balance / transactions (Phase III/IV) | unknown publicly | `unverified` | Requires consented customer + corporate-grade onboarding |

**Honest read:** until we sign up an account and inspect the catalogue, we can only *confirm* the OAuth path + one insurance-product API. Everything else is informed expectation based on HKMA Phase I being industry-standard for HK retail banks.

## Rate limits & SDKs

- **Rate limits:** not published on any page we fetched. `unverified — source: not on https://api.bochk.com/FAQ.html or Partnerwithus.html`.
- **Official SDKs:** none mentioned on public pages. FAQ says "We have related documentation available for each API that will help you set up the API in your App" — suggests **per-API code snippets only, no SDK**. `unverified — source: https://api.bochk.com/FAQ.html`.
- **Cost:** **free** for both sandbox and production access ("It is currently free of charge to access our 'sandbox' and 'production'. All prospective partners are welcome to use the portal." — `verified`, FAQ).
- **Terms of use:** "BOCHK API User Conditions" must be accepted before signup. `verified — source: https://api.bochk.com/Partnerwithus.html` Step 1. Full TOS text gated behind acceptance flow on `t&c.html` — **not fetched here**.
- **Browser baseline:** IE 11+, FF 48+, Safari 11+, Chrome 43+. (Indicates the portal itself is old/JS-light — relevant if scripting against the developer UI for automation.)
- **System maintenance window:** Every day **02:30–07:00 HKT** — Developer portal / Sandbox / Gateway unavailable. `verified — source: https://api.bochk.com/FAQ.html`.

## Time-to-first-useful-call estimate

For an unlicensed, individual developer (e.g. wealth-flow contributor working solo) hitting **product-information APIs in sandbox**:

| Step | Estimate | Blocking? |
| --- | --- | --- |
| Sign up + email verification | 5–30 min | yes — manual |
| Register App + select APIs | 5 min | no — self-serve |
| Receive sandbox Client ID/Secret | **same session** for product-info APIs (per FAQ "sandbox access token will be generated for you") | no |
| First OAuth `client_credentials` token call | 1 min | no |
| First product-info GET (e.g. catalogue) | 5 min | no |
| **Total (product-information API, sandbox) — realistic** | **~15–45 min** | **achievable same day** |

For **production** product-information APIs: add a "Move to Production" approval step — duration unspecified by portal (`unverified`); plausibly 1–5 business days based on industry norms.

For **product-application APIs** (Phase II+): add SSL-cert generation, document upload, manual approval, PKI integration work. Realistically **2–6 weeks**, possibly requiring corporate counter-party (BOCHK's TSP review historically does not approve solo developers — `unverified`).

For **Phase III/IV** (account info / transactions): **unknown — sandbox signup required to even see if BOCHK lists these APIs**; assume corporate onboarding (multi-month, contract-bound).

## Recommendation for wealth-flow

Given wealth-flow is a **browser-only, no-backend SPA** (per its `docs/architecture.md` Principle #1), the realistic BOCHK integration scope is:

1. **DO build now — Phase I product information (sandbox tier):** FX rate board + time-deposit rate board + branch locator. These are 100% public-data reads, the only obstacle is signup + OAuth. Slot into `src/integrations/banks/bochk/` per the sibling SCAFFOLD-DESIGN.md, exposed in `src/modules/banks/BanksPanel.tsx` as a rates/branches card next to the existing `bankRates` panel.
2. **DO NOT build yet — Phase II/III/IV:** SSL-cert + PKI payload encryption + manual approval is incompatible with a browser-only app (client secrets in JS bundle = leak); and Phase III/IV need server-side OAuth user-consent flow that contradicts the no-backend principle.
3. **OAuth client_credentials in a browser is acceptable for *sandbox-only* development** (developer paste-in via the existing prefs table in `src/db/schema.ts`), but **must not ship in production** with real BOCHK production secrets — flag this clearly in the UI ("sandbox / read-only / your secrets stay in this browser").
4. **First useful endpoint to target:** FX rate board (HKMA Phase I baseline, almost certainly present in BOCHK catalogue). Matches existing wealth-flow `fx` module slot and unlocks comparison-vs-other-banks story.

## Citations

All URLs fetched 2026-05-20 ~18:15 HKT unless noted:

- `https://api.bochk.com/` — portal landing — HTTP 200 verified
- `https://api.bochk.com/API_index.html` — API catalogue (anonymous view) — HTTP 200 verified
- `https://api.bochk.com/FAQ.html` — primary source for: sandbox availability, cost, OAuth model, SSL-cert requirement split, maintenance window — HTTP 200 verified
- `https://api.bochk.com/Partnerwithus.html` — primary source for: 5-step onboarding, OAuth `client_credentials` shape, sandbox token endpoint, PKI 3-field payload — HTTP 200 verified
- `https://apisandbox.bochk.com/` — sandbox host reachability — HTTP 400 on bare GET (host live, demands proper request) verified
- `https://apisandbox.bochk.com/auth/oauth/v2/token` — token endpoint reachability — HTTP 405 on GET (verifies endpoint exists, expects POST) verified
- `https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/fintech/open-application-programming-interface-api-for-the-banking-sector/` — HKMA Open API Framework "four-phase approach" — HTTP 200 verified

**Claims marked `unverified`:** full BOCHK API catalogue beyond the one publicly visible insurance tile; published rate limits; whether BOCHK has launched HKMA Phase III/IV; production-tier endpoint paths; T&C text; whether HKMA TSP licence is mandatory for Phase III/IV at BOCHK. All require a portal account + login to resolve, which is outside this subtask's read-only scope.
