// API Client for PayPulse AI Backend

const BASE_URL = '/api';

export async function fetchDashboardMetrics() {
  const res = await fetch(`${BASE_URL}/dashboard/metrics`);
  if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
  return res.json();
}

export async function createOrder(orderData, idempotencyKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(`${BASE_URL}/orders/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData)
  });
  const data = await res.json();
  return {
    ...data,
    cached: res.headers.get('X-Cache') === 'HIT',
    idempotencyKey: res.headers.get('X-Idempotency-Key')
  };
}

export async function simulatePayment(paymentData) {
  const res = await fetch(`${BASE_URL}/payments/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });
  return res.json();
}

export async function fetchOrders() {
  const res = await fetch(`${BASE_URL}/orders`);
  return res.json();
}

export async function fetchPayments() {
  const res = await fetch(`${BASE_URL}/payments`);
  return res.json();
}

export async function fetchLedger() {
  const res = await fetch(`${BASE_URL}/ledger`);
  return res.json();
}

export async function fetchWebhooks() {
  const res = await fetch(`${BASE_URL}/webhooks`);
  return res.json();
}

export async function toggleChaosMode(params) {
  const res = await fetch(`${BASE_URL}/chaos/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return res.json();
}

export async function runReconciliation(ledger_records, settlement_records) {
  const res = await fetch(`${BASE_URL}/reconcile/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ledger_records, settlement_records })
  });
  return res.json();
}

export async function generateDisputePacket(disputeData) {
  const res = await fetch(`${BASE_URL}/disputes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(disputeData)
  });
  return res.json();
}

export async function generateDeclineRecovery(declineData) {
  const res = await fetch(`${BASE_URL}/decline-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(declineData)
  });
  return res.json();
}
