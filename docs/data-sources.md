# Data Sources (planned)

> Filled by round-2 module subtasks.

## Bank rates (CN)
- PBoC LPR: http://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/index.html
- ICBC / CCB / BoC / ABC / CMB official rate pages — scrape weekly, cache 24h.

## Bank rates (HK)
- HKAB composite interest rate: https://www.hkab.org.hk/

## Stocks
- A股: `https://hq.sinajs.cn/list=sh600519,sz000001` (Referer: `https://finance.sina.com.cn`, requires server-side proxy in browser).
- HK / US: `https://query1.finance.yahoo.com/v8/finance/chart/<symbol>` (CORS-friendly).

## FX
- https://api.exchangerate.host/latest?base=CNY  (free, no key)
- Backup: https://open.er-api.com/v6/latest/CNY

## Transfer fees
- Static reference; updated quarterly from each bank's tariff PDF.
