import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AssetKind, type Currency } from '../../db/schema';

const KINDS: AssetKind[] = ['cash', 'deposit', 'stock', 'fund', 'crypto', 'realestate', 'other'];
const CURRENCIES: Currency[] = ['CNY', 'HKD', 'USD', 'EUR', 'JPY', 'GBP'];

export default function AssetsPanel() {
  const assets = useLiveQuery(() => db.assets.orderBy('updatedAt').reverse().toArray(), []);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AssetKind>('cash');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('CNY');
  const [account, setAccount] = useState('');

  async function add() {
    if (!name.trim() || !amount) return;
    await db.assets.add({
      name: name.trim(),
      kind,
      amount: parseFloat(amount),
      currency,
      account: account.trim() || undefined,
      updatedAt: Date.now(),
    });
    setName(''); setAmount(''); setAccount('');
  }

  async function remove(id?: number) {
    if (id != null) await db.assets.delete(id);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded bg-slate-800 px-2 py-1" placeholder="名称(如:招行活期)" value={name} onChange={e => setName(e.target.value)} />
        <input className="rounded bg-slate-800 px-2 py-1" placeholder="金额" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        <select className="rounded bg-slate-800 px-2 py-1" value={kind} onChange={e => setKind(e.target.value as AssetKind)}>
          {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className="rounded bg-slate-800 px-2 py-1" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="col-span-2 rounded bg-slate-800 px-2 py-1" placeholder="账户备注(可选)" value={account} onChange={e => setAccount(e.target.value)} />
        <button className="col-span-2 rounded bg-emerald-600 hover:bg-emerald-500 py-1 font-medium" onClick={add}>+ 添加资产</button>
      </div>
      <ul className="divide-y divide-slate-800 text-xs">
        {(assets ?? []).map(a => (
          <li key={a.id} className="flex items-center justify-between py-1.5">
            <div>
              <div className="font-medium">{a.name} <span className="text-slate-500">({a.kind})</span></div>
              <div className="text-slate-400">{a.amount.toLocaleString()} {a.currency} {a.account ? `· ${a.account}` : ''}</div>
            </div>
            <button className="text-rose-400 hover:text-rose-300" onClick={() => remove(a.id)}>删除</button>
          </li>
        ))}
        {(assets ?? []).length === 0 && <li className="py-2 text-slate-500">还没有资产,先添加一笔吧。</li>}
      </ul>
    </div>
  );
}
