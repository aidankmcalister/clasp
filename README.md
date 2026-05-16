# clasp

> Send a webhook. Receive a webhook. That's it.

An open source tool for webhooks. Two functions. Do whatever you want with them. Zero runtime dependencies. **1.76 KB** gzipped.

Full docs at **[clasp.sh](https://clasp.sh)**.

## Install

```bash
bun add clasp-sh
```

`npm`, `pnpm`, `yarn` too.

## Two halves

clasp does two things. Pick the one you need:

- **Outgoing** — you want another service to do something when something happens on yours. [Sending](#send).
- **Incoming** — you want your service to do something when something happens on someone else's. [Receiving](#verify).

Most apps end up doing both.

## Setup

Generate a signing secret with any standard tool:

```bash
openssl rand -base64 32
```

Add the secret to your environment variables as `WEBHOOK_SECRET` and prefix it with `whsec_` to treat the rest as base64 (Standard Webhooks convention):

```env
WEBHOOK_SECRET=.whsec_..
```

Create a client:

```ts
import { clasp } from "clasp-sh";

const webhooks = clasp({ secret: process.env.WEBHOOK_SECRET });
```

That's it. You now have `{ send, verify }`.

## Send

```ts
const result = await webhooks.send("https://example.com/webhook", {
  type: "user.created",
  data: { id: "usr_123" },
});

result.success;    // boolean
result.statusCode; // 200
result.attempts;   // [{ timestamp, statusCode }]
```

Retries non-2xx responses 3× with exponential backoff (1s → 2s → 4s). Never throws on HTTP failure — returns a result object instead.

## Verify

Pass any Web standard `Request` directly.

### Hono

```ts
app.post("/webhook", async (c) => {
  const event = await webhooks.verify(c.req.raw);
  return c.json({ ok: true });
});
```

### Next.js (App Router)

```ts
export async function POST(request: Request) {
  const event = await webhooks.verify(request);
  return Response.json({ ok: true });
}
```

### Bun.serve / Workers / Deno

Same call — all three runtimes hand you a `Request`.

```ts
Bun.serve({
  async fetch(req) {
    const event = await webhooks.verify(req);
    return Response.json({ ok: true });
  },
});
```

### Headers + body manually

For runtimes that don't hand you a `Request` (e.g. legacy Node / Express), pass them separately:

```ts
const event = await webhooks.verify({
  headers: req.headers,
  body: rawBodyString,
});
```

> Always use the **raw** request body. Reserializing parsed JSON changes byte order and breaks the signature.

## Typed events

```ts
type MyEvents =
  | { type: "user.created"; data: { id: string } }
  | { type: "order.paid"; data: { amount: number; currency: string } };

const webhooks = clasp<MyEvents>({ secret });

await webhooks.send(url, {
  type: "user.created",
  data: { id: "usr_1" }, // ✓ type-checked
});

const event = await webhooks.verify(req);
if (event.type === "order.paid") {
  event.data.amount; // typed as number
}
```

## Error handling

`verify` throws `WebhookError` with a typed `code` — no string matching.

```ts
import { WebhookError } from "clasp-sh";

try {
  await webhooks.verify(req);
} catch (err) {
  if (err instanceof WebhookError) {
    switch (err.code) {
      case "missing_headers":    // 400
      case "invalid_timestamp":  // 400
      case "invalid_body":       // 400
      case "stale_timestamp":    // 401
      case "invalid_signature":  // 401
    }
  }
}
```

## API

```ts
clasp<E>(config: { secret: string }): {
  send(url: string, event: E, options?: SendOptions): Promise<SendResult>;
  verify(
    source: Request | { headers; body },
    options?: VerifyOptions
  ): Promise<E>;
};

WebhookError { code: WebhookErrorCode; message: string };
```

### Defaults

|  |  |
|---|---|
| Max retries | 3 |
| Backoff | 1s → 2s → 4s, capped at 30s |
| Timestamp tolerance | 5 minutes |
| Algorithm | HMAC-SHA256 |

Override per call:

```ts
await webhooks.send(url, event, { maxRetries: 5, baseDelay: 500 });
await webhooks.verify(req, { tolerance: 60 });
```

## Spec

Implements [Standard Webhooks](https://www.standardwebhooks.com/):

- Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`
- Signed payload: `{id}.{timestamp}.{body}`
- Signature format: `v1,{base64}` (multiple signatures space-separated)

## Runtime support

Works anywhere with Web Crypto and `fetch` — Node 18+, Bun, Deno, Cloudflare Workers, browsers, the edge.

## Testing locally

A Hono-based manual test harness with a browser UI lives at [`clasp-test`](https://github.com/aidankmcalister/clasp). Setup is in [`TESTING.md`](./TESTING.md).

To receive webhooks from external services during development, expose your local server with `ngrok http 3000` or `cloudflared tunnel`. A hosted clasp relay is on the roadmap.

## License

MIT — [clasp.sh](https://clasp.sh)
