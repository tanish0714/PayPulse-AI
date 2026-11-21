// Realistic sample data seeder for PayPulse AI
import { db } from './index.js';

export async function seedSampleData() {
  console.log('[Seed] Seeding realistic sample fintech data...');

  // 1. Order 1 - Paid UPI transaction (₹2,499.00 -> 249900 paise)
  const ord1 = await db.orders.create({
    id: 'ord_demo_101',
    merchant_order_id: 'MO-2026-9041',
    customer_name: 'Aditya Sharma',
    customer_email: 'aditya.sharma@example.com',
    amount: 249900,
    currency: 'INR',
    status: 'PAID'
  });

  const pay1 = await db.payments.create({
    id: 'pay_demo_101',
    order_id: ord1.id,
    gateway_payment_id: 'pay_razor_991823',
    gateway: 'RAZORPAY',
    method: 'UPI',
    status: 'SUCCESS'
  });

  // Balanced double-entry for ord1:
  // Gateway Fee: 2% + 18% GST = ~₹58.98 -> 5898 paise
  // Merchant Net: 244002 paise
  // Total Escrow Debit = 249900 paise == Total Credits
  await db.ledger.recordDoubleEntry({
    transaction_group_id: 'txgrp_settle_101',
    entries: [
      {
        account_type: 'CUSTOMER_ESCROW',
        entry_type: 'DEBIT',
        amount: 249900,
        reference_id: pay1.id,
        description: 'Customer payment received via UPI'
      },
      {
        account_type: 'MERCHANT_BALANCE',
        entry_type: 'CREDIT',
        amount: 244002,
        reference_id: ord1.id,
        description: 'Net merchant payout allocation'
      },
      {
        account_type: 'GATEWAY_FEE',
        entry_type: 'CREDIT',
        amount: 5898,
        reference_id: pay1.id,
        description: 'Razorpay 2.36% MDR + GST fee'
      }
    ]
  });

  // Webhook for ord1
  await db.webhooks.record({
    event_id: 'evt_rzp_order_paid_101',
    event_type: 'payment.captured',
    payload: {
      entity: 'event',
      account_id: 'acc_paypulse_demo',
      event: 'payment.captured',
      payload: { payment: { entity: pay1 }, order: { entity: ord1 } }
    },
    status: 'PROCESSED'
  });

  // 2. Order 2 - High Value Card Payment (₹14,999.00 -> 1499900 paise)
  const ord2 = await db.orders.create({
    id: 'ord_demo_102',
    merchant_order_id: 'MO-2026-9042',
    customer_name: 'Priya Mukherjee',
    customer_email: 'priya.m@techcorp.in',
    amount: 1499900,
    currency: 'INR',
    status: 'PAID'
  });

  const pay2 = await db.payments.create({
    id: 'pay_demo_102',
    order_id: ord2.id,
    gateway_payment_id: 'pay_razor_991824',
    gateway: 'RAZORPAY',
    method: 'CARD',
    status: 'SUCCESS'
  });

  await db.ledger.recordDoubleEntry({
    transaction_group_id: 'txgrp_settle_102',
    entries: [
      {
        account_type: 'CUSTOMER_ESCROW',
        entry_type: 'DEBIT',
        amount: 1499900,
        reference_id: pay2.id,
        description: 'Visa Platinum Card settlement'
      },
      {
        account_type: 'MERCHANT_BALANCE',
        entry_type: 'CREDIT',
        amount: 1464502,
        reference_id: ord2.id,
        description: 'Merchant balance credit after MDR'
      },
      {
        account_type: 'GATEWAY_FEE',
        entry_type: 'CREDIT',
        amount: 35398,
        reference_id: pay2.id,
        description: 'Credit Card Interchange + Processing Fee'
      }
    ]
  });

  await db.webhooks.record({
    event_id: 'evt_rzp_order_paid_102',
    event_type: 'payment.captured',
    payload: {
      entity: 'event',
      event: 'payment.captured',
      payload: { payment: { entity: pay2 }, order: { entity: ord2 } }
    },
    status: 'PROCESSED'
  });

  // 3. Order 3 - Disputed Chargeback Order (₹4,500.00 -> 450000 paise)
  const ord3 = await db.orders.create({
    id: 'ord_demo_103',
    merchant_order_id: 'MO-2026-9043',
    customer_name: 'Vikram Sethi',
    customer_email: 'vikram.sethi@gmail.com',
    amount: 450000,
    currency: 'INR',
    status: 'DISPUTED'
  });

  const pay3 = await db.payments.create({
    id: 'pay_demo_103',
    order_id: ord3.id,
    gateway_payment_id: 'pay_razor_991825',
    gateway: 'RAZORPAY',
    method: 'CARD',
    status: 'SUCCESS'
  });

  await db.ledger.recordDoubleEntry({
    transaction_group_id: 'txgrp_settle_103',
    entries: [
      {
        account_type: 'CUSTOMER_ESCROW',
        entry_type: 'DEBIT',
        amount: 450000,
        reference_id: pay3.id,
        description: 'Customer card debit under dispute'
      },
      {
        account_type: 'MERCHANT_BALANCE',
        entry_type: 'CREDIT',
        amount: 439380,
        reference_id: ord3.id,
        description: 'Held merchant balance'
      },
      {
        account_type: 'GATEWAY_FEE',
        entry_type: 'CREDIT',
        amount: 10620,
        reference_id: pay3.id,
        description: 'Interchange fee'
      }
    ]
  });

  // 4. Order 4 - Failed Bank Payment (U16 Insufficient Funds)
  const ord4 = await db.orders.create({
    id: 'ord_demo_104',
    merchant_order_id: 'MO-2026-9044',
    customer_name: 'Ananya Roy',
    customer_email: 'ananya.roy@outlook.com',
    amount: 185000,
    currency: 'INR',
    status: 'FAILED'
  });

  await db.payments.create({
    id: 'pay_demo_104',
    order_id: ord4.id,
    gateway_payment_id: 'pay_razor_failed_104',
    gateway: 'RAZORPAY',
    method: 'UPI',
    error_code: 'ERR_U16',
    error_description: 'Risk decline / insufficient balance at remitter bank',
    status: 'FAILED'
  });

  // 5. Queued and DLQ Webhook Events
  await db.webhooks.record({
    event_id: 'evt_rzp_dlq_example',
    event_type: 'payment.failed',
    payload: { payment_id: 'pay_demo_104', error: 'ERR_U16' },
    status: 'DLQ'
  });
  await db.webhooks.updateStatus('evt_rzp_dlq_example', {
    status: 'DLQ',
    error_message: 'Max retry attempts (3) exceeded: remitter bank connection timeout',
    incrementRetry: true
  });

  console.log('[Seed] Seed completed successfully!');
}
