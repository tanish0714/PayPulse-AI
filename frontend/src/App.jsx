import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CheckoutSimulatorModal from './components/CheckoutSimulatorModal';
import OverviewView from './views/OverviewView';
import LedgerView from './views/LedgerView';
import WebhookChaosView from './views/WebhookChaosView';
import ReconciliationDisputeView from './views/ReconciliationDisputeView';
import { 
  fetchDashboardMetrics, 
  fetchOrders, 
  fetchPayments, 
  fetchLedger, 
  fetchWebhooks 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ledgerData, setLedgerData] = useState({ entries: [], summary: {} });
  const [webhookData, setWebhookData] = useState({ events: [], metrics: {} });
  const [preselectedOrderForDispute, setPreselectedOrderForDispute] = useState(null);

  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const [m, o, p, l, w] = await Promise.all([
        fetchDashboardMetrics().catch(() => null),
        fetchOrders().catch(() => ({ orders: [] })),
        fetchPayments().catch(() => ({ payments: [] })),
        fetchLedger().catch(() => ({ entries: [], summary: {} })),
        fetchWebhooks().catch(() => ({ events: [], metrics: {} }))
      ]);

      if (m) setMetrics(m);
      if (o?.orders) setOrders(o.orders);
      if (p?.payments) setPayments(p.payments);
      if (l) setLedgerData(l);
      if (w) setWebhookData(w);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Background polling every 10 seconds for real-time dashboard feel
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectOrderForDispute = (order) => {
    setPreselectedOrderForDispute(order);
    setActiveTab('ai');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        chaosActive={metrics?.chaos?.enabled}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          onRefresh={loadAllData}
          isRefreshing={isRefreshing}
          isBalanced={metrics?.ledger?.isBalanced ?? true}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'overview' && (
            <OverviewView
              metrics={metrics}
              orders={orders}
              payments={payments}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onSelectOrderForDispute={handleSelectOrderForDispute}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerView ledgerData={ledgerData} />
          )}

          {activeTab === 'webhooks' && (
            <WebhookChaosView
              webhookData={webhookData}
              chaosStatus={metrics?.chaos}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'ai' && (
            <ReconciliationDisputeView
              orders={orders}
              preselectedOrder={preselectedOrderForDispute}
            />
          )}
        </main>
      </div>

      {/* Checkout Simulator Modal */}
      <CheckoutSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSuccess={loadAllData}
      />
    </div>
  );
}
