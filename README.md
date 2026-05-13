# 💰 Wealth Flow

AI-driven personal wealth dashboard. Input your assets locally; flow-monitor the markets that affect them.

## What it shows
- **My Assets** — local-first input (cash, deposits, stocks, funds, crypto, real estate). Stored in IndexedDB via Dexie. Never leaves your browser.
- **Bank Rates** — CN big banks (ICBC / CCB / BoC / ABC / CMB) deposit + LPR loan rates.
- **Stocks** — A-shares / HK / US live quotes for your watchlist.
- **FX** — major currency pairs vs. CNY.
- **Transfer Fees** — CN↔HK cross-border wire fee reference.

## Run
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build
npm run test         # vitest
```

## Architecture
- **Vite + React 18 + TypeScript + Tailwind v3**
- **Dexie** (IndexedDB) for local asset storage — see `src/db/schema.ts`
- **SWR** for revalidating live data (stocks / FX / rates)
- **Module layout** under `src/modules/<feature>/<Feature>Panel.tsx`
- **Fetchers** centralized in `src/lib/fetchers/index.ts`

See `docs/architecture.md` and `docs/data-sources.md` for details.

## License
MIT © 2026 jaxblack
