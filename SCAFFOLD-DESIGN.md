# SCAFFOLD-DESIGN.md — HK Bank Integration Layer

_Design proposal for plan `56fdfa04-1246-4e69-8b98-917109b8b41f`, subtask `design-integration-scaffold`. Read-only, code-shape only — no production files touched. Round-3 leader translates into implementation subtasks._

User intent: "希望支持中银香港、汇丰香港、渣打香港的APP。也可以接入他们的API" → BOCHK / HSBC HK / SCB HK, app-first, API-also.

---

## Detected stack

| Aspect | Value | Evidence |
| --- | --- | --- |
| Language | **TypeScript** (ESM, `"type": "module"`) | `package.json` |
| Build | **Vite 5** + `tsc -b` | `scripts.build` |
| UI | **React 18** + Tailwind v3 | deps + `src/App.tsx` |
| Storage | **Dexie 4** (IndexedDB), local-first | `src/db/schema.ts` |
| Data fetching | **SWR 2** + bare async fetchers | `src/lib/fetchers/index.ts` |
| Tests | **Vitest 2** + jsdom | `scripts.test`, devDeps |
| Lint | **ESLint** (`.eslintrc` not committed yet — `lint` script exists) | `scripts.lint` |
| Backend | **NONE** — pure SPA, no server, no account | `docs/architecture.md` Principle #1 |

**Existing folder convention** (verified from `git log` + tree):
- Feature panels: `src/modules/<feature>/<Feature>Panel.tsx` — one self-contained directory per domain (5 exist: `assets`, `bankRates`, `stocks`, `fx`, `transferFees`).
- Pure data fetchers: `src/lib/fetchers/index.ts` — currently one flat file with `fetchBankRates`, `fetchStockQuotes`, `fetchFxRates` stubs.
- Curated fallback data: `src/data/<topic>-snapshot.ts` — point-in-time JSON-as-TS with `sourceUrl` per row (see `src/data/bank-rates-snapshot.ts` for the convention).
- Schema: single `src/db/schema.ts` with `Asset`, `Pref` tables.

Two commits-as-examples for "where new feature code already lives":
- `02617e5 docs+data(bank-rates)` added `src/data/bank-rates-snapshot.ts` + `docs/data-sources/bank-rates.md` — established the snapshot+docs pattern.
- `387fbfd feat(init)` set up `src/modules/<feature>/` — established the per-feature module pattern.

---

## Proposed integration layer

```
src/
├── db/
│   └── schema.ts                          # ADD: bankConnection + bankAccount + bankTxn tables (v2 migration)
├── integrations/
│   ├── banks/
│   │   ├── types.ts                       # BankProvider interface + shared types (Account, Txn, etc.)
│   │   ├── registry.ts                    # PROVIDERS: Record<BankId, BankProvider>
│   │   ├── bochk/
│   │   │   ├── config.ts                  # BOCHK-specific config schema (zod)
│   │   │   ├── provider.ts                # implements BankProvider — Phase-I product info only in v1
│   │   │   └── provider.test.ts
│   │   ├── hsbc_hk/
│   │   │   ├── config.ts
│   │   │   ├── provider.ts                # implements BankProvider — HSBC HK developer.hsbc.com.hk
│   │   │   └── provider.test.ts
│   │   └── scb_hk/
│   │       ├── config.ts
│   │       ├── provider.ts
│   │       └── provider.test.ts
│   ├── aggregators/
│   │   └── finverse/                      # OPTIONAL v2 — only HK-coverage aggregator (Salt Edge=0, Plaid=none)
│   │       ├── config.ts
│   │       └── provider.ts                # implements BankProvider, fans out to multiple banks under one creds set
│   ├── importers/
│   │   └── statement/
│   │       ├── types.ts                   # StatementImporter interface
│   │       ├── csv.ts                     # generic CSV mapper (column-mapping UI)
│   │       ├── ofx.ts                     # OFX 2.x parser (rare in HK retail — bonus)
│   │       ├── pdf.ts                     # PDF table-extract via pdfjs-dist + heuristics, per-bank templates
│   │       └── normalizer.ts              # → BankTxn shape, dedupe by (date, amount, ref)
│   └── secrets/
│       └── vault.ts                       # creds adapter — IndexedDB-encrypted in browser-only mode (see §Secrets)
└── modules/
    └── banks/                             # NEW module (sixth panel, slots into App.tsx grid)
        ├── BanksPanel.tsx                 # list connected banks, "+ connect" wizard, "import statement" button
        ├── ConnectBankWizard.tsx          # provider-selection + creds-entry + OAuth callback handler
        └── StatementImportDialog.tsx      # file-picker → preview parsed rows → confirm → write to bankTxn
```

**Why this shape**:
- Mirrors existing `src/modules/<feature>/` convention (`modules/banks/` is feature #6).
- Mirrors existing `src/lib/fetchers/` separation-of-concerns (fetcher = pure data, panel = React) — but moves to `src/integrations/` because integrations have *more* than fetching (config, secrets, OAuth callbacks, parsers).
- Per-bank subdirs (not one giant `banks.ts`) because each of the three banks has distinct auth (HSBC OAuth2 via developer.hsbc.com.hk vs BOCHK's HKMA-onboarded TSP flow vs SCB's own) and v1's research subtask flagged that 2 of 3 may need TSP-registration to access account data — provider boundaries map to legal boundaries.
- `aggregators/` parallel to `banks/` because Finverse implements the same `BankProvider` interface but represents N banks via one credential — same interface, different cardinality.
- `importers/statement/` is the **safe v1 path** per round-1 research (PDF e-statement is ToS-safe and works without any bank API onboarding).

---

## `BankProvider` interface

```typescript
// src/integrations/banks/types.ts

/** Stable identifier for a provider — used as IndexedDB foreign key. */
export type BankId = 'bochk' | 'hsbc_hk' | 'scb_hk' | 'finverse';

export type AuthFlow = 'oauth2_code' | 'oauth2_client_credentials' | 'api_key' | 'none';

/** Capability flags — UI greys out unavailable actions per provider. */
export interface ProviderCapabilities {
  productInfo: boolean;        // Phase-I public data (rates, branches, FX, fees) — no auth
  accountList: boolean;        // Phase-III — requires TSP onboarding for indie
  balances: boolean;
  transactions: boolean;
  statementImport: boolean;    // always true — fallback for every provider
}

export interface ProductInfo {
  kind: 'deposit_rate' | 'fx_rate' | 'fee' | 'branch' | 'atm';
  bank: BankId;
  /** Free-form payload; UI handles per-kind rendering. */
  payload: Record<string, unknown>;
  asOf: string;                // ISO8601
  sourceUrl: string;           // citation, matches src/data/*-snapshot.ts convention
}

export interface BankAccount {
  providerAccountId: string;   // opaque, per-provider
  bank: BankId;
  nickname: string;
  currency: import('../../db/schema').Currency;
  type: 'savings' | 'current' | 'time_deposit' | 'credit_card' | 'investment' | 'other';
  iban?: string;
  maskedNumber?: string;       // e.g. "****1234"
}

export interface BankBalance {
  providerAccountId: string;
  available: number;
  ledger: number;
  asOf: string;
}

export interface BankTxn {
  providerAccountId: string;
  providerTxnId: string;       // for dedupe; importer synthesises if missing (hash of date+amount+desc)
  postedAt: string;            // ISO8601
  amount: number;              // signed; negative = debit
  currency: import('../../db/schema').Currency;
  description: string;
  category?: string;           // best-effort, may be undefined
  counterparty?: string;
  raw?: unknown;               // original payload for debugging
}

/** Token blob — provider-opaque, persisted via `secrets/vault.ts`. */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;          // epoch ms
  scope?: string;
}

export interface BankProvider {
  /** Stable id — matches BankId union. */
  readonly id: BankId;
  /** Display name shown in the connect wizard. */
  readonly displayName: string;
  /** Tells the UI what to enable/disable for this provider. */
  readonly capabilities: ProviderCapabilities;
  /** Tells the connect wizard which credential form to render. */
  readonly authFlow: AuthFlow;

  /** Phase-I public data — no auth. SHOULD work for all 3 banks in v1. */
  fetchProductInfo(kinds: ProductInfo['kind'][]): Promise<ProductInfo[]>;

  /** Step 1 of OAuth — returns redirect URL. Throws if authFlow !== oauth2_*. */
  beginAuth(callbackUrl: string, state: string): Promise<{ redirectUrl: string }>;

  /** Step 2 of OAuth — exchanges code for tokens. */
  completeAuth(params: { code: string; state: string; callbackUrl: string }): Promise<AuthToken>;

  /** Refresh expired token; returns new AuthToken. */
  refresh(token: AuthToken): Promise<AuthToken>;

  /** List the customer's accounts. Requires capabilities.accountList. */
  listAccounts(token: AuthToken): Promise<BankAccount[]>;

  /** Balance snapshot for one account. Requires capabilities.balances. */
  getBalance(token: AuthToken, providerAccountId: string): Promise<BankBalance>;

  /** Transactions in a date range. Requires capabilities.transactions. */
  listTransactions(
    token: AuthToken,
    providerAccountId: string,
    range: { from: string; to: string },
  ): Promise<BankTxn[]>;
}
```

Round-3 implementers fill in one `provider.ts` per bank. v1 acceptance bar: `fetchProductInfo` works against HKMA Phase-I endpoints; everything else can throw `NotImplementedError` with a clear message ("requires TSP onboarding — track at #issue-N").

---

## Per-bank config schema

Each `<bank>/config.ts` exports a `zod`-validated config object (add `zod` to deps in round 3 — currently absent, but it's the idiomatic TS validator and pairs cleanly with the existing TypeScript strictness).

```typescript
// src/integrations/banks/hsbc_hk/config.ts
import { z } from 'zod';

export const HsbcHkConfig = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1).optional(),       // optional: only needed for confidential client
  baseUrl: z.string().url().default('https://api.hsbc.com.hk/open-banking/v3.1'),
  sandboxBaseUrl: z.string().url().default('https://sandbox.hsbc.com.hk/open-banking/v3.1'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  scopes: z.array(z.string()).default(['accounts', 'transactions']),
  /** Optional mTLS cert paths — server-side mode only; ignored in browser-only mode. */
  certPath: z.string().optional(),
  keyPath: z.string().optional(),
});
export type HsbcHkConfigT = z.infer<typeof HsbcHkConfig>;
```

Loaded at app boot in a new `src/integrations/banks/registry.ts`:

```typescript
// src/integrations/banks/registry.ts
import type { BankProvider, BankId } from './types';
import { HsbcHkProvider } from './hsbc_hk/provider';
import { BochkProvider } from './bochk/provider';
import { ScbHkProvider } from './scb_hk/provider';

export const PROVIDERS: Record<BankId, BankProvider> = {
  hsbc_hk: new HsbcHkProvider(loadConfig('hsbc_hk')),
  bochk:   new BochkProvider(loadConfig('bochk')),
  scb_hk:  new ScbHkProvider(loadConfig('scb_hk')),
  finverse: new FinverseProvider(loadConfig('finverse')),  // v2
};

/** Config source priority: Vite import.meta.env → IndexedDB prefs → defaults. */
function loadConfig(id: BankId): unknown { /* … */ }
```

**Config-source priority** (matches existing pattern — `prefs` table already exists in `src/db/schema.ts`):
1. `import.meta.env.VITE_HSBC_HK_CLIENT_ID` etc — for dev convenience, lives in `.env.local` (add `.env.example` in round 3).
2. `db.prefs` row keyed `integration.<bankId>.config` — user-edited in a Settings panel.
3. Hard-coded defaults from the zod schema (sandbox URLs etc).

---

## Statement importer interface

```typescript
// src/integrations/importers/statement/types.ts
import type { BankId, BankTxn } from '../../banks/types';

export interface StatementImporter {
  readonly id: 'csv' | 'ofx' | 'pdf';
  /** Accepted MIME types — drives the Files-app share-target filter. */
  readonly mimeTypes: readonly string[];
  /** True if this importer has a per-bank template for `bank`. */
  supports(bank: BankId): boolean;
  /** Parse + normalise; throws ImporterError with row-level context on failure. */
  parse(file: File, hints: { bank?: BankId; targetAccountId?: string }): Promise<BankTxn[]>;
}
```

UI integration: a new `src/modules/banks/StatementImportDialog.tsx` accepts a file drop → dispatches to the right importer → shows a preview table → on confirm writes to a new Dexie `bankTxn` table.

**v1 priority**: ship `pdf.ts` first (per round-1 research, PDF is the only format all three banks actually expose to retail). Templates: HSBC HK Personal Integrated Account statement layout, BOCHK Multi-Currency Savings layout, SCB Integrated Deposit Account layout (three layouts cover ~all retail accounts at these banks). CSV/OFX as bonus.

---

## Secrets handling

**This is the single biggest design constraint** because `docs/architecture.md` says "No server, no account" and the existing app stores everything in IndexedDB. That means:

| Surface | Where credentials live | Risk |
| --- | --- | --- |
| Browser-only mode (current) | `db.prefs['integration.<bank>.token']` — **encrypted at rest** via WebCrypto (AES-GCM, key derived from user-set passphrase via PBKDF2) | Lost if user clears browser data. Acceptable for a personal local-first app. |
| Future server mode | `process.env` + Vault/SOPS | Out of scope for v1. |

Proposed `src/integrations/secrets/vault.ts`:

```typescript
// src/integrations/secrets/vault.ts
import { db } from '../../db/schema';

export interface Vault {
  unlock(passphrase: string): Promise<void>;
  isUnlocked(): boolean;
  put(key: string, plaintext: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

export class WebCryptoVault implements Vault {
  // PBKDF2(passphrase, salt-from-prefs, 600_000) → AES-GCM key; encrypt+base64 → prefs
  // …
}
```

**No existing secret-handling pattern in the repo** — `git grep -i 'secret\|password\|crypto\.subtle'` returns zero hits. This is greenfield. The above pattern is industry-standard for offline-first PWAs (analogous to Bitwarden's offline cache).

**OAuth callback handling**: needs a redirect URL the bank can hit. Since this is a SPA, use the SPA's own URL with a `#/integrations/callback` hash route — both HSBC OBIE OAuth and most aggregators accept fragment-based redirects. No server required.

---

## Round-3 work breakdown (4-6 parallel subtasks)

| # | Name | Scope (files to add) | Acceptance criteria | Follower |
| --- | --- | --- | --- | --- |
| **R3-1** | `scaffold-integration-skeleton` | `src/integrations/banks/types.ts`, `src/integrations/banks/registry.ts`, `src/integrations/banks/{bochk,hsbc_hk,scb_hk}/{config.ts,provider.ts}` — providers throw `NotImplementedError` except `id`/`displayName`/`capabilities` + a `fetchProductInfo` returning hardcoded snapshot from `src/data/` | `npm run build` clean, `npm run test` passes 1 unit test asserting `PROVIDERS.bochk.id === 'bochk'` | **hermes** (single-PR scaffold, no cross-cutting) |
| **R3-2** | `schema-migration-v2` | Edit `src/db/schema.ts` — add Dexie `version(2)` with `bankConnections`, `bankAccounts`, `bankTxns` tables; preserve `assets`+`prefs` from v1; add migration test | Vitest: open db with v1 data → upgrade → v1 assets readable + new tables empty | **hermes** (single-file, isolated) |
| **R3-3** | `webcrypto-vault` | `src/integrations/secrets/vault.ts` + `vault.test.ts` (round-trip put/get with passphrase; ensure ciphertext ≠ plaintext) | 3 vitest cases pass; `npm run lint` clean | **hermes** |
| **R3-4** | `pdf-statement-importer-hsbc` | `src/integrations/importers/statement/types.ts`, `pdf.ts`, `normalizer.ts` + 1 HSBC HK PDF fixture under `tests/fixtures/` + parse test asserting ≥1 BankTxn produced | Vitest parses fixture → returns array of `BankTxn` with valid amounts; dedupe key stable | **openclaw** (needs PDF-table heuristic judgement; fixture-driven iteration) |
| **R3-5** | `banks-panel-ui` | `src/modules/banks/BanksPanel.tsx`, `ConnectBankWizard.tsx`, `StatementImportDialog.tsx` + slot into `src/App.tsx` Card grid as 6th panel; render `PROVIDERS` from registry; "Connect" disabled in v1 with tooltip "requires TSP onboarding"; "Import statement" wired to R3-4 | `npm run build` clean; visual smoke (jsdom) renders 4 provider cards | **openclaw** (UI + wiring across files) |
| **R3-6** *(optional)* | `phase1-public-data-bochk` | `src/integrations/banks/bochk/provider.ts::fetchProductInfo` real impl — fetch HKMA Phase-I deposit-rate endpoint, normalise to `ProductInfo[]` | Vitest mocks `fetch`, asserts shape; URL matches HKMA-published format | **hermes** |

R3-1 + R3-2 + R3-3 + R3-4 are **fully independent** (different file trees) → safe to run in parallel.
R3-5 depends on R3-1 (needs `PROVIDERS` symbol) and R3-4 (needs importer) → dispatch after R3-1+R3-4 land, or stub the missing imports.
R3-6 depends on R3-1 → dispatch second wave.

Recommended round-3 wave plan: **wave A = {R3-1, R3-2, R3-3, R3-4} in parallel; wave B = {R3-5, R3-6} after A merges**.

---

## Open questions for round-3 leader

1. **Browser-only vs eventually-server?** Current app has zero backend. Adding HSBC/SCB OAuth in pure browser works for *authorisation* but the access tokens then sit in IndexedDB — `WebCryptoVault` mitigates but doesn't eliminate the XSS-grabs-token risk. If the user's roadmap includes "deploy to my own server later", we should leave a `secrets/serverVault.ts` adapter seam now. **Recommendation**: build WebCryptoVault for v1, leave a `Vault` interface so a server adapter can slot in later.
2. **TSP onboarding willingness?** Phase-III (account info / transactions) endpoints at all three banks require TSP registration with each bank (per HKMA Phase-III framework). This is a multi-week corporate process and almost certainly a no-go for an indie. **Question**: do we ship v1 with *only* Phase-I + statement-import, marking Phase-III as "future"? (Strong recommendation: yes.)
3. **Finverse commercial DD.** Round-1 research flagged Finverse as the only HK aggregator. Pricing is "custom" and their HK bank-list isn't public. Should round-3 include a non-code subtask to email Finverse sales for coverage + pricing confirmation before we build the `aggregators/finverse/` adapter? **Recommendation**: yes — gate R3 wave C on commercial answer.
4. **Asset linkage.** Should imported `BankTxn` records auto-derive entries in the existing `assets` table (e.g. "balance of HSBC current → 1 row in `assets`")? Or stay separate? Affects whether `BanksPanel` is a sibling of `AssetsPanel` or a sub-tab. **Recommendation**: separate tables, derive a *view* in `AssetsPanel` that shows latest balances from connected banks alongside manual entries.
5. **i18n.** All existing UI strings are zh-CN (`AssetsPanel.tsx` shows `名称`, `金额` etc) — round-3 implementers should keep zh-CN as primary. Worth confirming no en switch is needed.
