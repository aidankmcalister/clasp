# Manual testing with Hono + Bun

End-to-end test of clasp-sh using a local Hono server as the webhook receiver
and a standalone send script as the sender.

---

## 1. Link clasp-sh

In this repo:

```bash
bun link
```

> The `"bun"` export condition points straight to `src/index.ts`, so no build step needed.

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
import { createWebhooks } from "clasp-sh";

const SECRET = "whsec_dGVzdC1zZWNyZXQta2V5"; // whsec_ + base64("test-secret-key")

const webhooks = createWebhooks({ secret: SECRET });

const app = new Hono();

app.post("/webhook", async (c) => {
  const body = await c.req.text();

  try {
    const event = await webhooks.verify(c.req.raw.headers, body);
    console.log("✓ verified:", JSON.stringify(event, null, 2));
    return c.json({ ok: true, type: event.type });
  } catch (err) {
    console.error("✗ rejected:", String(err));
    return c.json({ ok: false, error: String(err) }, 400);
  }
});

export default { port: 3000, fetch: app.fetch };
```

### `src/send.ts` — fires a webhook at the server

```ts
import { createWebhooks } from "clasp-sh";

const SECRET = "whsec_dGVzdC1zZWNyZXQta2V5";

const webhooks = createWebhooks({ secret: SECRET });

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

### Bad signature (curl with a fake sig)

```bash
curl -s -X POST http://localhost:3000/webhook \
  -H "content-type: application/json" \
  -H "webhook-id: evt_test" \
  -H "webhook-timestamp: $(date +%s)" \
  -H "webhook-signature: v1,invalidsignature" \
  -d '{"type":"user.created","data":{}}' | jq
```

Expected: `{ "ok": false, "error": "Error: Invalid webhook signature" }`

### Stale timestamp (>5 min old)

```bash
curl -s -X POST http://localhost:3000/webhook \
  -H "content-type: application/json" \
  -H "webhook-id: evt_test" \
  -H "webhook-timestamp: 1000000000" \
  -H "webhook-signature: v1,invalidsignature" \
  -d '{"type":"user.created","data":{}}' | jq
```

Expected: `{ "ok": false, "error": "Error: Webhook timestamp is too old" }`

### Retry behavior — kill the server mid-test

Stop the server (`Ctrl+C`), then run the sender:

```bash
bun src/send.ts
```

The sender will retry up to 3× with exponential backoff (1s → 2s → 4s).
Restart the server during that window and the next attempt will succeed.

---

## 6. Generate a fresh secret

```bash
bun -e "console.log('whsec_' + btoa(crypto.randomUUID()))"
```

Swap it in both `src/index.ts` and `src/send.ts` — both sides must use the same value.
