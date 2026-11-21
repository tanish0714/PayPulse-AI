import React from 'react';
import { motion } from 'framer-motion';

export default function KpiCard({ title, value, subtitle, icon: Icon, badge, badgeColor = 'emerald', alert = false }) {
  const badgeClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-shadow relative overflow-hidden ${
        alert ? 'border-amber-300 ring-2 ring-amber-100' : 'border-surface-border'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-sans">{value}</span>
        {badge && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeClasses[badgeColor] || badgeClasses.emerald}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
