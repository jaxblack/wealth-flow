// TODO(round-2): replace tableData with live fetch from src/lib/fetchers/fetchBankRates()
// Sources to integrate: PBoC LPR (http://www.pbc.gov.cn), each bank's official rate page.
import { useState } from 'react';

interface RateRow { bank: string; product: string; term: string; rate: number; }

const tableData: RateRow[] = [
  { bank: 'ICBC 工商银行', product: '定期存款', term: '1Y', rate: 1.10 },
  { bank: 'ICBC 工商银行', product: '定期存款', term: '3Y', rate: 1.50 },
  { bank: 'CCB 建设银行',  product: '定期存款', term: '1Y', rate: 1.10 },
  { bank: 'BoC 中国银行',  product: '定期存款', term: '1Y', rate: 1.10 },
  { bank: 'ABC 农业银行',  product: '定期存款', term: '1Y', rate: 1.10 },
  { bank: 'CMB 招商银行',  product: '定期存款', term: '1Y', rate: 1.15 },
  { bank: 'LPR',           product: '贷款利率', term: '1Y', rate: 3.10 },
  { bank: 'LPR',           product: '贷款利率', term: '5Y', rate: 3.60 },
];

export default function BankRatesPanel() {
  const [filter, setFilter] = useState('');
  const rows = tableData.filter(r => !filter || r.bank.includes(filter));
  return (
    <div className="space-y-2">
      <input className="w-full rounded bg-slate-800 px-2 py-1 text-xs" placeholder="按银行过滤..." value={filter} onChange={e => setFilter(e.target.value)} />
      <table className="w-full text-xs">
        <thead className="text-slate-400">
          <tr><th className="text-left py-1">银行</th><th>类型</th><th>期限</th><th className="text-right">利率%</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="py-1">{r.bank}</td>
              <td className="text-center">{r.product}</td>
              <td className="text-center">{r.term}</td>
              <td className="text-right font-mono">{r.rate.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-500">⚠ 占位数据 · 待接入实时拉取</p>
    </div>
  );
}
