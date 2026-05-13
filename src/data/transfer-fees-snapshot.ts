/**
 * Cross-border transfer-fees snapshot — fallback / primary data for
 * `src/modules/transferFees/`.
 *
 * ⚠️ POINT-IN-TIME. Bank tariffs change ~quarterly. Refresh by:
 *   1. Hitting each bank's posted tariff PDF/page (sourceUrl below).
 *   2. Updating the matching row, bumping `asOf`.
 *   3. PR review (numbers are user-visible cost figures — be careful).
 *
 * Coverage: 5 banks × {HK→CN, CN→HK} = 10 rows.
 *   - bochk    — Bank of China (Hong Kong)
 *   - icbcasia — ICBC (Asia)
 *   - hsbchk   — HSBC Hong Kong
 *   - hangseng — Hang Seng Bank
 *   - wlb      — CMB Wing Lung Bank (招商永隆)
 *
 * Notes on shape:
 *   - `fixedFee` is the bank's TT commission, in `currency`.
 *   - `cableFee` is the SWIFT message charge, in `currency`.
 *   - `percentFee` is 0 for flat-fee tariffs (most HK banks); non-zero
 *     for Mainland CN→HK transfers which use 0.05–0.1% bands.
 *   - `minFee` / `maxFee` apply only when `percentFee > 0`.
 *   - `correspondentDeductUSD` is the typical agent-bank deduction
 *     taken from the beneficiary side unless the sender pays `OUR`.
 *
 * Sources are the bank's public charges page; cited per row.
 */

export type BankCode =
  | 'bochk'
  | 'icbcasia'
  | 'hsbchk'
  | 'hangseng'
  | 'wlb';

export type TransferDirection = 'HK->CN' | 'CN->HK';
export type FeeCurrency = 'HKD' | 'CNY' | 'USD';

export interface TransferFeeSnapshot {
  bank: BankCode;
  bankNameZh: string;
  direction: TransferDirection;
  fixedFee: number;                  // TT commission, in `currency`
  cableFee: number;                  // SWIFT message fee, in `currency`
  percentFee: number;                // 0 if flat tariff
  minFee: number;                    // applies if percentFee > 0
  maxFee: number;                    // applies if percentFee > 0
  currency: FeeCurrency;
  correspondentDeductUSD: number;    // typical beneficiary-side deduct
  swiftEquivalent: string;           // e.g. "MT103 OUR" / "MT103 SHA"
  asOf: string;                      // ISO date the row was verified
  sourceUrl: string;
}

const ASOF = '2025-12-15';

export const TRANSFER_FEES_SNAPSHOT: TransferFeeSnapshot[] = [
  // ---------------- BOCHK 中銀香港 ----------------
  // https://www.bochk.com/en/aboutus/bankcharges.html — Outward Remittance
  {
    bank: 'bochk', bankNameZh: '中銀香港',
    direction: 'HK->CN',
    fixedFee: 130, cableFee: 75, percentFee: 0, minFee: 0, maxFee: 0,
    currency: 'HKD', correspondentDeductUSD: 18,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://www.bochk.com/en/aboutus/bankcharges.html',
  },
  // BoC Mainland (sister entity) — outward to HK; SAFE-quota gated
  {
    bank: 'bochk', bankNameZh: '中國銀行 (內地→港)',
    direction: 'CN->HK',
    fixedFee: 0, cableFee: 100, percentFee: 0.001, minFee: 50, maxFee: 260,
    currency: 'CNY', correspondentDeductUSD: 0,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://www.boc.cn/pbservice/pb1/200806/t20080626_1601218.html',
  },

  // ---------------- ICBC (Asia) 工銀亞洲 ----------------
  // https://www.icbcasia.com/ICBC/海外分行/工銀亞洲/EN/CustomerService/ServiceCharges/
  {
    bank: 'icbcasia', bankNameZh: '工銀亞洲',
    direction: 'HK->CN',
    fixedFee: 100, cableFee: 80, percentFee: 0, minFee: 0, maxFee: 0,
    currency: 'HKD', correspondentDeductUSD: 15,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://www.icbcasia.com/ICBC/%E6%B5%B7%E5%A4%96%E5%88%86%E8%A1%8C/%E5%B7%A5%E9%8A%80%E4%BA%9E%E6%B4%B2/EN/CustomerService/ServiceCharges/',
  },
  {
    bank: 'icbcasia', bankNameZh: '工商銀行 (內地→港)',
    direction: 'CN->HK',
    fixedFee: 0, cableFee: 80, percentFee: 0.001, minFee: 20, maxFee: 200,
    currency: 'CNY', correspondentDeductUSD: 0,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://mybank.icbc.com.cn/icbc/perbank/index.jsp',
  },

  // ---------------- HSBC HK 滙豐 ----------------
  // https://www.hsbc.com.hk/help/fees/
  {
    bank: 'hsbchk', bankNameZh: '滙豐銀行 (香港)',
    direction: 'HK->CN',
    fixedFee: 220, cableFee: 100, percentFee: 0, minFee: 0, maxFee: 0,
    currency: 'HKD', correspondentDeductUSD: 25,
    swiftEquivalent: 'MT103 OUR', asOf: ASOF,
    sourceUrl: 'https://www.hsbc.com.hk/help/fees/',
  },
  // HSBC China — outbound to HSBC HK (intra-group, slightly cheaper)
  {
    bank: 'hsbchk', bankNameZh: '滙豐銀行 (中國)',
    direction: 'CN->HK',
    fixedFee: 0, cableFee: 150, percentFee: 0.001, minFee: 50, maxFee: 250,
    currency: 'CNY', correspondentDeductUSD: 0,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://www.hsbc.com.cn/help/fees-and-charges/',
  },

  // ---------------- Hang Seng 恒生 ----------------
  // https://www.hangseng.com/en-hk/help/charges/
  {
    bank: 'hangseng', bankNameZh: '恒生銀行',
    direction: 'HK->CN',
    fixedFee: 200, cableFee: 100, percentFee: 0, minFee: 0, maxFee: 0,
    currency: 'HKD', correspondentDeductUSD: 25,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://www.hangseng.com/en-hk/help/charges/',
  },
  // Hang Seng China — outbound to HK (intra-group)
  {
    bank: 'hangseng', bankNameZh: '恒生中國',
    direction: 'CN->HK',
    fixedFee: 0, cableFee: 150, percentFee: 0.001, minFee: 50, maxFee: 260,
    currency: 'CNY', correspondentDeductUSD: 0,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://www.hangseng.com.cn/zh-cn/personal/help/fees/',
  },

  // ---------------- CMB Wing Lung 招商永隆 ----------------
  // https://www.winglungbank.com/en/about-us/bank-charges.html
  {
    bank: 'wlb', bankNameZh: '招商永隆銀行',
    direction: 'HK->CN',
    fixedFee: 110, cableFee: 80, percentFee: 0, minFee: 0, maxFee: 0,
    currency: 'HKD', correspondentDeductUSD: 18,
    swiftEquivalent: 'MT103 SHA', asOf: ASOF,
    sourceUrl: 'https://www.winglungbank.com/en/about-us/bank-charges.html',
  },
  // CMB Mainland — outbound to Wing Lung HK (intra-group, "一卡通跨境")
  {
    bank: 'wlb', bankNameZh: '招商銀行 (內地→永隆)',
    direction: 'CN->HK',
    fixedFee: 0, cableFee: 80, percentFee: 0.0005, minFee: 30, maxFee: 200,
    currency: 'CNY', correspondentDeductUSD: 0,
    swiftEquivalent: 'MT103 SHA (intra-group)', asOf: ASOF,
    sourceUrl: 'https://www.cmbchina.com/personal/yhfwsm/yhfwsm.aspx',
  },
];

/** Quick lookup helper — undefined if no row matches. */
export function lookupTransferFee(
  bank: BankCode,
  direction: TransferDirection,
): TransferFeeSnapshot | undefined {
  return TRANSFER_FEES_SNAPSHOT.find(
    (r) => r.bank === bank && r.direction === direction,
  );
}
