/**
 * BOCHK (Bank of China Hong Kong) FX rate-board fetcher.
 *
 * Background — see `BOCHK-API-RESEARCH.md` at the repo root for full citations.
 * Summary:
 *   - Portal     : https://api.bochk.com/
 *   - Sandbox    : https://apisandbox.bochk.com/
 *   - Token URL  : https://apisandbox.bochk.com/auth/oauth/v2/token
 *                  (POST, OAuth2 client_credentials, no mTLS for Phase-I product info)
 *   - Maintenance: 02:30–07:00 HKT daily — sandbox + gateway unavailable
 *
 * IMPORTANT: the *exact* FX-rate-board endpoint path is gated behind the BOCHK
 * developer-portal login (the public `API_index.html` only shows one tile). The
 * concrete path therefore has to be supplied by the caller (developer pastes it
 * in via the prefs UI). Defaults below are the documented hosts + a *probable*
 * path shape (`/open/api/v1/fx/exchange-rates`) that follows BOCHK's own naming
 * for the OAuth namespace; callers MUST override `endpointPath` with the value
 * they read from the post-login API catalogue.
 *
 * Browser-side OAuth client_credentials is acceptable for **sandbox-only** dev
 * (developer's own sandbox secret, paste-in via prefs). Production secrets must
 * NOT ship in a browser bundle — the UI is required to display a "sandbox /
 * read-only / your secrets stay in this browser" disclosure when this fetcher
 * is wired up.
 */

export interface BochkFxRate {
  /** ISO-4217 currency code, e.g. "USD". */
  currency: string;
  /** Bank-buys TT (telegraphic-transfer) rate, HKD per 1 unit. `null` if not quoted. */
  buyTT: number | null;
  /** Bank-sells TT rate, HKD per 1 unit. `null` if not quoted. */
  sellTT: number | null;
  /** Bank-buys cash rate, HKD per 1 unit. `null` if not quoted. */
  buyCash: number | null;
  /** Bank-sells cash rate, HKD per 1 unit. `null` if not quoted. */
  sellCash: number | null;
  /** ISO-8601 timestamp from the BOCHK response (or fetch time if absent). */
  timestamp: string;
}

export interface BochkOAuthCreds {
  clientId: string;
  clientSecret: string;
}

export interface BochkFetchOptions {
  /** OAuth client credentials. Required to call BOCHK; sandbox values are fine for dev. */
  creds: BochkOAuthCreds;
  /** Override base host. Default: sandbox. */
  baseUrl?: string;
  /** Override token URL. Default: `${baseUrl}/auth/oauth/v2/token`. */
  tokenUrl?: string;
  /** Override the FX endpoint path. STRONGLY RECOMMENDED — see file header. */
  endpointPath?: string;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Inject a custom `fetch` (used by tests). */
  fetchImpl?: typeof fetch;
}

export const BOCHK_SANDBOX_BASE = 'https://apisandbox.bochk.com';
export const BOCHK_PRODUCTION_BASE = 'https://api.bochk.com';
export const BOCHK_DEFAULT_FX_PATH = '/open/api/v1/fx/exchange-rates'; // best-guess; override in production

/**
 * Step 1 of 2: obtain an OAuth2 access token via client_credentials.
 * BOCHK token endpoint is documented in Partnerwithus.html (see research doc).
 */
export async function fetchBochkAccessToken(
  opts: BochkFetchOptions,
): Promise<{ accessToken: string; expiresIn: number }> {
  const baseUrl = opts.baseUrl ?? BOCHK_SANDBOX_BASE;
  const tokenUrl = opts.tokenUrl ?? `${baseUrl}/auth/oauth/v2/token`;
  const fetchImpl = opts.fetchImpl ?? fetch;

  // Browser-only project (tsconfig lib = DOM); `btoa` is globally available.
  const basic = btoa(`${opts.creds.clientId}:${opts.creds.clientSecret}`);

  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const res = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`BOCHK token request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as unknown;
  if (
    !json ||
    typeof json !== 'object' ||
    typeof (json as { access_token?: unknown }).access_token !== 'string'
  ) {
    throw new Error('BOCHK token response missing access_token');
  }
  const accessToken = (json as { access_token: string }).access_token;
  const expiresInRaw = (json as { expires_in?: unknown }).expires_in;
  const expiresIn = typeof expiresInRaw === 'number' ? expiresInRaw : 0;
  return { accessToken, expiresIn };
}

/**
 * Step 2 of 2: fetch the FX rate board using a bearer token.
 * Returns a normalised `BochkFxRate[]`. Returns `[]` on shape we don't recognise
 * (defensive — prefer empty board to crash).
 */
export async function fetchBochkFxRates(opts: BochkFetchOptions): Promise<BochkFxRate[]> {
  const baseUrl = opts.baseUrl ?? BOCHK_SANDBOX_BASE;
  const path = opts.endpointPath ?? BOCHK_DEFAULT_FX_PATH;
  const fetchImpl = opts.fetchImpl ?? fetch;

  const { accessToken } = await fetchBochkAccessToken(opts);
  const url = `${baseUrl}${path}`;

  const res = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`BOCHK FX fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as unknown;
  return parseBochkFxResponse(json);
}

/**
 * Parse a BOCHK FX response. The exact response shape is undocumented publicly
 * (gated behind portal login). This parser accepts the two most common shapes
 * banks publish under HKMA Phase I:
 *
 *   1. `{ "result": [{ "currency": "USD", "buyTT": 7.79, "sellTT": 7.83, ... }, ...], "asOf": "..." }`
 *   2. `[{ "ccy": "USD", "buy_tt": "7.79", "sell_tt": "7.83", ... }, ...]`
 *
 * Anything else returns `[]`. When the real shape is observed, this fn should
 * be extended (and the test in bochk-fx.test.ts updated).
 */
export function parseBochkFxResponse(raw: unknown): BochkFxRate[] {
  const ts = new Date().toISOString();
  let arr: unknown = null;
  let asOf: string | undefined;

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.result)) arr = obj.result;
    else if (Array.isArray(obj.data)) arr = obj.data;
    else if (Array.isArray(obj.rates)) arr = obj.rates;
    if (typeof obj.asOf === 'string') asOf = obj.asOf;
    else if (typeof obj.timestamp === 'string') asOf = obj.timestamp;
  }
  if (!Array.isArray(arr)) return [];

  const out: BochkFxRate[] = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const currency = pickStr(r, ['currency', 'ccy', 'currency_code', 'currencyCode']);
    if (!currency) continue;
    out.push({
      currency: currency.toUpperCase(),
      buyTT: pickNum(r, ['buyTT', 'buy_tt', 'buyTt', 'tt_buy']),
      sellTT: pickNum(r, ['sellTT', 'sell_tt', 'sellTt', 'tt_sell']),
      buyCash: pickNum(r, ['buyCash', 'buy_cash', 'cash_buy', 'buyNotes']),
      sellCash: pickNum(r, ['sellCash', 'sell_cash', 'cash_sell', 'sellNotes']),
      timestamp: asOf ?? pickStr(r, ['asOf', 'timestamp', 'updatedAt']) ?? ts,
    });
  }
  return out;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim().length > 0) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
