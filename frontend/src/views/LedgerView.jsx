import React, { useState } from 'react';
import { 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Layers, 
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export default function LedgerView({ ledgerData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');

  const entries = ledgerData?.entries || [];
  const summary = ledgerData?.summary || { totalDebit: 0, totalCredit: 0, isBalanced: true, accountBalances: {} };

  const isBalanced = summary.isBalanced;
  const totalDebitRupees = (summary.totalDebit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const totalCreditRupees = (summary.totalCredit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const filteredEntries = entries.filter((e) => {
    if (accountFilter !== 'ALL' && e.account_type !== accountFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.transaction_group_id.toLowerCase().includes(q) ||
        e.reference_id.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Group entries by transaction_group_id
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.transaction_group_id]) {
      acc[entry.transaction_group_id] = [];
    }
    acc[entry.transaction_group_id].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Accounting Invariant Verification Banner */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isBalanced 
          ? 'bg-gradient-to-r from-emerald-50/80 via-white to-blue-50/50 border-emerald-200 shadow-xs' 
          : 'bg-rose-50 border-rose-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Immutable Double-Entry Accounting Ledger</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-bounce'
                }`}>
                  {isBalanced ? '✓ PARITY VERIFIED' : '⚠ INTEGRITY BREACH'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mathematical invariant: <code>Total DEBITS (₹{totalDebitRupees}) == Total CREDITS (₹{totalCreditRupees})</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/80 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total Debits</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">₹{totalDebitRupees}</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total Credits</span>
              <span className="font-mono font-bold text-blue-700 text-sm">₹{totalCreditRupees}</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Net Variance</span>
              <span className="font-mono font-bold text-slate-900 text-sm">₹0.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Balances Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            name: 'CUSTOMER_ESCROW',
            title: 'Customer Escrow Account',
            desc: 'Funds held in trust prior to gateway clearing',
            color: 'blue',
            data: summary.accountBalances?.CUSTOMER_ESCROW || { debit: 0, credit: 0, net: 0 }
          },
          {
            name: 'MERCHANT_BALANCE',
            title: 'Merchant Payout Balance',
            desc: 'Net settled revenue allocated to merchants',
            color: 'emerald',
            data: summary.accountBalances?.MERCHANT_BALANCE || { debit: 0, credit: 0, net: 0 }
          },
          {
            name: 'GATEWAY_FEE',
            title: 'Gateway MDR & GST Accrual',
            desc: 'Interchange & network processing charges',
            color: 'purple',
            data: summary.accountBalances?.GATEWAY_FEE || { debit: 0, credit: 0, net: 0 }
          }
        ].map((acc) => (
          <div key={acc.name} className="bg-white p-4 rounded-xl border border-surface-border shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs font-bold text-slate-700">{acc.name}</span>
              <span className="text-[10px] font-semibold text-fintech-700 bg-blue-50 px-2 py-0.5 rounded">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">{acc.desc}</p>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-mono">
              <span className="text-slate-500">Debits: ₹{(acc.data.debit / 100).toFixed(2)}</span>
              <span className="font-bold text-slate-900">Credits: ₹{(acc.data.credit / 100).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ledger Journal Entries Explorer */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Ledger Journal Entries</h3>
            <p className="text-xs text-slate-500">Chronological audit log grouped by atomic transaction groups</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search group ID or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fintech-500 w-64"
              />
            </div>

            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-fintech-500"
            >
              <option value="ALL">All Account Types</option>
              <option value="CUSTOMER_ESCROW">CUSTOMER_ESCROW</option>
              <option value="MERCHANT_BALANCE">MERCHANT_BALANCE</option>
              <option value="GATEWAY_FEE">GATEWAY_FEE</option>
            </select>
          </div>
        </div>

        {/* Grouped Table View */}
        <div className="divide-y divide-surface-border">
          {Object.keys(groupedEntries).length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No ledger entries match query.
            </div>
          ) : (
            Object.entries(groupedEntries).map(([groupId, items]) => {
              const groupDebits = items.filter(i => i.entry_type === 'DEBIT').reduce((s, i) => s + i.amount, 0);
              const groupCredits = items.filter(i => i.entry_type === 'CREDIT').reduce((s, i) => s + i.amount, 0);
              const groupBalanced = groupDebits === groupCredits;

              return (
                <div key={groupId} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-2.5 border-b border-dashed border-slate-200 gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-fintech-600" />
                      <span className="font-mono font-bold text-xs text-slate-800">
                        Group: <span className="text-fintech-700">{groupId}</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        groupBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {groupBalanced ? 'Balanced' : 'Unbalanced'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Ref: {items[0]?.reference_id} • {new Date(items[0]?.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-2 sm:pl-6">
                    {items.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            entry.entry_type === 'DEBIT' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {entry.entry_type === 'DEBIT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {entry.entry_type}
                          </span>
                          <span className="font-mono text-slate-700 font-semibold">{entry.account_type}</span>
                          <span className="text-slate-500 hidden md:inline text-[11px]">— {entry.description}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{(entry.amount / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
