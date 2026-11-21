import React, { useState } from 'react';
import { 
  Bot, 
  Scale, 
  FileCheck2, 
  AlertOctagon, 
  Sparkles, 
  ArrowRight, 
  Copy, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw,
  FileSpreadsheet,
  Cpu
} from 'lucide-react';
import { runReconciliation, generateDisputePacket, generateDeclineRecovery } from '../services/api';

export default function ReconciliationDisputeView({ orders, preselectedOrder }) {
  const [activeSubTab, setActiveSubTab] = useState('reconcile'); // 'reconcile' | 'dispute' | 'decline'

  // --- RECONCILIATION STATE ---
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  // Default sample reconciliation datasets with intentional mismatch
  const sampleLedger = [
    { reference_id: 'ord_demo_101', amount: 249900, gateway_fee: 5898, description: 'UPI order' },
    { reference_id: 'ord_demo_102', amount: 1499900, gateway_fee: 35398, description: 'Card order' },
    { reference_id: 'ord_demo_103', amount: 450000, gateway_fee: 10620, description: 'Held order' }
  ];

  const sampleSettlement = [
    { reference_id: 'ord_demo_101', amount: 249900, fee: 7500, description: 'Settled at higher Tier-1 MDR rate' }, // Intentional fee mismatch!
    { reference_id: 'ord_demo_102', amount: 1499900, fee: 35398, description: 'Settled Card payment' },
    { reference_id: 'ord_settle_orphan_99', amount: 120000, fee: 2832, description: 'Unrecorded gateway capture' } // Unrecorded credit!
  ];

  // --- DISPUTE STATE ---
  const [selectedOrderId, setSelectedOrderId] = useState(preselectedOrder?.id || 'ord_demo_103');
  const [isGeneratingDispute, setIsGeneratingDispute] = useState(false);
  const [disputePacket, setDisputePacket] = useState(null);
  const [copiedLetter, setCopiedLetter] = useState(false);

  // --- DECLINE RECOVERY STATE ---
  const [declineCode, setDeclineCode] = useState('ERR_U16');
  const [isDiagnosingDecline, setIsDiagnosingDecline] = useState(false);
  const [declineResult, setDeclineResult] = useState(null);

  // Handlers
  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      const res = await runReconciliation(sampleLedger, sampleSettlement);
      setReconcileResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleGenerateDispute = async () => {
    setIsGeneratingDispute(true);
    setCopiedLetter(false);
    try {
      const currentOrder = orders.find(o => o.id === selectedOrderId) || {
        id: selectedOrderId,
        customer_name: 'Vikram Sethi',
        customer_email: 'vikram.sethi@gmail.com',
        amount: 450000
      };

      const res = await generateDisputePacket({
        order_id: currentOrder.id,
        customer_name: currentOrder.customer_name,
        customer_email: currentOrder.customer_email,
        amount: currentOrder.amount,
        currency: currentOrder.currency || 'INR',
        dispute_reason: 'Fraudulent Transaction - Cardholder claims unauthorized transaction',
        reason_code: '10.4',
        ip_address: '103.21.244.12',
        device_fingerprint: 'fp_chrome_win11_89f02'
      });
      setDisputePacket(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingDispute(false);
    }
  };

  const handleDiagnoseDecline = async () => {
    setIsDiagnosingDecline(true);
    try {
      const res = await generateDeclineRecovery({
        error_code: declineCode,
        method: 'UPI',
        amount: 185000
      });
      setDeclineResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDiagnosingDecline(false);
    }
  };

  const handleCopyLetter = () => {
    if (disputePacket?.formal_letter) {
      navigator.clipboard.writeText(disputePacket.formal_letter);
      setCopiedLetter(true);
      setTimeout(() => setCopiedLetter(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtabs Navigation */}
      <div className="flex border-b border-surface-border gap-6 bg-white px-6 pt-3 rounded-2xl shadow-xs">
        {[
          { id: 'reconcile', label: 'Autonomous Settlement Reconciliation', icon: Scale },
          { id: 'dispute', label: 'Chargeback Defense Packet Generator', icon: ShieldCheck },
          { id: 'decline', label: 'Smart Decline Recovery Engine', icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-xs md:text-sm font-semibold transition-all relative ${
                isActive ? 'text-fintech-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fintech-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 1. RECONCILIATION TAB */}
      {activeSubTab === 'reconcile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Settlement vs. Ledger Reconciliation Engine</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-fintech-700 rounded-md border border-blue-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-fintech-600" /> Gemini + Exact Math
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  100% deterministic mathematical matching first (zero math hallucination) followed by AI root-cause diagnosis.
                </p>
              </div>

              <button
                onClick={handleRunReconciliation}
                disabled={isReconciling}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-fintech-600 hover:bg-fintech-700 text-white shadow-md shadow-blue-600/25 transition-all"
              >
                {isReconciling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Discrepancies...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Run AI Reconciliation</span>
                  </>
                )}
              </button>
            </div>

            {/* Input Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Internal Ledger Batch (3 Records)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">Total: ₹21,998.00</span>
                </div>
                <div className="space-y-1.5 font-mono text-xs text-slate-600">
                  {sampleLedger.map((l, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-200/50">
                      <span>{l.reference_id} ({l.description})</span>
                      <span className="font-bold">₹{(l.amount / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Gateway Settlement Report (3 Records)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">Total: ₹18,698.00</span>
                </div>
                <div className="space-y-1.5 font-mono text-xs text-slate-600">
                  {sampleSettlement.map((s, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-200/50">
                      <span>{s.reference_id} ({s.description})</span>
                      <span className="font-bold">₹{(s.amount / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reconciliation Output */}
          {reconcileResult && (
            <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-surface-border pb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Deterministic Mathematical Findings</h4>
                  <p className="text-xs text-slate-500">Exact paise variances identified prior to AI analysis</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {reconcileResult.discrepancies?.length || 0} Variances Detected
                </span>
              </div>

              {/* Discrepancy Breakdown */}
              <div className="space-y-3">
                {reconcileResult.discrepancies?.map((d, i) => (
                  <div key={i} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-mono font-bold text-amber-900">{d.reference_id} • {d.type}</div>
                      <p className="text-slate-600 mt-1">{d.description}</p>
                    </div>
                    <div className="font-mono font-bold text-rose-700 text-sm whitespace-nowrap">
                      Variance: ₹{(d.variance_paise / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gemini Root-Cause Analysis Card */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-blue-50/80 via-white to-purple-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-fintech-900 font-bold text-sm">
                  <Bot className="w-5 h-5 text-fintech-600" />
                  <span>Gemini Autonomous Root-Cause & Corrective Journal Entry</span>
                </div>
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-white/70 p-4 rounded-lg border border-blue-100">
                  {reconcileResult.ai_root_cause_analysis}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. DISPUTE REBUTTAL GENERATOR TAB */}
      {activeSubTab === 'dispute' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Autonomous Chargeback Rebuttal Generator</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generates bank-ready dispute packets with 3DS2 cryptographic tokens & card network rule citations.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.customer_name} (₹{(o.amount / 100).toFixed(2)})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateDispute}
                  disabled={isGeneratingDispute}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-fintech-600 hover:bg-fintech-700 text-white shadow-md shadow-blue-600/25 transition-all"
                >
                  {isGeneratingDispute ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Drafting Defense...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Generate Defense Packet</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {disputePacket && (
              <div className="space-y-6 pt-4 border-t border-surface-border">
                {/* Meta stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="block text-xs font-semibold text-slate-500">Case ID</span>
                    <span className="font-mono font-bold text-sm text-slate-900">{disputePacket.case_id}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="block text-xs font-semibold text-slate-500">Reason Rule Code</span>
                    <span className="font-mono font-bold text-sm text-fintech-700">{disputePacket.reason_code} ({disputePacket.reason_name})</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="block text-xs font-semibold text-emerald-700">Estimated Win Probability</span>
                    <span className="font-mono font-bold text-sm text-emerald-900">{Math.round((disputePacket.win_probability_score || 0.85) * 100)}% Win Rate</span>
                  </div>
                </div>

                {/* Evidence Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Verified Evidence Checklist</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {disputePacket.evidence_checklist?.map((ev, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="flex items-center gap-2 text-slate-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          {ev.item}
                        </span>
                        <span className="font-mono font-bold text-[10px] bg-white px-2 py-0.5 rounded border text-slate-600">
                          {ev.status || 'VERIFIED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formal Letter Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Formal Bank Rebuttal Letter</h4>
                    <button
                      onClick={handleCopyLetter}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-fintech-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLetter ? 'Copied!' : 'Copy Formal Letter'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-5 text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {disputePacket.formal_letter}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SMART DECLINE RECOVERY TAB */}
      {activeSubTab === 'decline' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-surface-border shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Smart Payment Decline Recovery Engine</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Decodes raw bank rejection codes and triggers omnichannel churn-prevention workflows.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={declineCode}
                  onChange={(e) => setDeclineCode(e.target.value)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                >
                  <option value="ERR_U16">ERR_U16 — UPI Limit / Balance Deficit</option>
                  <option value="RISK_BLOCK">RISK_BLOCK — Velocity & Fraud Score Threshold</option>
                  <option value="ISSUER_DOWN">ISSUER_DOWN — Bank Core Switch Outage</option>
                  <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS — Card Balance Exceeded</option>
                </select>

                <button
                  onClick={handleDiagnoseDecline}
                  disabled={isDiagnosingDecline}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-fintech-600 hover:bg-fintech-700 text-white shadow-md shadow-blue-600/25 transition-all"
                >
                  {isDiagnosingDecline ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Diagnosing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Diagnose & Recover</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {declineResult && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/60 via-white to-slate-50 border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-rose-600">{declineResult.error_code}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{declineResult.title}</h4>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-fintech-800">
                    Est. Recovery: {Math.round((declineResult.recovery_strategy?.estimated_recovery_rate || 0.75) * 100)}%
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="font-bold text-slate-900">Plain-English Customer Diagnosis:</div>
                  <p className="leading-relaxed text-slate-600">{declineResult.plain_english_explanation}</p>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recommended Smart Recovery Action:
                  </div>
                  <p className="leading-relaxed">{declineResult.recovery_strategy?.suggested_action}</p>
                  <div className="pt-2 font-mono text-[11px] text-emerald-800">
                    Switch Recommendation: <strong>{declineResult.recovery_strategy?.primary_recommendation}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
