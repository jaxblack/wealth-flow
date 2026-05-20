# wealth-flow inventory

## Repo metadata
{"createdAt":"2026-05-13T02:10:05Z","defaultBranchRef":{"name":"main"},"description":"AI-driven personal wealth dashboard: local assets + live bank rates / stocks / FX / transfer fees","languages":[{"size":370,"node":{"name":"HTML"}},{"size":247,"node":{"name":"JavaScript"}},{"size":24898,"node":{"name":"TypeScript"}},{"size":183,"node":{"name":"CSS"}}],"licenseInfo":{"key":"other","name":"Other","nickname":""},"primaryLanguage":{"name":"TypeScript"},"pushedAt":"2026-05-20T09:37:08Z","stargazerCount":0,"visibility":"PUBLIC"}

## Open issues

## Open PRs

## File tree (first 300)
./.gitignore
./LICENSE
./README.md
./docs/architecture.md
./docs/data-sources.md
./docs/data-sources/bank-rates.md
./docs/data-sources/fx-and-fees.md
./docs/data-sources/stocks.md
./index.html
./package.json
./postcss.config.js
./src/App.tsx
./src/data/bank-rates-snapshot.ts
./src/data/transfer-fees-snapshot.ts
./src/db/schema.ts
./src/index.css
./src/lib/fetchers/index.ts
./src/main.tsx
./src/modules/assets/AssetsPanel.tsx
./src/modules/bankRates/BankRatesPanel.tsx
./src/modules/fx/FXPanel.tsx
./src/modules/stocks/StocksPanel.tsx
./src/modules/transferFees/TransferFeesPanel.tsx
./tailwind.config.js
./tsconfig.json
./tsconfig.node.json
./vite.config.ts

## Top-level dirs file-count
docs/: 5
src/: 12

## README
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

---ZH---

## Package manifests

### package.json
{
  "name": "wealth-flow",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "dexie": "^4.0.8",
    "dexie-react-hooks": "^1.1.7",
    "swr": "^2.2.5",
    "recharts": "^2.12.7",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vitest": "^2.0.5",
    "@vitest/ui": "^2.0.5",
    "jsdom": "^24.1.1"
  }
}

## Recent commits
fa445aa docs+data(stocks/fx/fees): research + curated transfer-fees snapshot
02617e5 docs+data(bank-rates): research notes + curated snapshot for 6 CN banks
387fbfd feat(init): scaffold wealth-flow web app — Vite+React+TS+Tailwind+Dexie + 5 module stubs

## Bank/HK/HSBC/BOCHK/SCB/中银/汇丰/渣打 references
./docs/data-sources/fx-and-fees.md
./docs/data-sources/stocks.md
./src/modules/transferFees/TransferFeesPanel.tsx
./src/data/transfer-fees-snapshot.ts

## Integration code candidates
./src/db/schema.ts
./src/modules/assets/AssetsPanel.tsx

## Architecture summary

- **Stack:** TypeScript + Vite 5 + React 18 + Tailwind 3 + Dexie 4 (IndexedDB) + SWR 2 + Vitest 2. Per `package.json:1-37`.
- **Topology:** browser-only SPA. No backend, no auth, no server. Per `docs/architecture.md` (Principle #1).
- **Domain model:** single source `src/db/schema.ts:1-35` — `Asset` (kind: cash/deposit/stock/etc, currency: CNY/HKD/USD/...) + `Pref` table via Dexie.
- **Module pattern:** `src/modules/<feature>/<Feature>Panel.tsx` — 5 stubs exist: assets (61 LOC), bankRates (42), stocks (43), fx (22), transferFees (34); all wired into `src/App.tsx:1-42` as a Card grid.
- **Data fetching:** SWR + central fetcher file `src/lib/fetchers/index.ts:1-22` (currently empty-array stubs).
- **Curated static data:** `src/data/<topic>-snapshot.ts` per topic (e.g. `bank-rates-snapshot.ts`, `transfer-fees-snapshot.ts`) with citation links. Pattern established by commits `02617e5` + `fa445aa`.
- **No existing HK-bank code.** Grep for hsbc/bochk/渣打/汇丰/中银/hong-kong returns ZERO hits in source — only 4 weak references in docs/data-sources covering general FX + domestic-CN bank rates.
- **Integration entry points (where bank code naturally slots in):**
  - New module: `src/modules/banks/` (6th panel, parallels existing 5 modules)
  - Provider layer (does not yet exist): suggest `src/integrations/banks/{bochk,hsbc_hk,scb_hk}/` per sibling SCAFFOLD-DESIGN.md
  - Schema migration: `src/db/schema.ts` Dexie `version(2)` to add `bankConnection` + `bankAccount` + `bankTxn` tables
  - Secrets seam: none exists; greenfield (no `.env.example`, no `crypto.subtle` usage anywhere in repo)
- **Tests:** vitest configured but **zero test files** in tree (`grep -RIln '\.test\.' src/` empty). Test harness exists, no tests written yet.
- **Recent activity:** 3 commits total — `387fbfd` scaffold init, `02617e5` bank-rates research+snapshot, `fa445aa` stocks/fx/fees research+snapshot. Very early-stage repo.
- **Repo state:** 27 tracked files (excluding .git/node_modules), 0 open issues, 0 open PRs.
