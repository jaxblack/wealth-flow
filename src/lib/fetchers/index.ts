// Stub fetchers — replace with real implementations in round 2.
// All return sample data so UI works out-of-the-box.

export interface BankRate { bank: string; product: string; term: string; rate: number; }
export interface StockQuote { symbol: string; price: number; change: number; changePct: number; ts: number; }
export interface FxRates { base: string; rates: Record<string, number>; asOf: string; }

// TODO: GET PBoC LPR + each bank's rate page; cache 24h.
export async function fetchBankRates(): Promise<BankRate[]> {
  return [];
}

// TODO: A股 https://hq.sinajs.cn/list=...  (need server-side proxy for Referer)
// TODO: HK/US https://query1.finance.yahoo.com/v8/finance/chart/<symbol>
export async function fetchStockQuotes(_symbols: string[]): Promise<StockQuote[]> {
  return [];
}

// TODO: https://api.exchangerate.host/latest?base=<base>&symbols=USD,HKD,CNY,EUR,JPY,GBP
export async function fetchFxRates(base = 'CNY'): Promise<FxRates> {
  return { base, rates: {}, asOf: new Date().toISOString() };
}
