import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  IndianRupee, 
  ShieldCheck, 
  Webhook, 
  AlertOctagon, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ArrowUpRight,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react';
import KpiCard from '../components/KpiCard';

export default function OverviewView({ metrics, orders, payments, onOpenSimulator, onSelectOrderForDispute }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const summary = metrics?.summary || { totalGmvFormatted: '₹0.00', totalOrders: 0, disputeCount: 0 };
  const ledger = metrics?.ledger || { isBalanced: true, entryCount: 0 };
  const webhooks = metrics?.webhooks || { total: 0, successRate: '100.0', dlq: 0 };
  const queue = metrics?.queue || { waiting: 0, dlqCount: 0 };

  const filteredOrders = (orders || []).filter((ord) => {
    if (filter !== 'ALL' && ord.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ord.id.toLowerCase().includes(q) ||
        ord.customer_name.toLowerCase().includes(q) ||
        ord.customer_email.toLowerCase().includes(q) ||
        ord.merchant_order_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> PAID
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> FAILED
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertOctagon className="w-3 h-3 text-amber-600" /> DISPUTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Gross Volume (GMV)"
          value={summary.totalGmvFormatted}
          subtitle={`Across ${summary.totalOrders} total platform orders`}
          icon={IndianRupee}
          badge="Live Payouts"
          badgeColor="blue"
        />

        <KpiCard
          title="Ledger Invariant Status"
          value={ledger.isBalanced ? 'BALANCED' : 'IMBALANCE'}
          subtitle={`Sum(Debit) == Sum(Credit) | ${ledger.entryCount} postings`}
          icon={ShieldCheck}
          badge={ledger.isBalanced ? 'Zero Variance' : 'Alert'}
          badgeColor={ledger.isBalanced ? 'emerald' : 'red'}
          alert={!ledger.isBalanced}
        />

        <KpiCard
          title="Webhook Success Rate"
          value={`${webhooks.successRate}%`}
          subtitle={`${webhooks.total} HMAC-verified webhook deliveries`}
          icon={Webhook}
          badge="SLA 99.9%"
          badgeColor="emerald"
        />

        <KpiCard
          title="Async DLQ & Failures"
          value={`${queue.dlqCount || webhooks.dlq || 0}`}
          subtitle={`${queue.waiting || 0} jobs waiting in BullMQ queue`}
          icon={AlertOctagon}
          badge={queue.dlqCount > 0 ? 'Review Needed' : 'Healthy'}
          badgeColor={queue.dlqCount > 0 ? 'amber' : 'emerald'}
          alert={queue.dlqCount > 0}
        />
      </div>

      {/* Live Transaction Feed Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Real-Time Transaction Activity Feed</h3>
            <p className="text-xs text-slate-500">Atomic checkout orders, payment captures, and disputes</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search order or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fintech-500 w-48 sm:w-60"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
              {['ALL', 'PAID', 'FAILED', 'DISPUTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filter === st
                      ? 'bg-white text-fintech-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-surface-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Order ID</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Amount (₹)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                    No transactions match current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-medium text-fintech-700">
                      {ord.id}
                      <span className="block text-[10px] text-slate-400 font-normal">{ord.merchant_order_id}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-800">{ord.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{ord.customer_email}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                      ₹{(ord.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5">
                      {getStatusBadge(ord.status)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                      {new Date(ord.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {ord.status === 'DISPUTED' ? (
                        <button
                          onClick={() => onSelectOrderForDispute(ord)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          <span>Fight Chargeback</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectOrderForDispute(ord)}
                          className="text-slate-400 hover:text-fintech-600 transition-colors p-1"
                          title="View dispute resolution packet"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
