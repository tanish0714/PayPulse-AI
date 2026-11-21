// Main Express Server for PayPulse AI
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/index.js';
import { seedSampleData } from './db/seed.js';
import { initRedis } from './services/redisClient.js';
import { router as apiRouter, setQueueManager } from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (port 5173 / localhost)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Idempotency-Key', 'x-razorpay-signature']
}));

// Webhook raw-body preservation for HMAC verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'PayPulse AI Backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    isChaos: err.isChaos || false
  });
});

// Server Initialization
export async function startServer() {
  await initDb();
  await initRedis();
  await seedSampleData();

  // Lazy-load queue service if available
  try {
    const { queueService } = await import('./services/queueService.js');
    setQueueManager(queueService);
    console.log('[Server] BullMQ & Queue Manager linked to routes.');
  } catch (err) {
    console.warn('[Server] Queue manager not loaded yet:', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 PayPulse AI Backend running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Dashboard Metrics: http://localhost:${PORT}/api/dashboard/metrics`);
    console.log(`=======================================================`);
  });

  return { app, server };
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}
