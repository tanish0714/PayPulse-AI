# PayPulse AI — Autonomous Payment Ledger, Reconciliation & Dispute Resolution Engine

<div align="center">

![PayPulse AI Banner](https://img.shields.io/badge/PayPulse-Autonomous_Fintech_Engine-1D4ED8?style=for-the-badge&logo=shield)
![Node](https://img.shields.io/badge/Node.js-v22+-339933?style=for-the-badge&logo=node.js)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?style=for-the-badge&logo=google)

**An enterprise-grade, full-stack fintech platform combining double-entry immutable accounting, BullMQ async webhook ingestion with Dead Letter Queues (DLQ), Redis idempotency, chaos engineering, and Google Gemini-driven autonomous reconciliation and dispute defense.**

</div>

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["🖥️ Frontend Client (React 18 + Vite + Tailwind CSS)"]
        UI["Fintech Console UI"]
        SimModal["Test Checkout Simulator"]
        LedgerExp["Double-Entry Explorer"]
        ChaosMon["Webhook & Chaos Monitor"]
        AIHub["AI Reconciliation & Dispute Center"]
    end

    subgraph BackendLayer["⚡ Core Backend (Node.js + Express)"]
        API["Express REST API (:5000)"]
        IdemMiddleware["Redis Idempotency Guard (24h TTL)"]
        HMACVerifier["HMAC-SHA256 Webhook Verifier"]
        ChaosEngine["Chaos Simulator (500s / Latency / Duplicates)"]
        RazorpaySDK["Razorpay SDK / Mock Gateway Provider"]
    end

    subgraph AsyncPipeline["🔄 Async Queue Pipeline (BullMQ + Redis)"]
        BullQueue[("BullMQ Webhook Queue")]
        BullWorker["ACID Webhook Worker (BEGIN ... COMMIT)"]
        DLQueue[("Dead Letter Queue (DLQ)")]
    end

    subgraph DataLayer["💾 Persistence Layer (PostgreSQL)"]
        OrdersTab[("orders (Status, Amount, Currency)")]
        PaymentsTab[("payments (Method, Errors, Status)")]
        LedgerTab[("ledger_entries (DEBIT == CREDIT)")]
        WebhooksTab[("webhook_events (Event ID, Status, Retries)")]
    end

    subgraph AIServiceLayer["🧠 AI Microservice (Python + FastAPI + Gemini)"]
        FastAPIApp["FastAPI Server (:8000)"]
        ReconEngine["Deterministic Math Reconciliation Engine"]
        DisputeEngine["Chargeback Defense Packet Generator"]
        DeclineEngine["Smart Decline Recovery Engine"]
        GeminiClient["Google Gemini API (gemini-2.5-flash)"]
    end

    %% Client to Backend
    UI -->|API Requests| API
    SimModal -->|POST /api/orders/create (Idempotency-Key)| IdemMiddleware
    IdemMiddleware --> API
    SimModal -->|POST /api/payments/simulate| API
    API -->|HMAC Webhook| HMACVerifier

    %% Backend to Gateway & Queues
    API --> RazorpaySDK
    HMACVerifier -->|Enqueue Event| BullQueue
    BullQueue --> BullWorker
    BullWorker -->|Max Retries (3) Exceeded| DLQueue
    ChaosEngine -.->|Injects Failure / Delay| BullWorker

    %% Worker to Database
    BullWorker -->|ACID Balanced Ledger Posting| LedgerTab
    BullWorker -->|Update Order Status| OrdersTab
    BullWorker -->|Update Webhook Status| WebhooksTab
    API --> PaymentsTab

    %% Backend to AI Service
    API -->|Proxy POST /api/reconcile/run| ReconEngine
    API -->|Proxy POST /api/disputes/generate| DisputeEngine
    API -->|Proxy POST /api/decline-recovery| DeclineEngine

    %% AI Service to Gemini
    ReconEngine -->|Discrepancy Analysis| GeminiClient
    DisputeEngine -->|3DS2 Rebuttal Drafting| GeminiClient
    DeclineEngine -->|Recovery Routing| GeminiClient
```

---

## 🌟 Key Capabilities & Technical Highlights

### 1. Immutable Double-Entry Ledger Engine
* **Mathematical Accounting Invariant**: Enforces `SUM(DEBIT) == SUM(CREDIT)` across all financial economic events.
* **Three Canonical Account Types**:
  * `CUSTOMER_ESCROW`: Debited when funds are captured from the buyer.
  * `MERCHANT_BALANCE`: Credited with net settlement revenue.
  * `GATEWAY_FEE`: Credited with merchant discount rate (MDR: 2.36% + GST).
* **Transaction Groups**: Every payment event generates paired, balanced rows tied to an immutable `transaction_group_id`.

### 2. High-Throughput Webhook Ingestion & Redis Idempotency
* **HMAC-SHA256 Signature Verification**: Cryptographically validates webhook signatures using `x-razorpay-signature` against raw request buffers to prevent spoofing.
* **Redis Idempotency Guard**:
  * Incoming checkout orders and webhooks are validated against Redis keys with 24-hour TTL.
  * Duplicate requests return cached responses with `X-Cache: HIT` without re-executing charges or ledger postings.
* **Immediate 200 OK Return**: Returns `200 OK` to the payment gateway within 50ms, pushing payload to BullMQ for non-blocking asynchronous processing.

### 3. BullMQ Worker with Exponential Backoff & Dead Letter Queue (DLQ)
* **ACID Transactions**: Webhooks are processed inside strict database transactions (`BEGIN` ... `SELECT FOR UPDATE` ... `COMMIT`).
* **Exponential Backoff**: Transient errors are retried up to 3 times with exponential backoff (`delay = 2^attempt * 1000ms`).
* **Dead Letter Queue (DLQ)**: Poison-pill or permanently failing jobs are automatically quarantined into the DLQ with full error stacks for human investigation.

### 4. Interactive Chaos Engineering Simulator
* **Live Fault Injection**:
  * **Duplicate Webhooks**: Simulates gateway network retries to test Redis idempotency live.
  * **3-Second Latency**: Tests async non-blocking execution under heavy pipeline load.
  * **Transient 500 Errors**: Triggers retries and DLQ dead lettering live on the dashboard.

### 5. Google Gemini AI Autonomous Financial Intelligence
* **Zero-Hallucination Reconciliation**:
  * Computes exact, paise-accurate mathematical differences between internal ledger entries and gateway settlement reports.
  * Invokes Google Gemini to diagnose operational root-causes (e.g., MDR fee recalculation, timezone cutoff, unrecorded webhook) and recommend corrective double-entry journal postings.
* **Chargeback Rebuttal Letter Generator**:
  * Evaluates order metadata, customer IP/device fingerprint, and 3D-Secure 2.0 cryptographic tokens (CAVV/ECI 05 liability shift).
  * Generates bank-ready formal rebuttal letters adhering to Visa/Mastercard Core Rules with evidence checklists and win-rate scores.
* **Smart Decline Recovery**:
  * Interprets raw bank decline codes (`ERR_U16`, `RISK_BLOCK`, `ISSUER_DOWN`, `INSUFFICIENT_FUNDS`).
  * Emits plain-English customer explanations and automated multichannel recovery strategies (UPI intent links, WhatsApp retry links, EMI fallbacks).
* **Deterministic Offline Fallbacks**: If `GEMINI_API_KEY` is not provided, built-in deterministic algorithms take over seamlessly so the platform never crashes.

### 6. Crisp White-and-Royal-Blue Fintech Frontend
* **Design System**: Inspired by Stripe and RazorpayX with crisp typography (`Inter` and `JetBrains Mono`), `#F8FAFC` slate backgrounds, `#1D4ED8` royal blue accents, and subtle borders.
* **Framer Motion**: Smooth page transitions, animated KPI counters, layout drawers, and real-time execution progress logs.

---

## 📁 Repository Structure

```
PayPulse AI/
├── backend/                  # Node.js + Express.js Service
│   ├── src/
│   │   ├── db/               # PostgreSQL schema, migrations & seed
│   │   │   ├── schema.sql    # DDL for orders, payments, ledger, webhooks
│   │   │   ├── migrate.js    # Migration runner
│   │   │   ├── seed.js       # Realistic seed data
│   │   │   ├── memoryStore.js# In-memory ACID double-entry fallback store
│   │   │   └── index.js      # Unified database client
│   │   ├── middleware/       # Redis Idempotency middleware
│   │   ├── routes/           # REST endpoints & AI service proxies
│   │   ├── services/
│   │   │   ├── redisClient.js# Redis client + in-memory fallback
│   │   │   ├── gatewayService.js # Razorpay SDK + mock gateway + HMAC
│   │   │   ├── queueService.js   # BullMQ worker + DLQ manager
│   │   │   └── chaosService.js   # Chaos engineering simulator
│   │   └── server.js         # Express app entrypoint
│   ├── .env.example
│   └── package.json
│
├── ai-service/               # Python + FastAPI AI Microservice
│   ├── services/
│   │   ├── gemini_client.py  # Google Gemini client manager
│   │   ├── reconciliation.py # Deterministic matching + Gemini diagnosis
│   │   ├── dispute.py        # Chargeback rules + rebuttal generator
│   │   └── decline_recovery.py # Bank code interpreter & recovery
│   ├── main.py               # FastAPI application & Pydantic schemas
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                 # React.js + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Header, Sidebar, KpiCard, SimulatorModal
│   │   ├── views/            # Overview, Ledger, Webhooks/Chaos, AI Center
│   │   ├── services/         # API client
│   │   ├── App.jsx           # Master application container
│   │   ├── index.css         # Tailwind directives & scrollbar styling
│   │   └── main.jsx
│   ├── .env.example
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
├── package.json              # Monorepo root scripts
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **Python**: v3.10 or higher (v3.11/3.13 tested)
- **PostgreSQL & Redis**: (Optional) The engine includes automatic in-memory fallbacks for both PostgreSQL and Redis, allowing instant out-of-the-box operation even without external daemon setup!

---

### Step 1: Install Dependencies

From the repository root:
```bash
# 1. Install root dependencies
npm install

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Install AI service dependencies
cd ../ai-service
pip install -r requirements.txt
cd ..
```

---

### Step 2: Configure Environment Variables

#### Backend (`/backend/.env`)
```ini
PORT=5000
NODE_ENV=development

# PostgreSQL (Leave default or connect your live Postgres)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paypulse_ai
FORCE_MEMORY_DB=false

# Redis (Leave default or connect your live Redis)
REDIS_URL=redis://localhost:6379
FORCE_MEMORY_REDIS=false

# Razorpay Keys (Mock mode active by default)
RAZORPAY_KEY_ID=rzp_test_mock_paypulse
RAZORPAY_KEY_SECRET=mock_secret_key_paypulse_12345
RAZORPAY_WEBHOOK_SECRET=paypulse_webhook_secret_hmac_256

# AI Microservice URL
AI_SERVICE_URL=http://localhost:8000
```

#### AI Microservice (`/ai-service/.env`)
```ini
PORT=8000
HOST=0.0.0.0

# Optional: Provide Google Gemini API Key for live AI generation
# (If blank, high-fidelity deterministic fintech reasoning fallbacks run automatically)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

#### Frontend (`/frontend/.env`)
```ini
VITE_API_BASE_URL=/api
```

---

### Step 3: Run the Services Concurrently

Open three terminal windows (or run via background processes):

#### Terminal 1 — Backend Service (Port 5000):
```bash
cd backend
npm run dev
```

#### Terminal 2 — AI Microservice (Port 8000):
```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

#### Terminal 3 — Frontend Dashboard (Port 5173):
```bash
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5173`** to access the PayPulse AI Dashboard!

---

## 🧪 Verification & Feature Walkthrough

### 1. Test Checkout Simulator
1. Click the **"Test Checkout Simulator"** button in the header.
2. Select **"✅ Payment Success"** and click **"Trigger Live Simulation"**.
3. Watch the terminal logs verify:
   - Order created with unique `Idempotency-Key`.
   - Gateway payment capture response received.
   - HMAC-SHA256 signature generated and verified.
   - BullMQ worker executes atomic double-entry ledger debit & credit postings.
4. Click **"Simulate Another"**, leave the **same** idempotency key, and submit again. Observe the `200 OK (X-Cache: HIT)` instant return from Redis without duplicate charging!

### 2. Double-Entry Accounting Proof
1. Navigate to the **"Double-Entry Ledger"** tab.
2. Verify the **Parity Invariant Banner**: `Total DEBITS == Total CREDITS`.
3. Inspect grouped transaction rows showing the three balanced legs (`CUSTOMER_ESCROW`, `MERCHANT_BALANCE`, and `GATEWAY_FEE`).

### 3. Chaos Mode & Dead Letter Queue (DLQ)
1. Navigate to the **"Webhooks & Chaos"** tab.
2. Toggle **Chaos Mode: ON**.
3. Trigger a simulation with a failed bank scenario (e.g. `FAILED_U16`).
4. Observe exponential retry attempts and eventual routing to the **Dead Letter Queue (DLQ)**.

### 4. AI Reconciliation & Dispute Defense
1. Navigate to the **"AI Reconciliation & Disputes"** tab.
2. Click **"Run AI Reconciliation"** to execute mathematical discrepancy matching followed by Gemini root-cause diagnosis.
3. Switch to the **"Chargeback Defense Packet Generator"** tab and click **"Generate Defense Packet"** to view and copy a formal dispute rebuttal letter complete with 3D-Secure 2.0 evidence checklists and win-probability scores.
4. Switch to the **"Smart Decline Recovery Engine"** tab to test recovery pathways for bank error codes like `ERR_U16` and `RISK_BLOCK`.

---

## 📜 Git Commit History Verification

This repository strictly adheres to conventional atomic commits:
```
1. chore: initialize monorepo structure and gitignore
2. feat(db): add postgresql schema for orders, payments, double-entry ledger, and webhook logs
3. feat(backend): implement express server, payment creation, hmac webhook verification, and redis idempotency
4. feat(backend): add bullmq async worker, dead letter queue, and chaos simulator
5. feat(ai): build fastapi service for reconciliation analysis, chargeback rebuttal generation, and smart decline recovery
6. feat(frontend): build responsive white-and-blue fintech dashboard with framer motion
7. docs: add comprehensive architecture diagram and setup guide in README
```

---

## ⚖️ License
MIT License. Built for production fintech resilience and autonomous financial operations.
