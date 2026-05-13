# Architecture

## Principles
1. **Local-first** — personal data (assets, watchlist, prefs) lives in IndexedDB. No server, no account.
2. **Live market data** — fetched from public APIs via SWR; revalidate on focus + interval.
3. **Modular panels** — each domain (assets, bankRates, stocks, fx, transferFees) is a self-contained module under `src/modules/`.
4. **Currency normalization** — base currency is CNY; FX rates convert all assets to CNY for total view.

## Data flow
```
User input → AssetsPanel → Dexie (wealth-flow-db.assets)
                       ↘ portfolio total ← FXPanel rates
Public APIs → fetchers/* → SWR cache → {Stocks,FX,BankRates}Panel
```

## Modules
- `src/db/schema.ts` — Dexie tables (`assets`, `prefs`)
- `src/lib/fetchers/` — pure data fetchers (no React)
- `src/modules/<feat>/` — UI panels, one per domain

## Future
- Server proxy for A-share Sina endpoint (Referer required).
- Macro indicators panel (CPI, PMI, M2).
- Asset history / time-series chart with recharts.
