# clasp

> Send a webhook. Receive a webhook. That's it.

An open source tool for webhooks. Two functions. Do whatever you want with them. Zero runtime dependencies.

Full docs at **[clasp.sh](https://clasp.sh)**.

## Install

```bash
npm install clasp-sh
```

## Setup

Generate a signing secret:

```bash
echo "whsec_$(openssl rand -base64 32)"
```

Create a client:

```ts
import { clasp } from "clasp-sh";

const webhooks = clasp({ secret: process.env.WEBHOOK_SECRET });
```

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

Retries non-2xx responses 3 times with exponential backoff (1s, 2s, 4s). Never throws on HTTP failure.

## Verify

Pass any Web standard `Request`:

```ts
const event = await webhooks.verify(request);
console.log(event.type); // "user.created"
```

Works in Next.js, Hono, Bun, Deno, Cloudflare Workers, and anything else that gives you a `Request`.

For frameworks that don't (like Express), pass headers and body separately:

```ts
const event = await webhooks.verify({
  headers: req.headers,
  body: rawBodyString,
});
```

## Typed events

```ts
type MyEvents =
  | { type: "user.created"; data: { id: string } }
  | { type: "order.paid"; data: { amount: number } };

const webhooks = clasp<MyEvents>({ secret });

await webhooks.send(url, {
  type: "user.created",
  data: { id: "usr_1" }, // type-checked
});

const event = await webhooks.verify(req);
if (event.type === "order.paid") {
  event.data.amount; // number
}
```

## Error handling

`verify` throws `WebhookError` with a typed `code`:

```ts
import { WebhookError } from "clasp-sh";

try {
  await webhooks.verify(req);
} catch (err) {
  if (err instanceof WebhookError) {
    console.error(err.code); // "missing_headers" | "invalid_signature" | ...
  }
}
```

## Spec

Implements [Standard Webhooks](https://www.standardwebhooks.com/).

## License

MIT
