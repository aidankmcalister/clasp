function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export type Outcome<T> =
  | { value: T; error?: never }
  | { value?: never; error: unknown };

// Runs fn up to maxRetries+1 times with exponential backoff.
// Returns all attempt outcomes. Stops early when shouldStop returns true.
export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldStop: (outcome: Outcome<T>) => boolean,
  config: RetryConfig = {},
): Promise<Outcome<T>[]> {
  const maxRetries = config.maxRetries ?? 3;
  const baseDelay = config.baseDelay ?? 1000;
  const maxDelay = config.maxDelay ?? 30_000;

  const outcomes: Outcome<T>[] = [];

  for (let i = 0; i <= maxRetries; i++) {
    if (i > 0) {
      await sleep(Math.min(baseDelay * 2 ** (i - 1), maxDelay));
    }

    let outcome: Outcome<T>;
    try {
      outcome = { value: await fn() };
    } catch (error) {
      outcome = { error };
    }

    outcomes.push(outcome);
    if (shouldStop(outcome)) break;
  }

  return outcomes;
}
