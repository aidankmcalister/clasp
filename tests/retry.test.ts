import { describe, expect, spyOn, test } from "bun:test";
import { withRetry } from "../src/retry.ts";

function instantSleep() {
  return spyOn(globalThis, "setTimeout").mockImplementation((cb) => {
    (cb as () => void)();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
}

describe("withRetry", () => {
  test("stops immediately when shouldStop returns true on first attempt", async () => {
    const sleep = instantSleep();
    let calls = 0;
    await withRetry(
      async () => {
        calls++;
        return "ok";
      },
      (o) => !o.error,
      { maxRetries: 3 },
    );
    expect(calls).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
    sleep.mockRestore();
  });

  test("retries up to maxRetries times on failure", async () => {
    const sleep = instantSleep();
    let calls = 0;
    const outcomes = await withRetry(
      async () => {
        calls++;
        throw new Error("fail");
      },
      () => false,
      { maxRetries: 2 },
    );
    expect(calls).toBe(3); // 1 initial + 2 retries
    expect(outcomes).toHaveLength(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    sleep.mockRestore();
  });

  test("uses exponential backoff delays", async () => {
    const sleep = instantSleep();
    await withRetry(
      async () => {
        throw new Error("fail");
      },
      () => false,
      { maxRetries: 3, baseDelay: 1000, maxDelay: 30_000 },
    );
    expect(sleep.mock.calls[0]?.[1]).toBe(1000);
    expect(sleep.mock.calls[1]?.[1]).toBe(2000);
    expect(sleep.mock.calls[2]?.[1]).toBe(4000);
    sleep.mockRestore();
  });

  test("caps delay at maxDelay", async () => {
    const sleep = instantSleep();
    await withRetry(
      async () => {
        throw new Error("fail");
      },
      () => false,
      { maxRetries: 4, baseDelay: 1000, maxDelay: 3000 },
    );
    const delays = sleep.mock.calls.map((c) => c[1] as number);
    expect(Math.max(...delays)).toBe(3000);
    sleep.mockRestore();
  });

  test("stops early when shouldStop returns true mid-retry", async () => {
    const sleep = instantSleep();
    let calls = 0;
    const outcomes = await withRetry(
      async () => {
        calls++;
        return calls >= 2 ? "done" : "retry";
      },
      (o) => !o.error && o.value === "done",
      { maxRetries: 5 },
    );
    expect(calls).toBe(2);
    expect(outcomes).toHaveLength(2);
    sleep.mockRestore();
  });

  test("records errors in outcomes", async () => {
    const sleep = instantSleep();
    const outcomes = await withRetry(
      async () => {
        throw new Error("network error");
      },
      () => false,
      { maxRetries: 1 },
    );
    expect(outcomes[0]?.error).toBeInstanceOf(Error);
    sleep.mockRestore();
  });
});
