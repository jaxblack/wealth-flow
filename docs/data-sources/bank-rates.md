# Bank Rates — Data Sources

Goal: power `src/modules/bankRates/` with **live deposit + loan rates** for
the 6 large Chinese banks (ICBC 工商, CCB 建行, BoC 中行, ABC 农行,
BoCom 交行, CMB 招行) plus the PBoC **LPR** benchmark. This doc captures
where the data actually lives, how to fetch it, and a fallback strategy.

> All endpoints below were spot-checked at the time of writing. URLs
> on the bank sites tend to be stable for years (they're linked from
> printed disclosures), but the *page layouts* change — write parsers
> defensively.

---

## 1. PBoC LPR (loan benchmark)

| field | value |
| --- | --- |
| Authoritative URL | https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/3876551/index.html |
| Format | HTML table (paginated, ~86 records, 20/page) |
| Cadence | Monthly, 20th (or next business day), ~09:15 CST |
| CORS | ❌ no `Access-Control-Allow-Origin`; needs proxy |
| Recommended primary | **eastmoney datacenter JSON** (below) |

### Recommended primary — Eastmoney 东方财富

```
GET https://datacenter-web.eastmoney.com/api/data/v1/get
    ?reportName=RPT_IMP_INTRESTRATEN
    &columns=ALL
    &pageNumber=1&pageSize=20
    &sortColumns=REPORT_DATE&sortTypes=-1
```

- Returns JSON `{ result: { data: [{REPORT_DATE, REPORT_PERIOD, IR_RATE, ...}] } }`.
- For LPR specifically use `reportName=RPT_IMP_LPRMP` (1Y / 5Y series).
- Update lag vs PBoC: < 5 minutes.
- CORS: also blocked from browser → still need a worker proxy, but the
  shape is stable so a tiny edge function can normalize and cache.

Sample row (Shibor probe confirms the API is alive — same shape applies
to LPR report):
```json
{"REPORT_DATE":"2026-05-12 00:00:00","REPORT_PERIOD":"1Y","IR_RATE":3.10,"CHANGE_RATE":0.0}
```

---

## 2. Per-bank deposit rates (公示存款利率)

Each big bank is required by 银保监会 to publish a current 公示存款利率
page. They are HTML, no API. Update cadence is 1–4×/year following
industry-wide cuts.

| Bank | Code | Public rates page | Notes |
| --- | --- | --- | --- |
| ICBC 工商银行 | `icbc` | https://www.icbc.com.cn/icbc/个人金融/存款服务/公示存款利率/ | HTML table; mirror at `icbc.com.cn/ICBC/个人服务/最新存款利率/` |
| CCB 建设银行 | `ccb`  | http://www.ccb.com/cn/personal/rate/index.html | HTML; structured `<table class="ratetable">` |
| BoC 中国银行  | `boc`  | https://www.bankofchina.com/fimarkets/lilv/fd31/ | Multi-currency; CNY block at top |
| ABC 农业银行 | `abc`  | https://www.abchina.com/cn/AboutABC/nhgg/lcfslv/ | PDF + HTML; PDF is canonical |
| BoCom 交通银行 | `bocom` | https://www.bankcomm.com/BankCommSite/shtml/jyjr/cn/7244/list.shtml | HTML list of dated announcements |
| CMB 招商银行 | `cmb`  | http://www.cmbchina.com/CmbWebPubInfo/PersonalDeposit.aspx?chnl=gryhdkll | Cleanest layout; ASPX, HTML table |

All are CORS-blocked from a browser → must go through a server-side
proxy. Parsing strategies:

- **HTML tables** (ICBC, CCB, BoC, BoCom, CMB): selector-based scraper
  using `cheerio`. Anchor on the row label (`整存整取 1年` / `三个月` /
  `活期存款`), not on column index.
- **ABC PDF**: download monthly, run `pdf-parse`, regex-extract.
- **Defensive**: store the raw HTML/PDF blob next to the parsed row in
  R2 so a parser regression can be re-run against historical inputs.

---

## 3. Aggregator fallbacks

When a primary 404s, fall back in this order:

1. **Eastmoney 东方财富** — `https://data.eastmoney.com/cgsj/cunkuanlilv.html`
   plus its backing `dataapi.eastmoney.com` JSON. Covers all 6 banks +
   joint-stock peers in a single response.
2. **融360 (rong360.com)** — `https://www.rong360.com/licai-cunkuan/`.
   Aggregated table; scrape-only, no public API.
3. **Sina Finance** — `https://money.finance.sina.com.cn/bank/quote/`
   has historical CSV exports. Slow, but useful for charting.
4. **新浪财经 / Tencent 腾讯财经** — similar coverage; both gated by
   referer headers.

Note: relying on a single aggregator is risky (rong360 has rate-limited
us in the past). Always keep ≥2 sources + the static snapshot below.

---

## 4. Architecture — fetcher + worker proxy

The web app cannot hit any of the above directly (CORS). All requests
go through a Cloudflare Worker at `api.wealth-flow.app` that:

1. Fans out to the per-bank source.
2. Normalizes to a uniform JSON shape.
3. Caches in KV for 30 min (deposit) / 5 min (LPR).
4. Returns `Cache-Control: public, max-age=900` + `ETag`.

Browser-side fetcher sketch:

```ts
// src/lib/fetchers/bankRates.ts (round 2)
export type BankCode = 'icbc' | 'ccb' | 'boc' | 'abc' | 'bocom' | 'cmb';
export type RateType = 'demand' | 'fixed' | 'lpr' | 'mortgage';
export type Term = '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | 'demand';

export interface BankRate {
  bank: BankCode | 'pboc';
  type: RateType;
  term: Term;
  rate: number;        // annualized %, e.g. 1.55 means 1.55%
  asOf: string;        // ISO-8601, source's effective date
  source: 'live' | 'snapshot';
  sourceUrl?: string;
}

const BASE = import.meta.env.VITE_BANK_RATES_API ?? '/api/bank-rates';

export async function fetchBankRates(bank: BankCode | 'pboc'): Promise<BankRate[]> {
  const r = await fetch(`${BASE}/${bank}`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`bank-rates ${bank}: HTTP ${r.status}`);
  return r.json();
}
```

---

## 5. Fallback — static snapshot

If `fetchBankRates` throws (worker down, source 5xx, network), the UI
falls back to `src/data/bank-rates-snapshot.ts` — a hand-curated table
refreshed weekly by a cron-job + PR. The snapshot ships with every
build so the app is **never empty** on first paint, and all rows are
tagged `source: 'snapshot'` so the UI can show a "stale, last updated
YYYY-MM-DD" badge.

Refresh procedure:
1. Cron (GitHub Action) runs `scripts/refresh-snapshot.ts` weekly.
2. Script hits the worker, diffs against current snapshot.
3. Opens a PR if any rate moved ≥ 1bp.

---

## 6. Open questions / TODO

- [ ] Confirm `RPT_IMP_LPRMP` is the right eastmoney report id for LPR
      (vs `RPT_IMP_INTRESTRATEN` which is interbank/Shibor).
- [ ] ABC's PDF: pin a stable selector — they renumber the file each
      release.
- [ ] Mortgage rates (LPR + bank spread) are city-specific; need a
      separate source (e.g. 贝壳找房 or 中指院).
- [ ] Investigate whether 中国货币网 (chinamoney.com.cn) offers a
      cleaner LPR feed than eastmoney.
