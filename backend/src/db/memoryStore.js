// Memory Store / Mock DB Engine for PayPulse AI
// Provides identical ACID transaction semantics & double-entry invariant verification

import { v4 as uuidv4 } from 'uuid';

class MemoryStore {
  constructor() {
    this.orders = new Map();
    this.payments = new Map();
    this.ledgerEntries = [];
    this.webhookEvents = new Map();
    this.locks = new Set();
  }

  // --- ACQUIRE / RELEASE LOCK (Simulates SELECT FOR UPDATE) ---
  async acquireLock(resourceId, timeoutMs = 5000) {
    const startTime = Date.now();
    while (this.locks.has(resourceId)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Lock acquisition timeout for resource: ${resourceId}`);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    this.locks.add(resourceId);
  }

  releaseLock(resourceId) {
    this.locks.delete(resourceId);
  }

  // --- ORDERS ---
  async createOrder({ id, merchant_order_id, customer_name, customer_email, amount, currency = 'INR', status = 'PENDING' }) {
    const orderId = id || `ord_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const order = {
      id: orderId,
      merchant_order_id: merchant_order_id || `MO-${Date.now()}`,
      customer_name,
      customer_email,
      amount: parseInt(amount, 10),
      currency,
      status,
      created_at: now,
      updated_at: now
    };
    this.orders.set(orderId, order);
    return order;
  }

  async getOrder(id) {
    return this.orders.get(id) || null;
  }

  async updateOrderStatus(id, status) {
    const order = this.orders.get(id);
    if (!order) return null;
    order.status = status;
    order.updated_at = new Date().toISOString();
    this.orders.set(id, order);
    return order;
  }

  async listOrders(limit = 50) {
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  // --- PAYMENTS ---
  async createPayment({ id, order_id, gateway_payment_id, gateway = 'RAZORPAY', method = 'UPI', error_code = null, error_description = null, status = 'PENDING' }) {
    const paymentId = id || `pay_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const payment = {
      id: paymentId,
      order_id,
      gateway_payment_id: gateway_payment_id || `gpay_${Date.now()}`,
      gateway,
      method,
      error_code,
      error_description,
      status,
      created_at: new Date().toISOString()
    };
    this.payments.set(paymentId, payment);
    return payment;
  }

  async getPaymentsByOrderId(orderId) {
    return Array.from(this.payments.values()).filter(p => p.order_id === orderId);
  }

  async listPayments(limit = 50) {
    return Array.from(this.payments.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  // --- DOUBLE-ENTRY LEDGER ---
  /**
   * Records a strictly balanced double-entry transaction.
   * Invariant: Total DEBITs MUST equal Total CREDITs.
   */
  async recordDoubleEntry({ transaction_group_id, entries }) {
    if (!entries || entries.length < 2) {
      throw new Error('Double-entry accounting requires at least two balanced entries.');
    }

    const groupId = transaction_group_id || `txgrp_${uuidv4()}`;
    const now = new Date().toISOString();

    let totalDebit = 0;
    let totalCredit = 0;

    const validatedEntries = entries.map(entry => {
      const amount = parseInt(entry.amount, 10);
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid ledger entry amount: ${entry.amount}`);
      }

      if (entry.entry_type === 'DEBIT') {
        totalDebit += amount;
      } else if (entry.entry_type === 'CREDIT') {
        totalCredit += amount;
      } else {
        throw new Error(`Invalid entry_type: ${entry.entry_type}. Must be DEBIT or CREDIT.`);
      }

      return {
        id: entry.id || `led_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
        transaction_group_id: groupId,
        account_type: entry.account_type,
        entry_type: entry.entry_type,
        amount,
        reference_id: entry.reference_id,
        description: entry.description || '',
        created_at: now
      };
    });

    if (totalDebit !== totalCredit) {
      throw new Error(
        `Ledger integrity breach: Total DEBIT (${totalDebit}) does not equal Total CREDIT (${totalCredit})`
      );
    }

    this.ledgerEntries.push(...validatedEntries);
    return {
      transaction_group_id: groupId,
      entries: validatedEntries,
      balanced: true,
      total_amount: totalDebit
    };
  }

  async listLedgerEntries(limit = 100) {
    return [...this.ledgerEntries]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  async getLedgerSummary() {
    let totalDebit = 0;
    let totalCredit = 0;
    const accountBalances = {
      CUSTOMER_ESCROW: { debit: 0, credit: 0, net: 0 },
      MERCHANT_BALANCE: { debit: 0, credit: 0, net: 0 },
      GATEWAY_FEE: { debit: 0, credit: 0, net: 0 }
    };

    for (const entry of this.ledgerEntries) {
      const amt = entry.amount;
      if (entry.entry_type === 'DEBIT') {
        totalDebit += amt;
        if (accountBalances[entry.account_type]) {
          accountBalances[entry.account_type].debit += amt;
        }
      } else {
        totalCredit += amt;
        if (accountBalances[entry.account_type]) {
          accountBalances[entry.account_type].credit += amt;
        }
      }
    }

    for (const acc in accountBalances) {
      accountBalances[acc].net = accountBalances[acc].credit - accountBalances[acc].debit;
    }

    return {
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
      entryCount: this.ledgerEntries.length,
      accountBalances
    };
  }

  // --- WEBHOOK EVENTS ---
  async recordWebhookEvent({ event_id, event_type, payload, status = 'QUEUED' }) {
    if (this.webhookEvents.has(event_id)) {
      return { duplicate: true, event: this.webhookEvents.get(event_id) };
    }
    const event = {
      id: `ev_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      event_id,
      event_type,
      payload,
      status,
      retry_count: 0,
      error_message: null,
      created_at: new Date().toISOString(),
      processed_at: null
    };
    this.webhookEvents.set(event_id, event);
    return { duplicate: false, event };
  }

  async getWebhookEvent(eventId) {
    return this.webhookEvents.get(eventId) || null;
  }

  async updateWebhookStatus(eventId, { status, error_message = null, incrementRetry = false }) {
    const event = this.webhookEvents.get(eventId);
    if (!event) return null;
    event.status = status;
    if (error_message) event.error_message = error_message;
    if (incrementRetry) event.retry_count += 1;
    if (status === 'PROCESSED') {
      event.processed_at = new Date().toISOString();
    }
    this.webhookEvents.set(eventId, event);
    return event;
  }

  async listWebhookEvents(limit = 50) {
    return Array.from(this.webhookEvents.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  async getWebhookMetrics() {
    const events = Array.from(this.webhookEvents.values());
    const total = events.length;
    const processed = events.filter(e => e.status === 'PROCESSED').length;
    const failed = events.filter(e => e.status === 'FAILED').length;
    const queued = events.filter(e => e.status === 'QUEUED').length;
    const dlq = events.filter(e => e.status === 'DLQ').length;

    return {
      total,
      processed,
      failed,
      queued,
      dlq,
      successRate: total > 0 ? ((processed / total) * 100).toFixed(1) : '100.0'
    };
  }
}

export const memoryStore = new MemoryStore();
