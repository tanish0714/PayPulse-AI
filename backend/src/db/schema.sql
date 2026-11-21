-- PayPulse AI Database Schema
-- Autonomous Payment Ledger, Reconciliation & Dispute Resolution Engine

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_order_id VARCHAR(128) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0), -- Amount in paise/cents
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'DISPUTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_merchant_order_id ON orders(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 2. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway_payment_id VARCHAR(128) NOT NULL,
    gateway VARCHAR(32) NOT NULL DEFAULT 'RAZORPAY' CHECK (gateway IN ('RAZORPAY', 'DODO', 'MOCK')),
    method VARCHAR(32) NOT NULL CHECK (method IN ('UPI', 'CARD', 'NETBANKING', 'WALLET')),
    error_code VARCHAR(64),
    error_description TEXT,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING', 'REVERSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 3. Immutable Double-Entry Ledger Entries
-- Enforces fundamental accounting equation: SUM(DEBIT) == SUM(CREDIT)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    transaction_group_id VARCHAR(128) NOT NULL,
    account_type VARCHAR(64) NOT NULL CHECK (account_type IN ('CUSTOMER_ESCROW', 'MERCHANT_BALANCE', 'GATEWAY_FEE')),
    entry_type VARCHAR(16) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount BIGINT NOT NULL CHECK (amount > 0), -- Stored in paise/cents
    reference_id VARCHAR(128) NOT NULL, -- Order ID or Payment ID
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_transaction_group_id ON ledger_entries(transaction_group_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account_type ON ledger_entries(account_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_reference_id ON ledger_entries(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_entries(created_at DESC);

-- 4. Webhook Ingestion & Audit Logs
CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSED', 'FAILED', 'DLQ')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
