import { describe, expect, spyOn, test } from "bun:test";
import { withRetry } from "../src/retry.ts";

describe("withRetry", () => {
  test("stops immediately when shouldStop returns true on first attempt", async () => {
    const sleep = spyOn(Bun, "sleep").mockResolvedValue();
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
    const sleep = spyOn(Bun, "sleep").mockResolvedValue();
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
    const sleep = spyOn(Bun, "sleep").mockResolvedValue();
    await withRetry(
      async () => {
        throw new Error("fail");
      },
      () => false,
      { maxRetries: 3, baseDelay: 1000, maxDelay: 30_000 },
    );
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenNthCalledWith(2, 2000);
    expect(sleep).toHaveBeenNthCalledWith(3, 4000);
    sleep.mockRestore();
  });

  test("caps delay at maxDelay", async () => {
    const sleep = spyOn(Bun, "sleep").mockResolvedValue();
    await withRetry(
      async () => {
        throw new Error("fail");
      },
      () => false,
      { maxRetries: 4, baseDelay: 1000, maxDelay: 3000 },
    );
    const calls = sleep.mock.calls.map((c) => c[0]);
    expect(Math.max(...(calls as number[]))).toBe(3000);
    sleep.mockRestore();
  });

  test("stops early when shouldStop returns true mid-retry", async () => {
    const sleep = spyOn(Bun, "sleep").mockResolvedValue();
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
    const sleep = spyOn(Bun, "sleep").mockResolvedValue();
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
