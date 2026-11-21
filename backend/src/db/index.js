// Database connection manager for PayPulse AI
// Supports real PostgreSQL via 'pg' with fallback to in-memory ACID store

import pg from 'pg';
import dotenv from 'dotenv';
import { memoryStore } from './memoryStore.js';

dotenv.config();

const { Pool } = pg;

let pool = null;
let usePostgres = false;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paypulse_ai';

export async function initDb() {
  if (process.env.FORCE_MEMORY_DB === 'true') {
    console.log('[DB] FORCE_MEMORY_DB enabled. Using in-memory ACID ledger store.');
    usePostgres = false;
    return;
  }

  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 30000,
      max: 20
    });

    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    usePostgres = true;
    console.log(`[DB] Connected to PostgreSQL at ${DATABASE_URL.split('@')[1] || 'localhost'}. Server time:`, res.rows[0].now);
  } catch (err) {
    console.warn(`[DB] PostgreSQL not reachable (${err.message}). Seamlessly running on ACID In-Memory Ledger Engine.`);
    usePostgres = false;
  }
}

export function isUsingPostgres() {
  return usePostgres;
}

export async function query(text, params) {
  if (usePostgres && pool) {
    return pool.query(text, params);
  }
  return null;
}

// Universal database interface
export const db = {
  isPostgres: () => usePostgres,

  orders: {
    async create(data) {
      if (usePostgres && pool) {
        const id = data.id || `ord_${Date.now()}`;
        const res = await pool.query(
          `INSERT INTO orders (id, merchant_order_id, customer_name, customer_email, amount, currency, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [id, data.merchant_order_id, data.customer_name, data.customer_email, data.amount, data.currency || 'INR', data.status || 'PENDING']
        );
        return res.rows[0];
      }
      return memoryStore.createOrder(data);
    },

    async findById(id) {
      if (usePostgres && pool) {
        const res = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        return res.rows[0] || null;
      }
      return memoryStore.getOrder(id);
    },

    async updateStatus(id, status) {
      if (usePostgres && pool) {
        const res = await pool.query(
          'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [status, id]
        );
        return res.rows[0] || null;
      }
      return memoryStore.updateOrderStatus(id, status);
    },

    async list(limit = 50) {
      if (usePostgres && pool) {
        const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1', [limit]);
        return res.rows;
      }
      return memoryStore.listOrders(limit);
    }
  },

  payments: {
    async create(data) {
      if (usePostgres && pool) {
        const id = data.id || `pay_${Date.now()}`;
        const res = await pool.query(
          `INSERT INTO payments (id, order_id, gateway_payment_id, gateway, method, error_code, error_description, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [id, data.order_id, data.gateway_payment_id, data.gateway || 'RAZORPAY', data.method || 'UPI', data.error_code, data.error_description, data.status || 'PENDING']
        );
        return res.rows[0];
      }
      return memoryStore.createPayment(data);
    },

    async findByOrderId(orderId) {
      if (usePostgres && pool) {
        const res = await pool.query('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC', [orderId]);
        return res.rows;
      }
      return memoryStore.getPaymentsByOrderId(orderId);
    },

    async list(limit = 50) {
      if (usePostgres && pool) {
        const res = await pool.query('SELECT * FROM payments ORDER BY created_at DESC LIMIT $1', [limit]);
        return res.rows;
      }
      return memoryStore.listPayments(limit);
    }
  },

  ledger: {
    async recordDoubleEntry({ transaction_group_id, entries }) {
      if (usePostgres && pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          let totalDebit = 0;
          let totalCredit = 0;
          for (const entry of entries) {
            const amt = parseInt(entry.amount, 10);
            if (entry.entry_type === 'DEBIT') totalDebit += amt;
            else if (entry.entry_type === 'CREDIT') totalCredit += amt;
          }
          if (totalDebit !== totalCredit) {
            throw new Error(`Ledger integrity breach: Total DEBIT (${totalDebit}) does not equal Total CREDIT (${totalCredit})`);
          }

          const savedEntries = [];
          for (const entry of entries) {
            const entryId = entry.id || `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const res = await client.query(
              `INSERT INTO ledger_entries (id, transaction_group_id, account_type, entry_type, amount, reference_id, description)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
              [entryId, transaction_group_id, entry.account_type, entry.entry_type, parseInt(entry.amount, 10), entry.reference_id, entry.description || '']
            );
            savedEntries.push(res.rows[0]);
          }
          await client.query('COMMIT');
          return { transaction_group_id, entries: savedEntries, balanced: true, total_amount: totalDebit };
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
      return memoryStore.recordDoubleEntry({ transaction_group_id, entries });
    },

    async list(limit = 100) {
      if (usePostgres && pool) {
        const res = await pool.query('SELECT * FROM ledger_entries ORDER BY created_at DESC LIMIT $1', [limit]);
        return res.rows;
      }
      return memoryStore.listLedgerEntries(limit);
    },

    async getSummary() {
      if (usePostgres && pool) {
        const res = await pool.query(`
          SELECT 
            account_type, 
            entry_type, 
            SUM(amount) as sum_amount, 
            COUNT(*) as count
          FROM ledger_entries 
          GROUP BY account_type, entry_type
        `);
        let totalDebit = 0;
        let totalCredit = 0;
        const accountBalances = {
          CUSTOMER_ESCROW: { debit: 0, credit: 0, net: 0 },
          MERCHANT_BALANCE: { debit: 0, credit: 0, net: 0 },
          GATEWAY_FEE: { debit: 0, credit: 0, net: 0 }
        };

        for (const row of res.rows) {
          const amt = parseInt(row.sum_amount, 10);
          if (row.entry_type === 'DEBIT') {
            totalDebit += amt;
            if (accountBalances[row.account_type]) accountBalances[row.account_type].debit += amt;
          } else {
            totalCredit += amt;
            if (accountBalances[row.account_type]) accountBalances[row.account_type].credit += amt;
          }
        }
        for (const acc in accountBalances) {
          accountBalances[acc].net = accountBalances[acc].credit - accountBalances[acc].debit;
        }

        const countRes = await pool.query('SELECT COUNT(*) as count FROM ledger_entries');
        return {
          totalDebit,
          totalCredit,
          isBalanced: totalDebit === totalCredit,
          entryCount: parseInt(countRes.rows[0].count, 10),
          accountBalances
        };
      }
      return memoryStore.getLedgerSummary();
    }
  },

  webhooks: {
    async record({ event_id, event_type, payload, status = 'QUEUED' }) {
      if (usePostgres && pool) {
        try {
          const id = `ev_${Date.now()}`;
          const res = await pool.query(
            `INSERT INTO webhook_events (id, event_id, event_type, payload, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, event_id, event_type, JSON.stringify(payload), status]
          );
          return { duplicate: false, event: res.rows[0] };
        } catch (err) {
          if (err.code === '23505') { // unique violation
            const existing = await pool.query('SELECT * FROM webhook_events WHERE event_id = $1', [event_id]);
            return { duplicate: true, event: existing.rows[0] };
          }
          throw err;
        }
      }
      return memoryStore.recordWebhookEvent({ event_id, event_type, payload, status });
    },

    async updateStatus(eventId, { status, error_message = null, incrementRetry = false }) {
      if (usePostgres && pool) {
        const query = `
          UPDATE webhook_events
          SET status = $1,
              error_message = COALESCE($2, error_message),
              retry_count = retry_count + $3,
              processed_at = CASE WHEN $1 = 'PROCESSED' THEN CURRENT_TIMESTAMP ELSE processed_at END
          WHERE event_id = $4
          RETURNING *
        `;
        const res = await pool.query(query, [status, error_message, incrementRetry ? 1 : 0, eventId]);
        return res.rows[0] || null;
      }
      return memoryStore.updateWebhookStatus(eventId, { status, error_message, incrementRetry });
    },

    async list(limit = 50) {
      if (usePostgres && pool) {
        const res = await pool.query('SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT $1', [limit]);
        return res.rows;
      }
      return memoryStore.listWebhookEvents(limit);
    },

    async getMetrics() {
      if (usePostgres && pool) {
        const res = await pool.query(`
          SELECT 
            status, 
            COUNT(*) as count 
          FROM webhook_events 
          GROUP BY status
        `);
        let total = 0, processed = 0, failed = 0, queued = 0, dlq = 0;
        for (const row of res.rows) {
          const count = parseInt(row.count, 10);
          total += count;
          if (row.status === 'PROCESSED') processed = count;
          else if (row.status === 'FAILED') failed = count;
          else if (row.status === 'QUEUED') queued = count;
          else if (row.status === 'DLQ') dlq = count;
        }
        return {
          total,
          processed,
          failed,
          queued,
          dlq,
          successRate: total > 0 ? ((processed / total) * 100).toFixed(1) : '100.0'
        };
      }
      return memoryStore.getWebhookMetrics();
    }
  }
};
