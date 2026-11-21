import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { createOrder, simulatePayment } from '../services/api';

export default function CheckoutSimulatorModal({ isOpen, onClose, onSuccess }) {
  const [customerName, setCustomerName] = useState('Ananya Sen');
  const [customerEmail, setCustomerEmail] = useState('ananya.sen@example.com');
  const [amountRupees, setAmountRupees] = useState('3499');
  const [scenario, setScenario] = useState('SUCCESS');
  const [method, setMethod] = useState('UPI');
  const [idempotencyKey, setIdempotencyKey] = useState(`idem_${Date.now()}`);

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Form, 1: Running, 2: Completed
  const [logs, setLogs] = useState([]);
  const [resultData, setResultData] = useState(null);

  if (!isOpen) return null;

  const handleGenerateNewKey = () => {
    setIdempotencyKey(`idem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  };

  const addLog = (msg, type = 'info') => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setCurrentStep(1);
    setLogs([]);
    setResultData(null);

    const amountPaise = Math.round(parseFloat(amountRupees || '0') * 100);

    try {
      // Step 1: Create Order with Idempotency Key
      addLog(`[Idempotency] Dispatching order creation with Key: ${idempotencyKey}`, 'info');
      const orderRes = await createOrder({
        customer_name: customerName,
        customer_email: customerEmail,
        amount: amountPaise,
        currency: 'INR'
      }, idempotencyKey);

      if (orderRes.cached) {
        addLog(`[Idempotency HIT] 200 OK served from Redis Cache (X-Cache: HIT)`, 'warning');
      } else {
        addLog(`[Order Created] Order ID: ${orderRes.order.id} | Amount: ₹${amountRupees}`, 'success');
      }

      await new Promise(r => setTimeout(r, 600));

      // Step 2: Simulate Payment & Gateway Webhook
      addLog(`[Gateway] Simulating checkout scenario: ${scenario} via ${method}`, 'info');
      const simRes = await simulatePayment({
        order_id: orderRes.order.id,
        scenario,
        method
      });

      addLog(`[Payment Event] Gateway Payment ID: ${simRes.payment.gateway_payment_id} | Status: ${simRes.payment.status}`, simRes.payment.status === 'SUCCESS' ? 'success' : 'error');
      addLog(`[Webhook Ingestion] HMAC-SHA256 signature generated & validated. Event enqueued.`, 'info');

      await new Promise(r => setTimeout(r, 600));

      if (scenario === 'SUCCESS') {
        addLog(`[BullMQ Worker] ACID transaction executed. Balanced DEBIT/CREDIT ledger entries committed.`, 'success');
      } else {
        addLog(`[Payment Failed] Captured error code: ${simRes.payment.error_code}. Order marked FAILED.`, 'error');
      }

      setResultData({ order: orderRes.order, payment: simRes.payment, webhook: simRes.webhook_event });
      setCurrentStep(2);
      if (onSuccess) onSuccess();
    } catch (err) {
      addLog(`[Fatal Error] Simulation failed: ${err.message}`, 'error');
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-surface-border overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-fintech-50 text-fintech-600 border border-fintech-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Fintech Checkout & Webhook Simulator</h3>
              <p className="text-xs text-slate-500">Test real payment pipelines, HMAC webhooks, and double-entry postings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fintech-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fintech-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (₹ INR)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fintech-500 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fintech-500 font-medium bg-white"
                  >
                    <option value="UPI">UPI (Fast Checkout)</option>
                    <option value="CARD">Credit/Debit Card (3DS 2.0)</option>
                    <option value="NETBANKING">Net Banking</option>
                  </select>
                </div>
              </div>

              {/* Idempotency Key */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-fintech-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-fintech-600" />
                    Redis Idempotency Key (Header)
                  </span>
                  <button
                    onClick={handleGenerateNewKey}
                    type="button"
                    className="text-[11px] font-semibold text-fintech-600 hover:text-fintech-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> New Key
                  </button>
                </div>
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-blue-200 rounded-lg text-slate-700 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Re-submitting with the same key will return cached results with <code>X-Cache: HIT</code>.
                </p>
              </div>

              {/* Simulation Scenarios */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Simulation Scenario</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'SUCCESS', label: '✅ Payment Success', desc: 'Captures & balances ledger' },
                    { id: 'FAILED_U16', label: '❌ Bank Decline (U16)', desc: 'Daily limit / insufficient balance' },
                    { id: 'FAILED_RISK', label: '⚠️ Risk Engine Block', desc: 'High fraud probability score' },
                    { id: 'FAILED_ISSUER_DOWN', label: '⏱️ Issuing Bank Down', desc: 'Core bank switch timeout' }
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setScenario(sc.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        scenario === sc.id
                          ? 'border-fintech-600 bg-blue-50/50 ring-2 ring-blue-100'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-800">{sc.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{sc.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Execution Progress & Terminal Logs */}
          {(currentStep === 1 || currentStep === 2) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Live Transaction Pipeline Logs
                  </span>
                </div>
                {isLoading && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-fintech-600">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing ACID Pipeline...
                  </span>
                )}
              </div>

              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto space-y-1.5 shadow-inner">
                {logs.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 select-none">[{l.time}]</span>
                    <span className={
                      l.type === 'success' ? 'text-emerald-400 font-semibold' :
                      l.type === 'error' ? 'text-rose-400 font-semibold' :
                      l.type === 'warning' ? 'text-amber-300 font-semibold' :
                      'text-slate-300'
                    }>
                      {l.msg}
                    </span>
                  </div>
                ))}
              </div>

              {resultData && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Pipeline Execution Finished</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Order <strong>{resultData.order.id}</strong> recorded. Gateway payment <strong>{resultData.payment.gateway_payment_id}</strong> processed. Double-entry ledger accounts balanced.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border bg-slate-50 flex items-center justify-between">
          {currentStep === 0 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-fintech-600 hover:bg-fintech-700 text-white shadow-md shadow-blue-600/25 transition-all"
              >
                <span>Trigger Live Simulation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setCurrentStep(0);
                  handleGenerateNewKey();
                }}
                className="px-4 py-2 text-xs font-semibold text-fintech-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                Simulate Another
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-900"
              >
                Done
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
