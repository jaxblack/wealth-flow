// Static reference table — verify with bank before transferring.
interface FeeRow { from: string; to: string; ccy: string; handling: string; cable: string; notes: string; }

const FEES: FeeRow[] = [
  { from: 'BoC CN',  to: 'BoC HK',   ccy: 'USD/HKD', handling: '0.1% (min ¥50, max ¥260)', cable: '¥150',  notes: '同行内部汇款较便宜' },
  { from: 'ICBC CN', to: 'ICBC HK',  ccy: 'USD/HKD', handling: '0.1% (min ¥50, max ¥260)', cable: '¥150',  notes: '需提供境外账户' },
  { from: 'HSBC CN', to: 'HSBC HK',  ccy: 'USD/HKD/CNY', handling: '免', cable: '免', notes: '卓越/运筹理财客户' },
  { from: 'CMB CN',  to: 'HK 任意行', ccy: 'USD/HKD', handling: '0.1% (min ¥50, max ¥260)', cable: '¥150',  notes: '私行VIP可减免' },
  { from: 'HSBC HK', to: 'HSBC CN',  ccy: 'CNY',     handling: '免', cable: '免', notes: '内地汇入CNY需≤8万/日' },
  { from: 'BoC HK',  to: 'BoC CN',   ccy: 'CNY',     handling: 'HK$50-100', cable: '免', notes: '同行通存通兑' },
];

export default function TransferFeesPanel() {
  return (
    <div className="space-y-2">
      <table className="w-full text-[11px]">
        <thead className="text-slate-400">
          <tr><th className="text-left">起→落</th><th>币种</th><th>手续费</th><th>电报费</th></tr>
        </thead>
        <tbody>
          {FEES.map((f, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="py-1">{f.from} → {f.to}</td>
              <td className="text-center">{f.ccy}</td>
              <td className="text-center">{f.handling}</td>
              <td className="text-center">{f.cable}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-500">⚠ 参考费率 · 实际以银行公告为准</p>
    </div>
  );
}
