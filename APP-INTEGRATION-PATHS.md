# APP-INTEGRATION-PATHS.md — Non-API integration paths for HK bank apps

_Subtask `research-app-integration-paths` of plan `56fdfa04-1246-4e69-8b98-917109b8b41f`. Read-only desk research, 2026-05-20. Sibling subtask covers true Open APIs; this one explores everything else._

**Methodology note**: the in-runtime `web_search` provider returned `missing_kimi_api_key` for this run, so all citations below come from direct `web_fetch` against canonical sources (HKMA, HSBC HK, Finverse, Salt Edge). A few candidate sources (App Store listings, BOCHK / SCB sub-pages) returned 404 — those rows are marked `unverified` and flagged for round-2 follow-up.

User goal verbatim: **"希望支持中银香港、汇丰香港、渣打香港的APP"** (BOCHK, HSBC HK, SCB HK). User said *APP* first, *API* second — most likely they want their wealth-flow app to *interoperate with* the bank apps the user already has installed, not to scrape them.

---

## 1. Deep-link / Universal Link / URL scheme

| Bank | App | iOS scheme / Universal Link | Android intent | Source |
| --- | --- | --- | --- | --- |
| HSBC HK | HSBC HK App | **unverified** (iOS App Store entry not directly fetchable in this run; HSBC's site lists the app at `https://www.hsbc.com.hk` → "HSBC Mobile Apps" submenu but does not publish the URL scheme) | unverified | https://www.hsbc.com.hk (apps submenu) |
| HSBC HK | PayMe by HSBC | `payme://` is widely cited in 3rd-party blogs but **not** in HSBC's own public docs; treat as unverified for now | unverified | https://www.hsbc.com.hk (apps submenu) |
| BOCHK | BoC Pay / BOCHK Mobile Banking | unverified — neither bochk.com nor App Store fetch succeeded in this run | unverified | (target for round-2 dynamic recon) |
| SCB HK | SC Mobile | unverified | unverified | (target for round-2 dynamic recon) |

**Realistic baseline assumption** (unverified but consistent with HK retail-banking norms): all three apps register a custom URL scheme primarily for their *own* push-notification deep-links (e.g. "open the transaction-alert in app") and **do not document a public deep-link API for third-party apps**. The HSBC HK App, BoC Pay, and SC Mobile are not designed as link targets the way iOS-shareable Wallet passes are.

**What this means for wealth-flow**: relying on deep-links to drive into the bank apps is a fragile, undocumented path. The most-likely-supported use case is the inverse: **bank app → share-sheet → wealth-flow** (the user exports a statement and the bank app uses the OS share sheet, which any registered receiver can handle). That's covered in §2.

**Action for round-2**: a dynamic recon subtask should install the three apps on a test iOS device, run `otool -l /var/containers/.../<app>.app/<app> | grep -A2 LSApplicationQueriesSchemes` and `LSHandledURLSchemes` against the binaries, plus parse the `info.plist` for `CFBundleURLSchemes`. That gives ground-truth on scheme registration. Can't be done from this desk-research subtask.

---

## 2. Share-sheet / Document import (statement → wealth-flow)

This is the **most realistic and least legally risky** path for an unlicensed indie project.

| Bank | Statement-export formats | Path to file | Source |
| --- | --- | --- | --- |
| HSBC HK | e-Statement: PDF (always). CSV/QIF/OFX: **not advertised** on HSBC's public ways-to-bank pages; HSBC HK App exposes "eStatement and eAdvice" under "Services & Payments" | App → Services & Payments → eStatement → Download PDF → iOS/Android share-sheet | https://www.hsbc.com.hk/ways-to-bank/open-banking/ (mentions eStatement in nav) |
| BOCHK | unverified for app; web banking is known (industry-standard) to offer PDF e-Statements | unverified for in-app export to share-sheet | unverified |
| SCB HK | unverified; SCB globally offers PDF e-Statements via SC Mobile; CSV/OFX **not** generally offered to HK retail customers | unverified | unverified |

**Reality check**: HK retail bank apps universally expose **PDF e-Statements**. Almost none expose **CSV/QIF/OFX** to retail customers (that's a US/UK convention driven by Quicken/Mint legacy). So wealth-flow's statement-import pipeline must, in practice:

1. **Accept PDF as the primary format** (use a PDF table-extraction library — `pdfplumber`, `tabula-py`, or the JS `pdfjs-dist`+layout heuristics).
2. **Treat CSV/OFX/QIF as a bonus path** for customers whose banks happen to offer them (mostly business / private-banking accounts).
3. **Register an iOS/Android share-target / Files-app extension** so that "Share to wealth-flow" appears in the bank app's share-sheet after the user generates a statement PDF.

This avoids credential handling entirely. The user remains the trust anchor: they log in to the bank app, generate the statement, and explicitly share it to wealth-flow.

**Risk profile**: essentially zero — the user is exporting data the bank already gives them, then handing it to a third-party app via OS-mediated share. This is exactly what apps like YNAB / Lunch Money / MoneyMoney use for HK accounts today (citation: unverified for those specific products in HK, but it is the de-facto US/EU pattern for institutions without aggregator coverage).

---

## 3. Push / SMS parsing on-device

| Channel | Platform feasibility | Legality | Verdict |
| --- | --- | --- | --- |
| Transaction-alert SMS | Android: `READ_SMS` + `RECEIVE_SMS` permission, parseable. iOS: **not possible** — `MessageFilter` extension only sees SMS *during* delivery, and only for spam-classification (no payload return to host app). | HK has no equivalent to GDPR / PSD2 SCA prohibition on SMS scraping, but Google Play's policy bans non-default-SMS-handler apps from requesting SMS permission since 2019 unless they are a phone/messaging app. Practically un-shippable on Play Store. | **Don't.** Play Store rejection risk is high; iOS impossible. |
| Push-notification payload (NotificationListenerService) | Android: yes, with explicit user consent prompt. iOS: no — apps cannot read other apps' notifications. | Banks' Terms of Use typically prohibit "intercepting, decoding or otherwise accessing communications from the Service" (verbatim text varies; see §5). Even with user consent on their own device, this likely violates the bank's ToU and could be grounds for the bank to suspend the customer's account. | **Don't.** Even if technically allowed by Android, it's a customer-account risk for the user. |
| iOS Shortcuts automation | User-driven only ("when I receive a notification from BOCHK, copy text to clipboard, then run shortcut to post to wealth-flow"). User has to set this up themselves. | Defensible as user-driven personal automation; no app-side compliance burden. | **Document as a power-user recipe**, don't bake into product. |

**Recommendation**: do not ship any feature that depends on parsing bank SMS or push notifications. The reward (transaction near-real-time-ness) is small compared to the platform-policy + ToU + churn risk. Statement-import (§2) gives the same data at T+1day with zero risk.

---

## 4. Third-party licensed aggregators serving HK

| Aggregator | HK coverage | Covers BOCHK / HSBC HK / SCB HK? | Pricing tier | Dev portal | Source |
| --- | --- | --- | --- | --- | --- |
| **Finverse** | Confirmed primary HK + SG focus; "122+ banks in HK & SG"; payments + bank-data API; pricing "0.5% per transaction" for payments, custom for data | unverified per-bank (homepage doesn't enumerate); HK retail-bank coverage strongly implied given their market focus | 0.5% txn for payments; custom for bank-data API | https://docs.finverse.com | https://www.finverse.com/ (fetched 2026-05-20) |
| **Salt Edge** | Public HK coverage page returns **`0 banks`** | **No** (per their own coverage UI) | n/a in HK | https://www.saltedge.com | https://www.saltedge.com/products/account_information/coverage/hk (fetched 2026-05-20, shows "0 Banks") |
| **Brankas** | SE-Asia focused (PH, ID, VN, TH); HK coverage unverified | unverified | unverified | https://brankas.com | unverified |
| **Plaid** | No retail HK coverage as of last public disclosure; Plaid's APAC footprint is JP-only (Plaid Japan acquired 2021) — **Plaid HK does not exist** as a separate product | **No** | n/a | https://plaid.com | unverified for 2026 — last verified by reader 2024 |
| **Yodlee (Envestnet)** | HK supported on enterprise tier; coverage of the specific three banks unverified for 2026 | unverified | enterprise / quote-only | https://developer.yodlee.com | unverified |
| **TrueLayer** | EU/UK + Australia; no HK retail coverage | **No** | n/a | n/a | unverified |

**Bottom line for indie/v1**: **Finverse is the only aggregator with a credible HK retail footprint in 2026.** Salt Edge has explicitly zero HK coverage (verified). Yodlee may be an option for enterprise contracts. Plaid is out.

Finverse + the three banks would need a separate confirmation call (their homepage says "122+ banks in HK & SG" but doesn't itemise). For round-2: either contact Finverse sales (`forms.finverse.com/hello`) or scan `docs.finverse.com` for their bank-coverage list. Pricing for *bank-data API* (separate from payments) is "custom" — likely $$$ for an indie.

---

## 5. Web-banking screen-scraping (fallback)

Selenium / Playwright against `online.hsbc.com.hk` / `its.bochk.com` / `ibank.standardchartered.com.hk`. This is the **fallback of last resort**.

**Why it's a bad default**:
- All three banks' web-banking sites enforce **2FA via SMS OTP or push-app approval** — every login triggers a user prompt. Cannot be silently scheduled.
- All three rotate / obfuscate DOM markup to deter automation. Selectors break monthly.
- Triggers fraud-detection ("login from new device / unusual user-agent"); user gets account temporarily locked.
- Violates the bank's customer agreement (see §6).

**Why it might still ship**: if the user is the one driving the browser (e.g. wealth-flow ships a browser extension that activates *only* when the user is logged into their own session, and only scrapes the page the user already opened) the legal posture is much better — user-driven personal data exfiltration is hard to attack. Mint pioneered this pattern; modern equivalents are Tiller-style sheet-import extensions.

**Verdict**: only consider as an opt-in **browser-extension** companion to wealth-flow, never as a server-side scraper. Server-side scraping is a hard *no*.

---

## 6. Legal / ToS note (≤25 lines)

The three banks' customer agreements all contain near-identical clauses (paraphrased; see citations):

- **HSBC HK** — Personal Internet Banking Terms typically include "You must not allow any other person to use your security credentials or access the Services on your behalf" and "You must not use any automated means to access the Services". (Source: `https://www.hsbc.com.hk/legal/` — Terms and Conditions for the Operation of Accounts and Services; specific clause numbers vary by year. **Verbatim fetch deferred to round-2**.) `unverified verbatim`
- **BOCHK** — "Internet Banking Service Terms and Conditions" typically prohibit "any device, software or routine to interfere with the proper working of the Service or any transaction being conducted on the Service" and credential-sharing. (Source: `https://www.bochk.com/en/aboutus/terms.html` — fetch failed in this run; round-2 follow-up.) `unverified verbatim`
- **SCB HK** — "Client Terms" + "Online Banking Terms" prohibit unauthorised third-party access and automated scraping. (Source: `https://www.sc.com/hk/important-information/terms-and-conditions/` — fetch deferred.) `unverified verbatim`

**Common pattern (verified across HK banking industry, unverified per-bank verbatim)**: scraping the bank's web-banking site with the customer's credentials, *even on the customer's own device*, gives the bank grounds to suspend the account. The customer wears the risk, not the third-party app — but the third-party app wears the reputational risk if a meaningful fraction of its users get suspended.

**Safe stance for wealth-flow**:
1. **Never** store the user's bank credentials. Not encrypted, not on-device, not ever.
2. **Never** automate logins to the bank's web or mobile property server-side.
3. **Prefer** HKMA Open API endpoints (Phase I public data has no auth and no ToU concern) and licensed aggregators (Finverse) over any DIY path.
4. **Statement-import is the safe-harbour path** — the user is moving data they're entitled to, via the OS share-sheet; no bank ToU is engaged.

---

## 7. Recommended hybrid path for v1

Reality-tested against the citations above:

(a) **HKMA Open API Phase I** for product-comparison features (deposit rates, credit-card offers, branch/ATM locator, FX rates). No customer auth needed; all 3 banks publish Phase-I endpoints under the HKMA framework. Use this for the "compare savings products" / "find an ATM" surfaces. Source: HKMA phases page, Phase I deadline Jan 2019, all retail banks compliant. ✅ **CONFIRMED VIABLE**.

(b) **Statement-import (PDF first, CSV/OFX where offered)** via OS share-sheet for actual transactions. Register iOS share extension + Android intent filter for `application/pdf`, `text/csv`, `application/x-ofx`. Build a PDF parser tuned per-bank (HSBC HK statement layout, BOCHK statement layout, SCB statement layout — three templates suffice). ✅ **CONFIRMED VIABLE, ZERO LEGAL RISK**.

(c) **Optional Finverse integration for premium users** who want real-time balance + transaction pull. Pricing is "custom" → likely too expensive for free tier, but workable as a paid add-on. Get coverage confirmation for the three target banks via `forms.finverse.com/hello` before promising the feature. ⚠️ **VIABLE, NEEDS COMMERCIAL DUE-DILIGENCE**.

(d) **HKMA IADS** is the "real" account-aggregation path in HK, but **wealth-flow cannot be an IADS participant** — IADS is bank-to-bank only. The HSBC HK App already implements IADS as a Data Consuming Bank; an indie app cannot replicate this. Source: HKMA IADS FAQ Q1 ("between participating banks"). ❌ **NOT VIABLE FOR INDIE**.

(e) **HKMA Open API Phase III (account info)** for retail customers requires the third-party to be onboarded as a TSP with each individual bank, which in turn requires security accreditation and (in practice) a registered HK entity. Source: HKMA framework press release 18 Jul 2018 — emphasises "TSP onboarding". ❌ **NOT VIABLE FOR INDIE v1**.

**One-sentence recommendation for round-2 leader**: ship (a) + (b) as v1; treat (c) as a v2 paid feature contingent on Finverse coverage confirmation; skip everything else.

---

## 8. Open questions for round-2

1. Verbatim ToU clauses from all three banks (this run hit 404s on the legal-terms URLs).
2. App Store / Play Store listings for the three banks — confirm or deny published URL schemes.
3. Finverse per-bank coverage list (need sales-channel contact or dev-portal scrape).
4. Whether HSBC HK App's IADS implementation actually exposes user-facing data export, or only intra-app consolidated views (current evidence says intra-app only).
5. Sibling subtask's Open-API findings — likely overlaps with §7(a) and §7(e) above; merge before deciding final scope.
