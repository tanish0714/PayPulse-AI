// Chaos Engineering Simulator for PayPulse AI
// Tests idempotency, retry mechanisms, and Dead Letter Queue (DLQ) tolerance

class ChaosService {
  constructor() {
    this.enabled = false;
    this.duplicateRate = 0.5; // 50% chance to fire duplicate webhook
    this.latencyMs = 3000;    // 3 second simulated delay
    this.failureRate = 0.4;   // 40% chance of transient failure
    this.history = [];
  }

  toggle(enabled, options = {}) {
    this.enabled = typeof enabled === 'boolean' ? enabled : !this.enabled;
    if (options.duplicateRate !== undefined) this.duplicateRate = options.duplicateRate;
    if (options.latencyMs !== undefined) this.latencyMs = options.latencyMs;
    if (options.failureRate !== undefined) this.failureRate = options.failureRate;

    this.recordAudit(`Chaos mode ${this.enabled ? 'ACTIVATED' : 'DEACTIVATED'} (Failure Rate: ${this.failureRate * 100}%, Latency: ${this.latencyMs}ms)`);
    return this.getStatus();
  }

  getStatus() {
    return {
      enabled: this.enabled,
      duplicateRate: this.duplicateRate,
      latencyMs: this.latencyMs,
      failureRate: this.failureRate,
      history: this.history.slice(-10)
    };
  }

  recordAudit(message) {
    this.history.push({
      timestamp: new Date().toISOString(),
      message
    });
    if (this.history.length > 50) this.history.shift();
  }

  /**
   * Evaluates if chaos should trigger for an operation
   */
  async maybeInjectChaos(operationType = 'webhook_process') {
    if (!this.enabled) return { injected: false };

    const roll = Math.random();
    const result = { injected: true, events: [] };

    // 1. Latency injection
    if (this.latencyMs > 0) {
      result.events.push(`Injected latency: ${this.latencyMs}ms`);
      await new Promise(r => setTimeout(r, this.latencyMs));
    }

    // 2. Failure injection
    if (roll < this.failureRate) {
      result.events.push('Simulated transient gateway/network failure (500)');
      this.recordAudit(`Injected transient 500 error during ${operationType}`);
      const err = new Error(`[CHAOS SIMULATOR] Simulated transient gateway failure for ${operationType}`);
      err.isChaos = true;
      throw err;
    }

    return result;
  }
}

export const chaosService = new ChaosService();
