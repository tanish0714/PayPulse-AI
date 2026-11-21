import React, { useState } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  Webhook, 
  RotateCw, 
  Radio, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Copy,
  Sliders,
  ShieldAlert,
  Server
} from 'lucide-react';
import { toggleChaosMode } from '../services/api';

export default function WebhookChaosView({ webhookData, chaosStatus, onRefresh }) {
  const [isUpdatingChaos, setIsUpdatingChaos] = useState(false);
  const [chaosEnabled, setChaosEnabled] = useState(chaosStatus?.enabled || false);
  const [failureRate, setFailureRate] = useState(chaosStatus?.failureRate || 0.4);
  const [duplicateRate, setDuplicateRate] = useState(chaosStatus?.duplicateRate || 0.5);

  const events = webhookData?.events || [];
  const metrics = webhookData?.metrics || { total: 0, processed: 0, failed: 0, dlq: 0 };

  const handleToggleChaos = async () => {
    setIsUpdatingChaos(true);
    try {
      const nextState = !chaosEnabled;
      const res = await toggleChaosMode({
        enabled: nextState,
        failureRate: parseFloat(failureRate),
        duplicateRate: parseFloat(duplicateRate),
        latencyMs: 3000
      });
      setChaosEnabled(res.chaos.enabled);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to toggle chaos:', err);
    } finally {
      setIsUpdatingChaos(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PROCESSED</span>;
      case 'QUEUED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">QUEUED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">RETRYING</span>;
      case 'DLQ':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">DEAD LETTER (DLQ)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Chaos Simulator Control Console */}
      <div className={`p-6 rounded-2xl border transition-all ${
        chaosEnabled 
          ? 'bg-gradient-to-r from-amber-500/10 via-white to-rose-500/10 border-amber-300 ring-2 ring-amber-100 shadow-md'
          : 'bg-white border-surface-border shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${chaosEnabled ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Chaos Engineering Simulator</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  chaosEnabled ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {chaosEnabled ? '● ACTIVE' : '○ STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Stress-test idempotency, 3-second network latencies, and BullMQ Dead Letter Queue routing
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleChaos}
            disabled={isUpdatingChaos}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
              chaosEnabled
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isUpdatingChaos ? 'Updating...' : chaosEnabled ? 'Disable Chaos Mode' : 'Enable Chaos Mode'}
          </button>
        </div>

        {/* Chaos Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Duplicate Webhooks (Idempotency)</span>
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Rate: {Math.round(duplicateRate * 100)}%</span>
              <span className="text-fintech-600 font-bold">Redis Guarded</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Injected Latency</span>
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>3,000 ms</span>
              <span className="text-amber-600 font-bold">Async Non-blocking</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Simulated 500 Failures</span>
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Rate: {Math.round(failureRate * 100)}%</span>
              <span className="text-rose-600 font-bold">DLQ Dead Lettering</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dead Letter Queue (DLQ) Inspector */}
      {metrics.dlq > 0 && (
        <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
            <h4 className="font-bold text-sm text-amber-950">Dead Letter Queue (DLQ) Inspector</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
              {metrics.dlq} Unrecoverable Jobs
            </span>
          </div>
          <p className="text-xs text-amber-800 mb-3">
            Jobs that exceeded the maximum exponential backoff limit (3 attempts) are quarantined here to prevent toxic queue blockages.
          </p>
          <div className="space-y-2">
            {events.filter(e => e.status === 'DLQ').map(e => (
              <div key={e.id} className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2">
                <div>
                  <span className="font-bold text-slate-900">{e.event_id}</span>
                  <span className="block text-[11px] text-rose-600">{e.error_message || 'Timeout / Max retries exceeded'}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Retried {e.retry_count} times • {new Date(e.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook Events Ingestion Log */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">HMAC-SHA256 Webhook Audit Log</h3>
            <p className="text-xs text-slate-500">Every incoming gateway callback verified with cryptographic signatures</p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-surface-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Event ID</th>
                <th className="py-3 px-5">Event Type</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Retries</th>
                <th className="py-3 px-5">HMAC Security</th>
                <th className="py-3 px-5">Received At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-xs font-mono">
              {events.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-sans">
                    No webhooks received yet. Trigger a checkout simulation above!
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-5 font-bold text-fintech-700">{ev.event_id}</td>
                    <td className="py-3 px-5 text-slate-700 font-sans">{ev.event_type}</td>
                    <td className="py-3 px-5 font-sans">{getStatusBadge(ev.status)}</td>
                    <td className="py-3 px-5 text-slate-600">{ev.retry_count} / 3</td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-sans font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HMAC-SHA256 Valid
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-400 text-[11px]">
                      {new Date(ev.created_at).toLocaleTimeString()}
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
