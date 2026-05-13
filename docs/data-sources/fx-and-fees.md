# FX & Cross-Border Transfer Fees — Data Sources

Two related concerns for `src/modules/fx/` and `src/modules/transferFees/`:
live exchange rates for portfolio aggregation, and posted bank fees for
cross-border (CN ↔ HK) transfers so the user can compare cost.

---

## Part A — FX rates

Coverage: CNY, HKD, USD, EUR, JPY, GBP (any pair).

### A.1 Recommended primary — frankfurter.app

| field | value |
| --- | --- |
| URL | `https://api.frankfurter.app/latest?from=USD&to=CNY,HKD,EUR,JPY,GBP` |
| Format | JSON `{ amount, base, date, rates: { CNY: 7.x, ... } }` |
| Cadence | Daily, ECB reference rate (~16:00 CET) |
| CORS | ✅ open (verified) |
| Auth | none, free, unlimited |
| Caveat | ECB only publishes vs EUR — `from=USD` is a derived cross-rate; fine for portfolio display, NOT for trading-grade quotes |

### A.2 Live intraday fallback — open.er-api.com

| field | value |
| --- | --- |
| URL | `https://open.er-api.com/v6/latest/USD` |
| Format | JSON `{ result, base_code, rates }` |
| Cadence | Hourly |
| CORS | ✅ |
| Auth | none, free |

### A.3 Authoritative CNY references (Mainland use)

- **PBOC central parity (中间价)** — published 09:15 CST on
  `www.chinamoney.com.cn/chinese/bkccpr/`. Use for any "official" CNY
  rate display; not for live FX trading.
- **HKMA daily fixing** — `https://www.hkma.gov.hk/eng/data-publications-and-research/`
  HKD/USD ~7.75-7.85 band; reference only.

### A.4 Tried and rejected

- **exchangerate.host** — historically free, **as of 2026 requires an
  `access_key`** (verified: returns `{success:false, code:101}`). Drop.
- **Yahoo Finance FX** (`USDCNY=X` via v8 chart) — works but rate-limited
  with stocks; keep as deep fallback.

### A.5 Sample row (frankfurter, expected shape)

```json
{
  "amount": 1.0,
  "base": "USD",
  "date": "2026-05-12",
  "rates": { "CNY": 7.18, "HKD": 7.80, "EUR": 0.92, "JPY": 152.3, "GBP": 0.79 }
}
```

### A.6 Refresh cadence in the app

- Foreground app open → fetch on mount + every 5 min.
- Background → cache 1h in worker KV.
- All FX rows tagged `source: 'frankfurter' | 'erapi' | 'snapshot'` so
  the UI can show provenance.

---

## Part B — CN ↔ HK transfer fees

Static research — these change rarely (1–2×/yr) and per-bank tariff
PDFs are the authoritative source. Capture in
`src/data/transfer-fees-snapshot.ts` and refresh manually each quarter.

### B.1 Coverage

| Bank | Code | Posted tariff URL |
| --- | --- | --- |
| Bank of China (HK) 中銀香港 | `bochk` | https://www.bochk.com/en/aboutus/bankcharges.html |
| ICBC (Asia) 工銀亞洲 | `icbcasia` | https://www.icbcasia.com/ICBC/海外分行/工銀亞洲/EN/CustomerService/ServiceCharges/ |
| HSBC HK 滙豐 | `hsbchk` | https://www.hsbc.com.hk/help/fees/ |
| Hang Seng 恒生 | `hangseng` | https://www.hangseng.com/en-hk/help/charges/ |
| CMB Wing Lung 招商永隆 | `wlb` | https://www.winglungbank.com/en/about-us/bank-charges.html |

### B.2 Tariff structure (typical)

Most HK banks use a **fixed wire fee + cable charge + correspondent
deduct**, NOT a percentage. Common pattern (HKD-denominated):

- Outward TT (telegraphic transfer) commission: **HKD 100–220**
- Cable charge (SWIFT msg): **HKD 75–100**
- Correspondent / agent deduct: **USD 15–35** (taken from beneficiary unless `OUR` is selected)

Mainland China banks (BoC, ICBC for HK→CN inbound) typically charge:

- Inbound RMB credit: free or **CNY 0–25**
- Inbound USD credit: **0.05–0.1%** (min ~CNY 20, max ~CNY 250)

### B.3 Direction matters

- **HK → CN**: fee paid to the HK side (TT commission + cable). The
  Mainland receiving bank may charge a small inbound credit fee.
- **CN → HK**: regulated by SAFE; under USD 50,000/year/person quota.
  Fees set by the sending Mainland branch — usually 0.05–0.1% of amount,
  min CNY 50, max CNY 260, plus SWIFT cable CNY 80–150.

### B.4 What to capture in the snapshot

For each `(bank, direction)`:

```ts
{
  bank: 'bochk' | 'icbcasia' | 'hsbchk' | 'hangseng' | 'wlb',
  direction: 'HK->CN' | 'CN->HK',
  fixedFee: number,       // commission in `currency`
  cableFee: number,       // SWIFT msg fee
  percentFee: number,     // 0 if flat
  minFee: number,
  maxFee: number,
  currency: 'HKD' | 'CNY' | 'USD',
  swiftEquivalent?: string,  // e.g. "MT103 OUR"
  asOf: string,
  sourceUrl: string,
}
```

### B.5 Worker proxy?

Not needed — these are **static snapshot only**. We do NOT scrape live
because the tariff PDFs are styled brochures with no stable selectors,
and rates change quarterly at most. A GitHub Action runs `scripts/
verify-tariffs.ts` weekly to HEAD-check that the source URL still 200s
and opens an issue if not.

---

## Part C — End-to-end cost calculator (round 2+)

Combining FX (Part A) + fees (Part B), the UI computes "true cost" of
moving N CNY from a Mainland account to an HK account:

```
totalHKD = (N / fx.USDCNY * fx.USDHKD)
         - sendFee_CN_in_HKD
         - cableFee
         - inboundFee_HK
         - correspondent_deduct
```

That belongs in `src/lib/calc/transferCost.ts` next round.
