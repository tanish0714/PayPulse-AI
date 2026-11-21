// BullMQ Async Queue Worker & Dead Letter Queue (DLQ) Manager
// Supports real Redis + BullMQ with seamless in-memory async fallback

import { Queue, Worker, QueueEvents } from 'bullmq';
import { db } from '../db/index.js';
import { getRedis, isUsingRealRedis } from './redisClient.js';
import { chaosService } from './chaosService.js';

const QUEUE_NAME = 'paypulse-webhook-queue';
const DLQ_NAME = 'paypulse-webhook-dlq';
const MAX_RETRIES = 3;

class QueueService {
  constructor() {
    this.bullQueue = null;
    this.bullWorker = null;
    this.bullDlq = null;
    this.isRealBullMQ = false;

    // In-memory fallback queue state
    this.memoryQueue = [];
    this.memoryDlq = [];
    this.isProcessing = false;

    this.init();
  }

  async init() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    if (isUsingRealRedis()) {
      try {
        const connection = { url: redisUrl, maxRetriesPerRequest: null };
        this.bullQueue = new Queue(QUEUE_NAME, { connection });
        this.bullDlq = new Queue(DLQ_NAME, { connection });

        this.bullWorker = new Worker(
          QUEUE_NAME,
          async (job) => {
            return this.processWebhookJob(job.data);
          },
          {
            connection,
            concurrency: 5,
            limiter: { max: 100, duration: 1000 }
          }
        );

        this.bullWorker.on('completed', (job) => {
          console.log(`[BullMQ] Webhook job ${job.id} (Event: ${job.data.eventId}) completed successfully.`);
        });

        this.bullWorker.on('failed', async (job, err) => {
          console.warn(`[BullMQ] Webhook job ${job.id} failed (Attempt ${job.attemptsMade}/${MAX_RETRIES}):`, err.message);
          if (job.attemptsMade >= MAX_RETRIES) {
            console.error(`[BullMQ] Job ${job.id} exceeded max retries. Moving to Dead Letter Queue (${DLQ_NAME}).`);
            await this.bullDlq.add('dead-letter', { ...job.data, error: err.message, failedAt: new Date().toISOString() });
            await db.webhooks.updateStatus(job.data.eventId, { status: 'DLQ', error_message: err.message, incrementRetry: true });
          }
        });

        this.isRealBullMQ = true;
        console.log('[QueueService] BullMQ real worker and DLQ initialized.');
        return;
      } catch (err) {
        console.warn('[QueueService] BullMQ failed to start on Redis. Defaulting to in-memory async engine.');
      }
    }

    // In-memory async worker fallback
    this.isRealBullMQ = false;
    this.startMemoryQueueWorker();
    console.log('[QueueService] In-Memory async queue worker and DLQ initialized.');
  }

  /**
   * Enqueues a webhook event
   */
  async enqueueWebhook({ eventId, eventType, payload, signature }) {
    // 1. Record webhook in DB as QUEUED
    await db.webhooks.record({
      event_id: eventId,
      event_type: eventType,
      payload,
      status: 'QUEUED'
    });

    const jobData = {
      eventId,
      eventType,
      payload,
      signature,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0
    };

    if (this.isRealBullMQ && this.bullQueue) {
      return this.bullQueue.add('process-webhook', jobData, {
        attempts: MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 1000,
        removeOnFail: 5000
      });
    }

    // Push to memory queue
    this.memoryQueue.push(jobData);
    return { id: `job_${Date.now()}`, data: jobData };
  }

  /**
   * Memory Worker Event Loop with exponential backoff & DLQ
   */
  startMemoryQueueWorker() {
    setInterval(async () => {
      if (this.isProcessing || this.memoryQueue.length === 0) return;

      this.isProcessing = true;
      const job = this.memoryQueue.shift();

      try {
        await this.processWebhookJob(job);
        console.log(`[MemoryQueue] Webhook ${job.eventId} processed successfully.`);
      } catch (err) {
        job.retryCount = (job.retryCount || 0) + 1;
        console.warn(`[MemoryQueue] Webhook ${job.eventId} failed (Attempt ${job.retryCount}/${MAX_RETRIES}): ${err.message}`);

        await db.webhooks.updateStatus(job.eventId, {
          status: 'FAILED',
          error_message: err.message,
          incrementRetry: true
        });

        if (job.retryCount < MAX_RETRIES) {
          // Exponential backoff delay
          const delay = Math.pow(2, job.retryCount) * 1000;
          setTimeout(() => {
            this.memoryQueue.push(job);
          }, delay);
        } else {
          // Move to DLQ
          console.error(`[MemoryQueue] Webhook ${job.eventId} moved to DEAD LETTER QUEUE (DLQ) after ${MAX_RETRIES} failures.`);
          this.memoryDlq.push({
            ...job,
            error: err.message,
            deadLetteredAt: new Date().toISOString()
          });
          await db.webhooks.updateStatus(job.eventId, {
            status: 'DLQ',
            error_message: `DLQ: ${err.message}`
          });
        }
      } finally {
        this.isProcessing = false;
      }
    }, 250);
  }

  /**
   * Core Webhook Job Processor with ACID Transaction & Double-Entry Ledger
   */
  async processWebhookJob(jobData) {
    const { eventId, eventType, payload } = jobData;

    // 1. Redis Idempotency Check
    const redis = getRedis();
    const processedFlag = await redis.get(`webhook:processed:${eventId}`);
    if (processedFlag) {
      console.log(`[Worker] Event ${eventId} already processed (Redis key present). Skipping.`);
      return { skipped: true, reason: 'ALREADY_PROCESSED' };
    }

    // 2. Chaos Engineering Injection (Tests retry + DLQ resilience)
    await chaosService.maybeInjectChaos('webhook_process');

    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const orderId = orderEntity?.id || paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    const amount = parseInt(paymentEntity?.amount || orderEntity?.amount || 0, 10);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (!orderId || !amount) {
        throw new Error(`Invalid payment payload: missing orderId (${orderId}) or amount (${amount})`);
      }

      // Calculate MDR Fee: 2% + 18% GST = 2.36%
      const gatewayFee = Math.max(Math.round(amount * 0.0236), 100); // min 100 paise
      const merchantNet = amount - gatewayFee;

      const txGroupId = `txgrp_${orderId.replace('ord_', '')}_${Date.now()}`;

      // ACID Double-Entry Transaction Execution
      console.log(`[Worker] Executing Double-Entry Ledger Posting for Order ${orderId}: Amount: ₹${amount / 100}, Fee: ₹${gatewayFee / 100}, Net: ₹${merchantNet / 100}`);

      await db.ledger.recordDoubleEntry({
        transaction_group_id: txGroupId,
        entries: [
          {
            account_type: 'CUSTOMER_ESCROW',
            entry_type: 'DEBIT',
            amount: amount,
            reference_id: paymentId || orderId,
            description: `Settlement debit from Customer Escrow for order ${orderId}`
          },
          {
            account_type: 'MERCHANT_BALANCE',
            entry_type: 'CREDIT',
            amount: merchantNet,
            reference_id: orderId,
            description: `Net revenue credit to Merchant Balance for order ${orderId}`
          },
          {
            account_type: 'GATEWAY_FEE',
            entry_type: 'CREDIT',
            amount: gatewayFee,
            reference_id: paymentId || orderId,
            description: `Payment gateway fee (MDR + GST) for order ${orderId}`
          }
        ]
      });

      // Update Order status
      await db.orders.updateStatus(orderId, 'PAID');

      // Update Webhook Event record
      await db.webhooks.updateStatus(eventId, { status: 'PROCESSED' });

      // Mark event as processed in Redis with 24-hour TTL
      await redis.set(`webhook:processed:${eventId}`, '1', 'EX', 86400);

      return {
        status: 'SUCCESS',
        orderId,
        amount,
        merchantNet,
        gatewayFee,
        txGroupId
      };
    } else if (eventType === 'payment.failed') {
      if (orderId) {
        await db.orders.updateStatus(orderId, 'FAILED');
      }
      await db.webhooks.updateStatus(eventId, { status: 'PROCESSED' });
      await redis.set(`webhook:processed:${eventId}`, '1', 'EX', 86400);
      return { status: 'PROCESSED_FAILED_PAYMENT', orderId };
    }

    // Default catch-all
    await db.webhooks.updateStatus(eventId, { status: 'PROCESSED' });
    return { status: 'PROCESSED_GENERIC_EVENT', eventType };
  }

  /**
   * Returns queue metrics for the dashboard
   */
  async getQueueMetrics() {
    if (this.isRealBullMQ && this.bullQueue) {
      const counts = await this.bullQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      const dlqCount = this.bullDlq ? await this.bullDlq.count() : 0;
      return {
        isBullMQ: true,
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
        dlqCount
      };
    }

    return {
      isBullMQ: false,
      waiting: this.memoryQueue.length,
      active: this.isProcessing ? 1 : 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      dlqCount: this.memoryDlq.length,
      dlqItems: this.memoryDlq.slice(-10)
    };
  }
}

export const queueService = new QueueService();
