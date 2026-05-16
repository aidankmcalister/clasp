import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { send } from "../src/send.ts";

const SECRET = "send-test-secret";
const URL = "https://example.com/webhook";
const EVENT = { type: "ping", data: { hello: "world" } };

let fetchMock: ReturnType<typeof mock>;
let sleepSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  sleepSpy = spyOn(globalThis, "setTimeout").mockImplementation((cb) => {
    (cb as () => void)();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
  fetchMock = mock(() => Promise.resolve(new Response("", { status: 200 })));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  sleepSpy.mockRestore();
});

describe("send", () => {
  test("sends POST with correct signing headers", async () => {
    const result = await send(URL, EVENT, SECRET);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.attempts).toHaveLength(1);

    const [call] = fetchMock.mock.calls;
    const [calledUrl, init] = call as [string, RequestInit];
    expect(calledUrl).toBe(URL);
    const h = init.headers as Record<string, string>;
    expect(h["webhook-signature"]).toMatch(/^v1,/);
    expect(h["webhook-id"]).toBeDefined();
    expect(h["webhook-timestamp"]).toBeDefined();
    expect(h["content-type"]).toBe("application/json");
  });

  test("uses event.id if provided", async () => {
    await send(URL, { ...EVENT, id: "evt_custom" }, SECRET);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["webhook-id"]).toBe(
      "evt_custom",
    );
  });

  test("merges extra headers", async () => {
    await send(URL, EVENT, SECRET, { headers: { "x-custom": "value" } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-custom"]).toBe("value");
  });

  test("retries on non-2xx and returns failure", async () => {
    fetchMock = mock(() => Promise.resolve(new Response("", { status: 503 })));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await send(URL, EVENT, SECRET, { maxRetries: 2 });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.attempts).toHaveLength(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2);
  });

  test("returns success: false on network error", async () => {
    fetchMock = mock(() => Promise.reject(new Error("connection refused")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await send(URL, EVENT, SECRET, { maxRetries: 1 });

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

    const result = await send(URL, EVENT, SECRET, { maxRetries: 3 });

    expect(result.success).toBe(true);
    expect(result.attempts).toHaveLength(2);
  });
});
