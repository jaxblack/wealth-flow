/**
 * Bank-rates snapshot — fallback data for `src/modules/bankRates/`.
 *
 * ⚠️ POINT-IN-TIME. These numbers are accurate as of the asOf date below
 * but Chinese bank rates move on industry-wide cuts (typically 2–4×/yr).
 * Refresh weekly via `scripts/refresh-snapshot.ts` (round 2+).
 *
 * Coverage: 6 big CN banks × {demand, 1Y, 2Y, 3Y, 5Y fixed deposit}
 *           + PBoC LPR 1Y / 5Y benchmark.
 *
 * Numbers reflect the post-2024-10 industry cut (most big banks aligned
 * within a week of each other). Joint-stock peers like CMB usually
 * mirror the big-4 within ±1bp on demand and ±5bp on long-term fixed.
 *
 * Sources cited per row in `sourceUrl`. All `source: 'snapshot'` so
 * the UI can render a "stale, refreshed YYYY-MM-DD" badge.
 */

export type BankCode = 'icbc' | 'ccb' | 'boc' | 'abc' | 'bocom' | 'cmb';
export type RateType = 'demand' | 'fixed' | 'lpr';
export type Term = 'demand' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y';

export interface BankRateSnapshot {
  bank: BankCode | 'pboc';
  bankNameZh: string;
  type: RateType;
  term: Term;
  rate: number;        // annualized %, e.g. 1.10 means 1.10%
  asOf: string;        // ISO date the rate became effective
  source: 'snapshot';
  sourceUrl: string;
}

const ASOF_BIG4 = '2024-10-18';   // last industry-wide deposit cut
const ASOF_LPR  = '2025-10-20';   // LPR is announced 20th of each month

export const BANK_NAMES: Record<BankCode | 'pboc', string> = {
  icbc:  '工商银行',
  ccb:   '建设银行',
  boc:   '中国银行',
  abc:   '农业银行',
  bocom: '交通银行',
  cmb:   '招商银行',
  pboc:  '中国人民银行 (LPR)',
};

// Per-bank rate URLs (also used by the live fetcher in round 2).
export const BANK_SOURCE_URLS: Record<BankCode, string> = {
  icbc:  'https://www.icbc.com.cn/icbc/%E4%B8%AA%E4%BA%BA%E9%87%91%E8%9E%8D/%E5%AD%98%E6%AC%BE%E6%9C%8D%E5%8A%A1/%E5%85%AC%E7%A4%BA%E5%AD%98%E6%AC%BE%E5%88%A9%E7%8E%87/',
  ccb:   'http://www.ccb.com/cn/personal/rate/index.html',
  boc:   'https://www.bankofchina.com/fimarkets/lilv/fd31/',
  abc:   'https://www.abchina.com/cn/AboutABC/nhgg/lcfslv/',
  bocom: 'https://www.bankcomm.com/BankCommSite/shtml/jyjr/cn/7244/list.shtml',
  cmb:   'http://www.cmbchina.com/CmbWebPubInfo/PersonalDeposit.aspx?chnl=gryhdkll',
};

// ---- Big-4 + BoCom (state-owned) — identical post-cut schedule ----
const BIG4_RATES: Array<{ term: Term; type: RateType; rate: number }> = [
  { term: 'demand', type: 'demand', rate: 0.10 },
  { term: '3M',     type: 'fixed',  rate: 0.80 },
  { term: '6M',     type: 'fixed',  rate: 1.00 },
  { term: '1Y',     type: 'fixed',  rate: 1.10 },
  { term: '2Y',     type: 'fixed',  rate: 1.20 },
  { term: '3Y',     type: 'fixed',  rate: 1.50 },
  { term: '5Y',     type: 'fixed',  rate: 1.55 },
];

// CMB tends to price 1–5bp above the big-4 to attract retail deposits.
const CMB_RATES: Array<{ term: Term; type: RateType; rate: number }> = [
  { term: 'demand', type: 'demand', rate: 0.15 },
  { term: '3M',     type: 'fixed',  rate: 0.80 },
  { term: '6M',     type: 'fixed',  rate: 1.00 },
  { term: '1Y',     type: 'fixed',  rate: 1.10 },
  { term: '2Y',     type: 'fixed',  rate: 1.20 },
  { term: '3Y',     type: 'fixed',  rate: 1.55 },
  { term: '5Y',     type: 'fixed',  rate: 1.60 },
];

function rowsFor(bank: BankCode, table: typeof BIG4_RATES): BankRateSnapshot[] {
  return table.map((r) => ({
    bank,
    bankNameZh: BANK_NAMES[bank],
    type: r.type,
    term: r.term,
    rate: r.rate,
    asOf: ASOF_BIG4,
    source: 'snapshot',
    sourceUrl: BANK_SOURCE_URLS[bank],
  }));
}

export const BANK_RATES_SNAPSHOT: BankRateSnapshot[] = [
  ...rowsFor('icbc',  BIG4_RATES),
  ...rowsFor('ccb',   BIG4_RATES),
  ...rowsFor('boc',   BIG4_RATES),
  ...rowsFor('abc',   BIG4_RATES),
  ...rowsFor('bocom', BIG4_RATES),
  ...rowsFor('cmb',   CMB_RATES),

  // ---- PBoC LPR ----
  {
    bank: 'pboc', bankNameZh: BANK_NAMES.pboc,
    type: 'lpr', term: '1Y', rate: 3.10, asOf: ASOF_LPR, source: 'snapshot',
    sourceUrl: 'https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/3876551/index.html',
  },
  {
    bank: 'pboc', bankNameZh: BANK_NAMES.pboc,
    type: 'lpr', term: '5Y', rate: 3.60, asOf: ASOF_LPR, source: 'snapshot',
    sourceUrl: 'https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/3876551/index.html',
  },
];

/** Look up a single rate; returns undefined if not present. */
export function snapshotRate(
  bank: BankCode | 'pboc',
  term: Term,
  type: RateType = 'fixed',
): BankRateSnapshot | undefined {
  return BANK_RATES_SNAPSHOT.find(
    (r) => r.bank === bank && r.term === term && r.type === type,
  );
}
