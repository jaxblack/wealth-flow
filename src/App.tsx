import AssetsPanel from './modules/assets/AssetsPanel';
import BankRatesPanel from './modules/bankRates/BankRatesPanel';
import StocksPanel from './modules/stocks/StocksPanel';
import FXPanel from './modules/fx/FXPanel';
import TransferFeesPanel from './modules/transferFees/TransferFeesPanel';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">{title}</h2>
      <div className="text-sm text-slate-300">{children}</div>
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">💰 Wealth Flow</h1>
        <p className="text-slate-400 text-sm">AI 理财看板 · 数据本地保存 · 行情实时拉取</p>
      </header>
      <main className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <Card title="我的资产">
          <AssetsPanel />
        </Card>
        <Card title="国内大行存贷款利率">
          <BankRatesPanel />
        </Card>
        <Card title="股票行情(A/HK/US)">
          <StocksPanel />
        </Card>
        <Card title="汇率">
          <FXPanel />
        </Card>
        <Card title="跨境汇款手续费(CN↔HK)">
          <TransferFeesPanel />
        </Card>
      </main>
    </div>
  );
}
