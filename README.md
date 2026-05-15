# clasp

Lightweight TypeScript library for sending and receiving signed webhooks.  
Implements the [Standard Webhooks](https://www.standardwebhooks.com/) spec. Zero runtime dependencies.

## Install

```bash
bun add clasp-sh
```

## Usage

### Send

```ts
import { createWebhooks } from "clasp-sh";

const webhooks = createWebhooks({ secret: "whsec_..." });

const result = await webhooks.send("https://example.com/webhook", {
  type: "user.created",
  data: { id: "usr_123" },
});
```

### Verify

```ts
import { createWebhooks } from "clasp-sh";

const webhooks = createWebhooks({ secret: "whsec_..." });

// In your request handler — headers can be a Headers instance or plain object
const event = await webhooks.verify(request.headers, await request.text());
console.log(event.type); // "user.created"
```

### Standalone functions

```ts
import { sendWebhook, verifyWebhook } from "clasp-sh";

await sendWebhook(url, event, { secret }, { maxRetries: 5 });

const event = await verifyWebhook(headers, body, { secret });
```

## API

### `createWebhooks(config)`

Returns a bound `{ send, verify }` object with the secret pre-configured.

### `sendWebhook(url, event, config, options?)`

Signs and POSTs a webhook. Retries on non-2xx with exponential backoff.

| Option | Default | Description |
|---|---|---|
| `maxRetries` | `3` | Maximum retry attempts |
| `baseDelay` | `1000` | Initial backoff delay (ms) |
| `maxDelay` | `30000` | Maximum backoff delay (ms) |
| `headers` | `{}` | Extra request headers |

Returns `SendResult`:

```ts
{ success: boolean; statusCode?: number; attempts: AttemptResult[] }
```

### `verifyWebhook(headers, body, options)`

Verifies the HMAC signature and timestamp. Throws on any failure.

| Option | Default | Description |
|---|---|---|
| `secret` | required | Signing secret (`whsec_...` or raw string) |
| `tolerance` | `300` | Max timestamp age in seconds |

## Signing spec

- Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`
- Signed string: `{id}.{timestamp}.{body}`
- Algorithm: HMAC-SHA256 (Web Crypto API)
- Signature format: `v1,{base64}`
- Secret: base64-decoded if prefixed with `whsec_`, raw bytes otherwise

## License

MIT — [clasp.sh](https://clasp.sh)
