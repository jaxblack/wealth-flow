// TODO(round-2): SWR + fetchFxRates('CNY')
// Endpoint: https://api.exchangerate.host/latest?base=CNY&symbols=USD,HKD,EUR,JPY,GBP
const SAMPLE: Record<string, number> = { USD: 0.1395, HKD: 1.0890, EUR: 0.1287, JPY: 21.5, GBP: 0.1095 };

export default function FXPanel() {
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">基准:1 CNY =</div>
      <table className="w-full text-xs">
        <tbody>
          {Object.entries(SAMPLE).map(([cur, val]) => (
            <tr key={cur} className="border-t border-slate-800">
              <td className="py-1 font-mono">{cur}</td>
              <td className="text-right font-mono">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-500">⚠ 占位数据 · 待接入 exchangerate.host</p>
    </div>
  );
}
