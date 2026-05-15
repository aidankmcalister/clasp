import { describe, expect, test } from "bun:test";
import { signPayload } from "../src/sign.ts";
import { verifyWebhook } from "../src/verify.ts";

const SECRET = "test-secret";
const ID = "evt_abc";
const BODY = JSON.stringify({ type: "order.paid", data: { amount: 100 } });

async function makeHeaders(
  overrides: Record<string, string> = {},
): Promise<Record<string, string>> {
  const ts = Math.floor(Date.now() / 1000);
  const sig = await signPayload(ID, ts, BODY, SECRET);
  return {
    "webhook-id": ID,
    "webhook-timestamp": String(ts),
    "webhook-signature": sig,
    ...overrides,
  };
}

describe("verifyWebhook", () => {
  test("returns parsed event for valid webhook", async () => {
    const headers = await makeHeaders();
    const event = await verifyWebhook(headers, BODY, { secret: SECRET });
    expect(event.type).toBe("order.paid");
    expect(event.data).toEqual({ amount: 100 });
  });

  test("accepts Headers instance", async () => {
    const plain = await makeHeaders();
    const headers = new Headers(plain);
    const event = await verifyWebhook(headers, BODY, { secret: SECRET });
    expect(event.type).toBe("order.paid");
  });

  test("throws on missing headers", async () => {
    await expect(verifyWebhook({}, BODY, { secret: SECRET })).rejects.toThrow(
      "Missing required webhook headers",
    );
  });

  test("throws on wrong secret", async () => {
    const headers = await makeHeaders();
    await expect(
      verifyWebhook(headers, BODY, { secret: "wrong" }),
    ).rejects.toThrow("Invalid webhook signature");
  });

  test("throws when timestamp exceeds tolerance", async () => {
    const staleTs = Math.floor(Date.now() / 1000) - 400;
    const sig = await signPayload(ID, staleTs, BODY, SECRET);
    const headers = {
      "webhook-id": ID,
      "webhook-timestamp": String(staleTs),
      "webhook-signature": sig,
    };
    await expect(
      verifyWebhook(headers, BODY, { secret: SECRET }),
    ).rejects.toThrow("too old");
  });

  test("respects custom tolerance", async () => {
    const staleTs = Math.floor(Date.now() / 1000) - 400;
    const sig = await signPayload(ID, staleTs, BODY, SECRET);
    const headers = {
      "webhook-id": ID,
      "webhook-timestamp": String(staleTs),
      "webhook-signature": sig,
    };
    const event = await verifyWebhook(headers, BODY, {
      secret: SECRET,
      tolerance: 600,
    });
    expect(event.type).toBe("order.paid");
  });

  test("throws on tampered body", async () => {
    const headers = await makeHeaders();
    await expect(
      verifyWebhook(headers, '{"type":"evil","data":{}}', { secret: SECRET }),
    ).rejects.toThrow("Invalid webhook signature");
  });

  test("throws when body missing type field", async () => {
    const noTypeBody = JSON.stringify({ data: {} });
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signPayload(ID, ts, noTypeBody, SECRET);
    const headers = {
      "webhook-id": ID,
      "webhook-timestamp": String(ts),
      "webhook-signature": sig,
    };
    await expect(
      verifyWebhook(headers, noTypeBody, { secret: SECRET }),
    ).rejects.toThrow("missing 'type'");
  });
});
