import { describe, expect, test } from "bun:test";
import { WebhookError } from "../src/errors.ts";
import { signPayload } from "../src/sign.ts";
import { verify } from "../src/verify.ts";

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

describe("verify", () => {
  test("returns parsed event for valid webhook (object source)", async () => {
    const headers = await makeHeaders();
    const event = await verify({ headers, body: BODY }, SECRET);
    expect(event.type).toBe("order.paid");
    expect(event.data).toEqual({ amount: 100 });
  });

  test("accepts a Request directly", async () => {
    const headers = await makeHeaders();
    const req = new Request("https://example.com/webhook", {
      method: "POST",
      headers,
      body: BODY,
    });
    const event = await verify(req, SECRET);
    expect(event.type).toBe("order.paid");
  });

  test("accepts Headers instance inside object source", async () => {
    const plain = await makeHeaders();
    const headers = new Headers(plain);
    const event = await verify({ headers, body: BODY }, SECRET);
    expect(event.type).toBe("order.paid");
  });

  test("throws WebhookError on missing headers", async () => {
    try {
      await verify({ headers: {}, body: BODY }, SECRET);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WebhookError);
      expect((err as WebhookError).code).toBe("missing_headers");
    }
  });

  test("throws invalid_signature on wrong secret", async () => {
    const headers = await makeHeaders();
    try {
      await verify({ headers, body: BODY }, "wrong");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WebhookError);
      expect((err as WebhookError).code).toBe("invalid_signature");
    }
  });

  test("throws stale_timestamp when too old", async () => {
    const staleTs = Math.floor(Date.now() / 1000) - 400;
    const sig = await signPayload(ID, staleTs, BODY, SECRET);
    const headers = {
      "webhook-id": ID,
      "webhook-timestamp": String(staleTs),
      "webhook-signature": sig,
    };
    try {
      await verify({ headers, body: BODY }, SECRET);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WebhookError);
      expect((err as WebhookError).code).toBe("stale_timestamp");
    }
  });

  test("respects custom tolerance", async () => {
    const staleTs = Math.floor(Date.now() / 1000) - 400;
    const sig = await signPayload(ID, staleTs, BODY, SECRET);
    const headers = {
      "webhook-id": ID,
      "webhook-timestamp": String(staleTs),
      "webhook-signature": sig,
    };
    const event = await verify({ headers, body: BODY }, SECRET, {
      tolerance: 600,
    });
    expect(event.type).toBe("order.paid");
  });

  test("throws invalid_signature on tampered body", async () => {
    const headers = await makeHeaders();
    try {
      await verify({ headers, body: '{"type":"evil","data":{}}' }, SECRET);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as WebhookError).code).toBe("invalid_signature");
    }
  });

  test("throws invalid_body when missing type field", async () => {
    const noTypeBody = JSON.stringify({ data: {} });
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signPayload(ID, ts, noTypeBody, SECRET);
    const headers = {
      "webhook-id": ID,
      "webhook-timestamp": String(ts),
      "webhook-signature": sig,
    };
    try {
      await verify({ headers, body: noTypeBody }, SECRET);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as WebhookError).code).toBe("invalid_body");
    }
  });

  test("throws invalid_timestamp for non-numeric timestamp", async () => {
    const headers = {
      "webhook-id": ID,
      "webhook-timestamp": "not-a-number",
      "webhook-signature": "v1,whatever",
    };
    try {
      await verify({ headers, body: BODY }, SECRET);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as WebhookError).code).toBe("invalid_timestamp");
    }
  });
});
