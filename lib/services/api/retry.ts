// Retry policy with exponential backoff for API requests

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
}

export class RetryPolicy {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffFactor: 2,
      retryCondition: this.defaultRetryCondition,
      ...config,
    };
  }

  /**
   * Default retry condition - only retry on network/server errors
   */
  private defaultRetryCondition(error: any): boolean {
    // Don't retry client errors (4xx) except 408, 429
    if (error.status >= 400 && error.status < 500) {
      return error.status === 408 || error.status === 429;
    }

    // Retry server errors (5xx)
    if (error.status >= 500) {
      return true;
    }

    // Retry network errors
    const networkErrors = ["NETWORK_ERROR", "TIMEOUT", "CANCELLED"];
    return networkErrors.includes(error.code);
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;

        // Check if we should retry
        const shouldRetry =
          this.config.retryCondition?.(error) ??
          this.defaultRetryCondition(error);

        if (!shouldRetry || attempt >= this.config.maxAttempts) {
          throw error;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt);

        console.warn(
          `Retry attempt ${attempt}/${this.config.maxAttempts} failed. Retrying in ${delay}ms...`,
          {
            error: error instanceof Error ? error.message : String(error),
            attempt,
            delay,
          },
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute with detailed retry result
   */
  async executeWithResult<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    let lastError: any;
    let attempts = 0;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      attempts = attempt;

      try {
        const result = await fn();
        return {
          success: true,
          data: result,
          attempts,
        };
      } catch (error) {
        lastError = error;

        // Check if we should retry
        const shouldRetry =
          this.config.retryCondition?.(error) ??
          this.defaultRetryCondition(error);

        if (!shouldRetry || attempt >= this.config.maxAttempts) {
          break;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt);

        console.warn(
          `Retry attempt ${attempt}/${this.config.maxAttempts} failed. Retrying in ${delay}ms...`,
          {
            error: error instanceof Error ? error.message : String(error),
            attempt,
            delay,
          },
        );

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
    };
  }
}

// Predefined retry policies for different scenarios
export const RETRY_POLICIES = {
  // Conservative retry for critical operations
  conservative: new RetryPolicy({
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 5000,
    backoffFactor: 1.5,
  }),

  // Standard retry for most operations
  standard: new RetryPolicy({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  }),

  // Aggressive retry for non-critical operations
  aggressive: new RetryPolicy({
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 15000,
    backoffFactor: 2.5,
  }),

  // Quick retry for real-time operations
  realtime: new RetryPolicy({
    maxAttempts: 2,
    baseDelay: 200,
    maxDelay: 1000,
    backoffFactor: 2,
  }),

  // No retry for one-shot operations
  none: new RetryPolicy({
    maxAttempts: 1,
  }),
} as const;

// Retry decorator for methods
export function withRetry<T extends any[], R>(
  policy: RetryPolicy = RETRY_POLICIES.standard,
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>,
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      return policy.execute(() => method.apply(this, args));
    };

    return descriptor;
  };
}

// Utility functions
export function createRetryPolicy(config: Partial<RetryConfig>): RetryPolicy {
  return new RetryPolicy(config);
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> {
  const policy = new RetryPolicy(config);
  return policy.execute(operation);
}

export async function retryOperationWithResult<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<RetryResult<T>> {
  const policy = new RetryPolicy(config);
  return policy.executeWithResult(operation);
}
