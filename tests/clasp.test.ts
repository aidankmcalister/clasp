import { describe, expect, mock, test } from "bun:test";
import { WebhookError, clasp } from "../src/index.ts";

function expectDefined<T>(v: T | null | undefined): T {
  if (v == null) throw new Error("expected value to be defined");
  return v;
}

const SECRET_A = "whsec_dGVzdC1zZWNyZXQtYQ==";
const SECRET_B = "whsec_dGVzdC1zZWNyZXQtYg==";

describe("clasp()", () => {
  test("send + verify round trip works", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchMock = mock((url: string, init: RequestInit) => {
      captured = { url, init };
      return Promise.resolve(new Response("", { status: 200 }));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const webhooks = clasp({ secret: SECRET_A });

    const result = await webhooks.send("https://example.com/hook", {
      type: "user.created",
      data: { id: "usr_1" },
    });

    expect(result.success).toBe(true);
    const c = expectDefined(captured);
    const headers = c.init.headers as Record<string, string>;
    const body = c.init.body as string;
    const event = await webhooks.verify({ headers, body });
    expect(event.type).toBe("user.created");
    expect(event.data).toEqual({ id: "usr_1" });
  });

  test("verify accepts a Request from a round trip", async () => {
    let captured: Request | null = null;
    const fetchMock = mock((url: string, init: RequestInit) => {
      captured = new Request(url, init);
      return Promise.resolve(new Response("", { status: 200 }));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const webhooks = clasp({ secret: SECRET_A });
    await webhooks.send("https://example.com/hook", {
      type: "ping",
      data: null,
    });

    const event = await webhooks.verify(expectDefined(captured));
    expect(event.type).toBe("ping");
  });

  test("verify throws WebhookError with code on bad secret", async () => {
    const sender = clasp({ secret: SECRET_A });
    const receiver = clasp({ secret: SECRET_B });

    let captured: Request | null = null;
    globalThis.fetch = mock((url: string, init: RequestInit) => {
      captured = new Request(url, init);
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;

    await sender.send("https://example.com/hook", {
      type: "ping",
      data: null,
    });

    try {
      await receiver.verify(expectDefined(captured));
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WebhookError);
      expect((err as WebhookError).code).toBe("invalid_signature");
    }
  });

  test("generic typing narrows event.type union", async () => {
    type MyEvents =
      | { type: "user.created"; data: { id: string } }
      | { type: "user.deleted"; data: { id: string } };

    const webhooks = clasp<MyEvents>({ secret: SECRET_A });

    let captured: Request | null = null;
    globalThis.fetch = mock((url: string, init: RequestInit) => {
      captured = new Request(url, init);
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;

    await webhooks.send("https://example.com/hook", {
      type: "user.created",
      data: { id: "usr_1" },
    });

    const event = await webhooks.verify(expectDefined(captured));
    expect(["user.created", "user.deleted"]).toContain(event.type);
  });
});
