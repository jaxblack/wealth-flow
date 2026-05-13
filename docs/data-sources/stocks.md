# Stocks — Data Sources

Goal: power `src/modules/stocks/` with quotes for **A股 (SSE/SZSE)**,
**港股 (HKEX)**, and **美股 (NYSE/Nasdaq)**. All three markets share a
single fetcher contract; the source per market differs because of
licensing + CORS realities.

---

## 1. A股 (Shanghai 上交所 / Shenzhen 深交所)

| field | value |
| --- | --- |
| Recommended primary | **Tencent 腾讯财经 — `qt.gtimg.cn`** |
| URL pattern | `https://qt.gtimg.cn/q=sh600000,sz000001` |
| Format | `text/html` (semicolon-delimited `v_<sym>="...";` JS assignments) |
| Cadence | ~1s tick during 09:30–11:30 / 13:00–15:00 CST |
| CORS | ❌ no `Access-Control-Allow-Origin` header → needs proxy |

Sample (verified 2026-05-13):
```
v_sh600000="1~浦发银行~600000~9.02~9.03~9.04~230613~126506~104095~9.02~..."
```
Field order: `state ~ name ~ code ~ price ~ prevClose ~ open ~ volume(手) ~ ...`.
Parser: split on `~`, index by position. Document field map in
`src/lib/fetchers/_parsers/tencent.ts`.

### Fallbacks

1. **Sina 新浪财经** — `https://hq.sinajs.cn/list=sh600000`. Same shape
   (`var hq_str_sh600000="..."`) but requires `Referer: https://finance.sina.com.cn`
   header → proxy must spoof it.
2. **Eastmoney 东方财富** — `https://push2.eastmoney.com/api/qt/stock/get?secid=1.600000&fields=f43,f44,f45,f60,f86`.
   JSON, more detail, also CORS-blocked. Use for company snapshot view.
3. **akshare** (local) — only if we add a Python sidecar; ignore for v1.

### Rate limits

Tencent: no published limit, but >5 req/s/IP gets throttled. Batch up
to 50 symbols per `q=` call (comma-separated).

---

## 2. 港股 (HKEX)

| field | value |
| --- | --- |
| Recommended primary | **Tencent — `qt.gtimg.cn` with `hk` prefix** |
| URL pattern | `https://qt.gtimg.cn/q=hk00700,hk09988` |
| Format | same `v_hk00700="..."` shape |
| Cadence | 15-min delayed unless paying HKEX for live |
| CORS | ❌ → proxy |

Sample symbol map: `hk00700` = Tencent, `hk00005` = HSBC, `hk09988` = BABA.

### Fallbacks

1. **Sina** — `hq.sinajs.cn/list=rt_hk00700` (`rt_` prefix returns
   real-time-ish for delayed-licensed fields).
2. **HKEX official** — `https://www.hkex.com.hk/eng/sorc/options/...`
   delayed-quote JSON; not friendly to scrape, use only as authoritative
   reference for trading-halt status.
3. **Yahoo Finance v8** — `query1.finance.yahoo.com/v8/finance/chart/0700.HK`.
   Works cross-origin from browser (verified). Slower than Tencent but
   no proxy needed.

---

## 3. 美股 (NYSE / Nasdaq)

| field | value |
| --- | --- |
| Recommended primary | **Yahoo Finance v8 chart API** |
| URL pattern | `https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d` |
| Format | JSON `{ chart: { result: [{ meta, indicators, timestamp }] } }` |
| Cadence | real-time (consolidated tape, ~250ms behind direct feed) |
| CORS | ✅ **works from browser** (verified 2026-05-13, returned `chart.result[0].meta` for AAPL on NasdaqGS) |

This is the only of the three markets where we don't strictly need a
proxy. Still route through the worker for caching + ETag support.

### Fallbacks

1. **Stooq** — `https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv`. CSV.
2. **IEX Cloud** — paid; only worth it if we want options chains.
3. **Finnhub** — free tier 60 req/min, requires API key. Good for
   fundamentals but rate-limited for streaming.
4. **Polygon.io** — paid; consider for historical bars.

### Rate limits

Yahoo's undocumented limit is ~2000 req/h/IP before soft-blocks. Cache
quotes 30s in the worker; fetch in batches via `?symbols=AAPL,MSFT,...`
(use the `/v7/finance/quote` endpoint for batch).

---

## 4. Cross-cutting concerns

- **Symbol normalization**: store an `ExchangeSymbol = { exchange: 'SSE'|'SZSE'|'HKEX'|'NASDAQ'|'NYSE', code: string }`
  internally; the per-source mapper converts at the fetcher boundary.
- **Currency**: each row carries its own `currency` (CNY / HKD / USD)
  for portfolio aggregation alongside FX (see `fx-and-fees.md`).
- **Delayed-quote disclosure**: surface a per-source delay badge in the
  UI ("Tencent A股 实时" / "HKEX 延迟15分钟" / "Yahoo 实时").
- **Worker proxy**: `api.wealth-flow.app/api/quotes/:market/:symbols`
  fans out, normalizes, KV-caches 5–30s.

---

## 5. Open questions / TODO

- [ ] Confirm Tencent's HK delayed-quote licensing terms — we may need
      to cite "数据来源: 腾讯财经" in the UI footer.
- [ ] Test Sina mainland endpoint behind a US-egress worker (some Sina
      routes geo-block).
- [ ] Investigate `push2his.eastmoney.com` for K-line history (we'll
      need it for the chart view in round 3+).
