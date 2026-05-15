import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { sendWebhook } from "../src/send.ts";

const SECRET = "send-test-secret";
const URL = "https://example.com/webhook";
const EVENT = { type: "ping", data: { hello: "world" } };

let fetchMock: ReturnType<typeof mock>;
let sleepSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  sleepSpy = spyOn(Bun, "sleep").mockResolvedValue();
  fetchMock = mock(() => Promise.resolve(new Response("", { status: 200 })));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  sleepSpy.mockRestore();
});

describe("sendWebhook", () => {
  test("sends POST with correct signing headers", async () => {
    const result = await sendWebhook(URL, EVENT, { secret: SECRET });

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.attempts).toHaveLength(1);

    const [call] = fetchMock.mock.calls;
    const [calledUrl, init] = call as [string, RequestInit];
    expect(calledUrl).toBe(URL);
    expect(
      (init.headers as Record<string, string>)["webhook-signature"],
    ).toMatch(/^v1,/);
    expect(
      (init.headers as Record<string, string>)["webhook-id"],
    ).toBeDefined();
    expect(
      (init.headers as Record<string, string>)["webhook-timestamp"],
    ).toBeDefined();
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  test("uses event.id if provided", async () => {
    const event = { ...EVENT, id: "evt_custom" };
    await sendWebhook(URL, event, { secret: SECRET });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["webhook-id"]).toBe(
      "evt_custom",
    );
  });

  test("merges extra headers", async () => {
    await sendWebhook(
      URL,
      EVENT,
      { secret: SECRET },
      { headers: { "x-custom": "value" } },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-custom"]).toBe("value");
  });

  test("retries on non-2xx and returns failure", async () => {
    fetchMock = mock(() => Promise.resolve(new Response("", { status: 503 })));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendWebhook(
      URL,
      EVENT,
      { secret: SECRET },
      { maxRetries: 2 },
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.attempts).toHaveLength(3); // 1 initial + 2 retries
    expect(sleepSpy).toHaveBeenCalledTimes(2);
  });

  test("returns success: false on network error", async () => {
    fetchMock = mock(() => Promise.reject(new Error("connection refused")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendWebhook(
      URL,
      EVENT,
      { secret: SECRET },
      { maxRetries: 1 },
    );

    expect(result.success).toBe(false);
    expect(result.attempts[0]?.error).toBe("connection refused");
  });

  test("succeeds on retry after initial failure", async () => {
    let calls = 0;
    fetchMock = mock(() => {
      calls++;
      return calls === 1
        ? Promise.resolve(new Response("", { status: 500 }))
        : Promise.resolve(new Response("", { status: 200 }));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendWebhook(
      URL,
      EVENT,
      { secret: SECRET },
      { maxRetries: 3 },
    );

    expect(result.success).toBe(true);
    expect(result.attempts).toHaveLength(2);
  });
});
