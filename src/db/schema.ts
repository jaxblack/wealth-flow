import Dexie, { type Table } from 'dexie';

export type AssetKind = 'cash' | 'deposit' | 'stock' | 'fund' | 'crypto' | 'realestate' | 'other';
export type Currency = 'CNY' | 'HKD' | 'USD' | 'EUR' | 'JPY' | 'GBP';

export interface Asset {
  id?: number;
  name: string;
  kind: AssetKind;
  amount: number;
  currency: Currency;
  account?: string;
  notes?: string;
  updatedAt: number;
}

export interface Pref {
  key: string;
  value: unknown;
}

export class WealthFlowDB extends Dexie {
  assets!: Table<Asset, number>;
  prefs!: Table<Pref, string>;

  constructor() {
    super('wealth-flow-db');
    this.version(1).stores({
      assets: '++id, name, kind, currency, updatedAt',
      prefs: 'key',
    });
  }
}

export const db = new WealthFlowDB();
