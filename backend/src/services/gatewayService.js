// Payment Gateway Service (Razorpay SDK + Mock Gateway)
// Handles order creation, HMAC-SHA256 signature verification, and mock webhook generation

import crypto from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_paypulse';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_key_paypulse_12345';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'paypulse_webhook_secret_hmac_256';

let razorpayInstance = null;
const isLiveKey = KEY_ID && KEY_ID !== 'rzp_test_mock_paypulse' && !KEY_ID.includes('mock');

if (isLiveKey) {
  try {
    razorpayInstance = new Razorpay({
      key_id: KEY_ID,
      key_secret: KEY_SECRET
    });
    console.log('[Gateway] Razorpay live client initialized.');
  } catch (err) {
    console.warn('[Gateway] Razorpay initialization failed. Falling back to test mock mode.');
    razorpayInstance = null;
  }
}

export const gatewayService = {
  isMock: !razorpayInstance,
  keyId: KEY_ID,
  webhookSecret: WEBHOOK_SECRET,

  /**
   * Creates a gateway order
   */
  async createGatewayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    if (razorpayInstance) {
      try {
        const order = await razorpayInstance.orders.create({
          amount, // in paise
          currency,
          receipt,
          notes
        });
        return {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          gateway: 'RAZORPAY',
          mode: 'LIVE'
        };
      } catch (err) {
        console.warn(`[Gateway] Razorpay API call failed: ${err.message}. Generating mock checkout order.`);
      }
    }

    // High fidelity mock gateway order
    const mockOrderId = `order_${Math.random().toString(36).substring(2, 10)}${Date.now().toString().slice(-4)}`;
    return {
      id: mockOrderId,
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      gateway: 'RAZORPAY',
      mode: 'MOCK',
      notes
    };
  },

  /**
   * Generates HMAC-SHA256 signature for Razorpay Webhooks
   */
  signWebhookPayload(payloadString) {
    return crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');
  },

  /**
   * Verifies Razorpay Webhook signature
   */
  verifyWebhookSignature(payloadString, signature) {
    if (!signature) return false;
    const expectedSignature = this.signWebhookPayload(payloadString);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (e) {
      return false;
    }
  }
};
