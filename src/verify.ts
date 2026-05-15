import { verifySignature } from "./sign.ts";
import type { VerifyOptions, WebhookEvent } from "./types.ts";

function getHeader(
  headers: Headers | Record<string, string>,
  name: string,
): string | null {
  return headers instanceof Headers
    ? headers.get(name)
    : (headers[name] ?? null);
}

export async function verifyWebhook(
  headers: Headers | Record<string, string>,
  body: string,
  options: VerifyOptions,
): Promise<WebhookEvent> {
  const { secret, tolerance = 300 } = options;

  const webhookId = getHeader(headers, "webhook-id");
  const webhookTimestamp = getHeader(headers, "webhook-timestamp");
  const webhookSignature = getHeader(headers, "webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new Error("Missing required webhook headers");
  }

  const ts = Number(webhookTimestamp);
  if (!Number.isFinite(ts)) throw new Error("Invalid webhook-timestamp");

  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > tolerance) throw new Error("Webhook timestamp is too old");

  const valid = await verifySignature(
    webhookId,
    ts,
    body,
    webhookSignature,
    secret,
  );
  if (!valid) throw new Error("Invalid webhook signature");

  const event = JSON.parse(body) as WebhookEvent;
  if (typeof event.type !== "string")
    throw new Error("Webhook body missing 'type' field");

  return event;
}
