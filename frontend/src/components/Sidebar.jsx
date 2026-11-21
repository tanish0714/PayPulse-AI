import React from 'react';
import { 
  LayoutDashboard, 
  Scale, 
  Webhook, 
  Bot, 
  Menu, 
  X,
  Lock,
  Cpu
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, chaosActive = false }) {
  const navItems = [
    { id: 'overview', label: 'Overview & Simulator', icon: LayoutDashboard },
    { id: 'ledger', label: 'Double-Entry Ledger', icon: Scale },
    { id: 'webhooks', label: 'Webhooks & Chaos', icon: Webhook, badge: chaosActive ? 'CHAOS ON' : null },
    { id: 'ai', label: 'AI Reconciliation & Disputes', icon: Bot, badge: 'Gemini' }
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-5 right-5 z-50 p-3 bg-fintech-600 text-white rounded-full shadow-lg shadow-blue-600/40"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-surface-border flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5">
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Enterprise Console</span>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-blue-50 text-fintech-700 font-semibold shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-fintech-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badge === 'CHAOS ON' 
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-fintech-100 text-fintech-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Security & System Info Footer */}
        <div className="p-4 border-t border-surface-border bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
            <Lock className="w-3.5 h-3.5 text-fintech-600" />
            <span>ACID Double-Entry Protocol</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Strict debit/credit parity. Idempotent webhook processing via BullMQ with DLQ dead lettering.
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Node v22 + Py 3.13</span>
            <span className="text-emerald-600 font-bold">100% OK</span>
          </div>
        </div>
      </aside>
    </>
  );
}
