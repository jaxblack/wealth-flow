// TODO(round-2): wire SWR + fetchStockQuotes()
// Endpoints:
//   A股: https://hq.sinajs.cn/list=sh600519,sz000001 (Referer: finance.sina.com.cn)
//   HK:  https://query1.finance.yahoo.com/v8/finance/chart/0700.HK
//   US:  https://query1.finance.yahoo.com/v8/finance/chart/AAPL
import { useState } from 'react';

export default function StocksPanel() {
  const [symbols, setSymbols] = useState<string[]>(['AAPL', 'TSLA', '0700.HK', 'sh600519']);
  const [input, setInput] = useState('');

  function add() {
    const s = input.trim();
    if (s && !symbols.includes(s)) setSymbols([...symbols, s]);
    setInput('');
  }
  function remove(s: string) { setSymbols(symbols.filter(x => x !== s)); }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="flex-1 rounded bg-slate-800 px-2 py-1 text-xs" placeholder="代码 (AAPL / 0700.HK / sh600519)" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="rounded bg-sky-600 hover:bg-sky-500 px-2 py-1 text-xs" onClick={add}>添加</button>
      </div>
      <table className="w-full text-xs">
        <thead className="text-slate-400">
          <tr><th className="text-left py-1">代码</th><th className="text-right">现价</th><th className="text-right">涨跌</th><th></th></tr>
        </thead>
        <tbody>
          {symbols.map(s => (
            <tr key={s} className="border-t border-slate-800">
              <td className="py-1 font-mono">{s}</td>
              <td className="text-right text-slate-500">—</td>
              <td className="text-right text-slate-500">—</td>
              <td className="text-right"><button className="text-rose-400 hover:text-rose-300" onClick={() => remove(s)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-500">⚠ 行情待接入 · 见 fetchers/index.ts</p>
    </div>
  );
}
