# Standard Chartered Hong Kong Open API research

_Fetched 2026-05-20 ~18:35 HKT. Claims marked `verified` (URL fetched HTTP 200 + content matched) or `unverified — source: <url>` (URL not reachable from this probe / page is JS-shell with no anonymous-readable body / search-engine result not fetched)._

**TL;DR — SCB HK is the weakest of the three target banks.** No public developer portal subdomain. The only anonymous-readable surface is a single WordPress shell at `www.sc.com/hk/api/` that loads its content via JS and is empty to non-browser fetchers. Catalogue, sandbox, OAuth specifics, rate limits, and SDK details are all `unverified` from this probe and require either (a) login, (b) HKMA aggregator dashboard, or (c) direct contact with SCB HK partnerships team.

## Portal entry point

| Candidate URL | Status (2026-05-20 ~18:35 HKT) | Notes |
| --- | --- | --- |
| `https://developer.sc.com/` | **NXDOMAIN** (DNS lookup fails) — `verified absent` | Cf. HSBC's `develop.hsbc.com` (200) + BOCHK's `api.bochk.com` (200). SCB has no equivalent developer subdomain. |
| `https://developer.standardchartered.com/` | DNS resolves but TLS handshake fails (curl 35) — `verified unreachable` | |
| `https://www.sc.com/hk/api/` | **HTTP 200, title `API – Standard Chartered HK`** — `verified` | WordPress page, body rendered via JS; anonymous static fetch returns only the chrome (head + nav stubs), no content. Canonical URL self-confirms. |
| `https://api.sc.com/` | TLS reset / 000 — `verified unreachable` | Reserved for API runtime, not developer docs. |
| `https://opendata.sc.com/` | NXDOMAIN — `verified absent` | |
| `https://www.sc.com/global/` | HTTP 200 — `verified` | Global SCB landing. No `/global/api/` (404), no `/global/openapi/` (404), no `/global/about/open-api/` (404). |
| `https://aXess.sc.com/` / `https://axess.standardchartered.com/` | NXDOMAIN / 000 — `verified absent` | "aXess" is SCB's corporate-banking portal brand in some markets; not exposed as a public developer host. |

**Practical entry point for an unlicensed third-party developer:** `https://www.sc.com/hk/api/` — but it is a thin marketing/intro page, not a self-serve developer portal. Real onboarding almost certainly happens via a "contact partnerships" sales motion. `unverified — source: page body not visible to anonymous static fetch (JS-rendered WordPress shell)`.

## HKMA Open API Phase coverage

HKMA's [Open API Framework](https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/fintech/open-application-programming-interface-api-for-the-banking-sector/) defines four phases: I product info, II customer acquisition, III account information, IV transactions. All HKMA-licensed retail banks were directed to publish Phase I + II from 2018–2019 and Phase III + IV from 2021 onward.

**SCB HK is on the HKMA list of participating banks** (HKMA "Open API Information of Banks" registry; not refetched in this subtask but well-established as of HKMA Phase III rollout 2021). It is therefore expected to publish at minimum **Phase I (product info)** and **Phase II (customer acquisition)** publicly, with **Phase III + IV** gated behind TPP licensing + customer consent.

**This specific probe could NOT verify the per-phase endpoint URLs** because:

- No SCB developer portal subdomain exists to enumerate against.
- `www.sc.com/hk/api/` body is JS-only.
- HKMA aggregator hosts (`apidashboard.hkma.gov.hk`, `apigw.hkma.gov.hk`) returned `000` (unreachable from this network during this probe — likely network/proxy-related, not aggregator outage).

Conclusion: `unverified — source: SCB-side anonymous pages do not enumerate Phase coverage; HKMA aggregator not reachable in this probe`. Best assumption based on regulatory baseline: **Phase I + II = yes; Phase III + IV = published but gated**.

## Authentication model

`unverified` across the board for SCB HK retail/Open Banking. Industry priors:

- **HKMA Phase I (product info)** is typically open / API-key only.
- **HKMA Phase III + IV** typically require **OAuth 2.0 authorization_code** + customer consent + **mTLS (eIDAS or local CA)** + TPP onboarding.
- SCB globally has corporate-banking APIs ("Straight2Bank" / aXess) that use **client-credentials OAuth + signed JWS** — but these are commercial, not retail Open Banking, and require an existing SCB corporate customer relationship.

**Sandbox availability:** `unverified — source: developer.sc.com NXDOMAIN`. No public sandbox URL discovered in this probe. If one exists, it is referenced only from the JS-rendered `www.sc.com/hk/api/` page or behind a sales/partnership form.

**Production prerequisites:** almost certainly require completion of an SCB partnerships intake form (contact-sales motion), followed by legal/compliance/onboarding gating. `unverified — concrete process not visible anonymously`.

## What an unlicensed third party can pull

Based on the HKMA Phase I regulatory baseline (which SCB HK is required to publish), the following endpoint families should exist somewhere on SCB HK's public surface, but **none were verified in this probe**:

| Endpoint family | Expected? | Verified? |
| --- | --- | --- |
| Branch / ATM locator | yes (Phase I baseline) | `unverified — source: not discoverable from www.sc.com/hk/api/ anonymously` |
| FX / TT rate board | yes (Phase I baseline) | `unverified` (same) |
| Time-deposit / savings rate board | yes (Phase I baseline) | `unverified` (same) |
| Credit-card / mortgage / loan product catalogue | yes (Phase I baseline) | `unverified` (same) |
| Account balance / transactions (Phase III) | gated — customer consent + TPP | `unverified — likely gated, never accessible to unlicensed dev` |
| Payment initiation (Phase IV) | gated — customer consent + TPP | `unverified — likely gated, never accessible to unlicensed dev` |
| Corporate aXess / Straight2Bank APIs | requires SCB corporate customer status | `unverified — not in scope for personal wealth tracker` |

**Honest read:** SCB HK very likely complies with HKMA Phase I (it is a regulatory obligation), but the endpoint URLs are not enumerable from the publicly-readable HTML — they are surfaced via JS on `/hk/api/` or accessed via the HKMA aggregator. This is materially weaker discoverability than BOCHK (which has a full `api.bochk.com` catalogue) or HSBC (which has the full `develop.hsbc.com` portal).

## Rate limits & SDKs

- **Rate limits:** `unverified — source: no public developer portal to publish them on`.
- **SDKs:** `unverified — source: no developer portal to host them`. SCB globally does not publish a public retail-banking SDK to the best of this researcher's pre-fetched knowledge; corporate Straight2Bank has integration SDKs but those are gated.
- **Terms of use:** `unverified — gated`.
- **Cost:** `unverified — gated`.
- **Maintenance windows:** `unverified — gated`.

## Time-to-first-useful-call estimate

For an unlicensed individual developer:

| Step | Estimate | Notes |
| --- | --- | --- |
| Discover SCB HK API contact path | 30 min | requires JS-rendering the `/hk/api/` page or finding the HKMA aggregator entry |
| Submit partnership intake form / email partnerships team | 10 min | one-shot send |
| **Wait for SCB response** | **unknown — likely days-to-weeks** | corporate sales motion, not self-serve |
| Onboarding + credential provisioning | unknown | manual |
| First sandbox call | unknown | sandbox may not exist publicly |
| **Total for self-serve Phase-I-style fetch** | **probably not achievable without contacting SCB** | |

For comparison: BOCHK = self-serve sandbox in <1 hour; HSBC = self-serve Open Banking sandbox in ~30–60 min. SCB HK is the slowest of the three by a large margin.

## Recommendation for wealth-flow

Given wealth-flow is a browser-only no-backend SPA, and SCB HK has no public developer portal:

1. **Phase 1 — deprioritise SCB HK live API integration.** Until SCB HK exposes a self-serve developer portal (or until we email partnerships and get sandbox creds), SCB cannot be wired the same way BOCHK + HSBC will be.
2. **Phase 1 fallback — ship a "SCB HK manual" data path:** add a curated `src/data/scb-hk-snapshot.ts` (FX board, deposit rates, branch list) populated by hand from `www.sc.com/hk` retail pages, mirroring the existing `bank-rates-snapshot.ts` pattern (per INVENTORY.md). This keeps SCB in the 3-bank UX even without live API.
3. **Phase 1 — render SCB as a "data refreshed weekly, manual source" tile** in `src/modules/banks/BanksPanel.tsx` next to the live BOCHK + HSBC tiles. Honest UX label.
4. **Phase 2 — email SCB HK partnerships** (`partnerships.hk@sc.com` or via the contact form on `/hk/api/`), request Open Banking developer access + sandbox credentials. Estimated reply time: days-to-weeks.
5. **Phase 2 — meanwhile**, attempt to scrape the HKMA Open API aggregator (`apidashboard.hkma.gov.hk`) for SCB HK Phase I endpoint URLs once that aggregator is reachable from our network. If discovered, retrofit a `scb_hk` provider behind the same interface as `bochk` and `hsbc_hk`.
6. **Never build:** SCB corporate aXess / Straight2Bank — out of scope for a personal wealth tracker.

## Citations

All URLs probed 2026-05-20 ~18:35 HKT:

- `https://www.sc.com/hk/api/` — HTTP 200, title `API – Standard Chartered HK`. Body is JS-rendered WordPress shell, empty to anonymous static fetch (8.7 kB head/chrome only, 0 chars body text after script/style strip). `verified existence + title; unverified content`.
- `https://www.sc.com/global/` — HTTP 200. `verified existence`.
- `https://developer.sc.com/` — DNS NXDOMAIN. `verified absent`.
- `https://developer.standardchartered.com/` — DNS resolves; TLS handshake fails (curl 35 LibreSSL SSL_ERROR_SYSCALL). `verified unreachable`.
- `https://api.sc.com/`, `https://opendata.sc.com/`, `https://aXess.sc.com/`, `https://axess.standardchartered.com/` — all NXDOMAIN or TLS reset. `verified absent / unreachable`.
- `https://www.sc.com/en/banking/open-banking/`, `/global/openapi/`, `/global/about/open-api/`, `/hk/help/api/`, `/hk/banking/api/`, `/hk/partner-api/`, `/hk/partner-with-us/`, `/global/about/sc-ventures/`, `/hk/openapi/`, `/hk/open-banking/`, `/hk/api/swagger/` — all HTTP 404. `verified absent`.
- `https://apidashboard.hkma.gov.hk/`, `https://apigw.hkma.gov.hk/` — `000` from this network. `unverified reachability`.
- `https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/fintech/open-application-programming-interface-api-for-the-banking-sector/` — `verified` in sibling BOCHK research (same session, not refetched here). Source for HKMA four-phase regulatory framework.
- `web_search` tool: returned `missing_kimi_api_key` error this round (also failed in BOCHK sibling); duckduckgo + bing HTML fallbacks returned empty parsable result sets in this probe. No third-party search citations included to avoid fabrication.

**Claims marked `unverified`:** SCB HK Phase coverage per endpoint, OAuth grant types, sandbox URL, mTLS requirements, rate limits, SDK languages, T&C text, pricing, partnership contact email, time-to-first-call. All blocked behind either (a) JS-rendering the `/hk/api/` page in a real browser, (b) HKMA aggregator dashboard reachable, or (c) contact with SCB HK partnerships team. Out of scope for this time-budgeted anonymous probe.
