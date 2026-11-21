import React from 'react';
import { Activity, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export default function Header({ onOpenSimulator, onRefresh, isRefreshing, isBalanced = true }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-surface-border px-4 lg:px-8 py-3.5 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-fintech-700 to-fintech-500 text-white shadow-md shadow-blue-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">PayPulse<span className="text-fintech-600">.ai</span></span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-fintech-700 rounded-full border border-blue-200">
                PROD v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Autonomous Payment Ledger & Dispute Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Integrity status badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ledger: <strong>{isBalanced ? 'BALANCED' : 'IMBALANCE'}</strong></span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh metrics"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-surface-border"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-fintech-600' : ''}`} />
          </button>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold bg-fintech-600 hover:bg-fintech-700 text-white shadow-sm shadow-blue-600/30 transition-all hover:shadow-md"
          >
            <Zap className="w-4 h-4" />
            <span>Test Checkout Simulator</span>
          </button>
        </div>
      </div>
    </header>
  );
}
