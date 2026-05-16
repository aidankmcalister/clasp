# Manual testing with Hono + Bun

End-to-end test of clasp-sh using a local Hono server as the webhook receiver
and a standalone send script as the sender.

---

## 1. Link clasp-sh

In this repo, build then link:

```bash
bun run build
bun link
```

> The published package only ships `dist/`, so `bun link` consumers resolve from there too.
> Use `bun run build:watch` during development to keep `dist/` fresh as you edit source.

---

## 2. Create the test project

```bash
mkdir clasp-test
cd clasp-test
bun init -y
bun add hono
bun link clasp-sh
```

---

## 3. Add the files

### `src/index.ts` — webhook receiver

Replace the generated `src/index.ts` with:

```ts
import { Hono } from "hono";
import { clasp, WebhookError } from "clasp-sh";

const SECRET = "whsec_dGVzdC1zZWNyZXQta2V5"; // see step 6 to generate a fresh one

const webhooks = clasp({ secret: SECRET });

const app = new Hono();

app.post("/webhook", async (c) => {
  try {
    const event = await webhooks.verify(c.req.raw);
    console.log("✓ verified:", JSON.stringify(event, null, 2));
    return c.json({ ok: true, type: event.type });
  } catch (err) {
    if (err instanceof WebhookError) {
      console.error(`✗ rejected (${err.code}):`, err.message);
      return c.json({ ok: false, code: err.code }, 401);
    }
    throw err;
  }
});

export default { port: 3000, fetch: app.fetch };
```

### `src/send.ts` — fires a webhook at the server

```ts
import { clasp } from "clasp-sh";

const SECRET = "whsec_dGVzdC1zZWNyZXQta2V5";

const webhooks = clasp({ secret: SECRET });

const result = await webhooks.send("http://localhost:3000/webhook", {
  type: "user.created",
  data: { id: "usr_123", email: "test@example.com" },
});

console.log("result:", JSON.stringify(result, null, 2));
```

---

## 4. Run

**Terminal 1 — start the receiver:**

```bash
bun --hot src/index.ts
```

**Terminal 2 — fire a webhook:**

```bash
bun src/send.ts
```

Expected server output:
```
✓ verified: {
  "type": "user.created",
  "data": { "id": "usr_123", "email": "test@example.com" }
}
```

Expected sender output:
```json
{
  "success": true,
  "statusCode": 200,
  "attempts": [{ "timestamp": 1234567890123, "statusCode": 200 }]
}
```

---

## 5. Test edge cases

### Bad signature

```bash
curl -s -X POST http://localhost:3000/webhook \
  -H "content-type: application/json" \
  -H "webhook-id: evt_test" \
  -H "webhook-timestamp: $(date +%s)" \
  -H "webhook-signature: v1,invalidsignature" \
  -d '{"type":"user.created","data":{}}' | jq
```

Expected: `{ "ok": false, "code": "invalid_signature" }`

### Stale timestamp

```bash
curl -s -X POST http://localhost:3000/webhook \
  -H "content-type: application/json" \
  -H "webhook-id: evt_test" \
  -H "webhook-timestamp: 1000000000" \
  -H "webhook-signature: v1,whatever" \
  -d '{"type":"user.created","data":{}}' | jq
```

Expected: `{ "ok": false, "code": "stale_timestamp" }`

### Missing headers

```bash
curl -s -X POST http://localhost:3000/webhook \
  -H "content-type: application/json" \
  -d '{"type":"user.created","data":{}}' | jq
```

Expected: `{ "ok": false, "code": "missing_headers" }`

### Retry behavior — kill the server mid-test

Stop the server (`Ctrl+C`), then run the sender:

```bash
bun src/send.ts
```

The sender will retry up to 3× with exponential backoff (1s → 2s → 4s).
Restart the server during that window and the next attempt will succeed.

---

## 6. Generate a fresh secret

clasp accepts any string. Use whatever tool you like:

```bash
openssl rand -base64 32                                # raw base64
echo "whsec_$(openssl rand -base64 32)"                # with whsec_ prefix
```

Swap it into both `src/index.ts` and `src/send.ts` — both sides must use the same value.

---

## 7. Receiving webhooks from external services (ngrok)

`http://localhost:3000` isn't reachable from the internet, so external services
(Stripe, GitHub, your buddy's app on another network) can't POST to it directly.

For now, the suggested approach is to expose localhost with **ngrok** or **cloudflared**.

Install ngrok, then in a second terminal:

```bash
ngrok http 3000
```

ngrok prints a public URL like `https://abc123.ngrok-free.app`. Append `/webhook`
to get your receiver URL:

```
https://abc123.ngrok-free.app/webhook
```

Paste that into whatever external service wants to send webhooks to you. It POSTs
through the tunnel, lands at your local receiver, and shows up in the harness log.

> A hosted clasp relay (purpose-built for this) is on the roadmap as Step 2.
> Until it ships, ngrok / cloudflared is the recommended path.
