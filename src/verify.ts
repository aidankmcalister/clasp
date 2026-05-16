import { WebhookError } from "./errors.ts";
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

export async function verify<E extends WebhookEvent = WebhookEvent>(
  source: Request | { headers: Headers | Record<string, string>; body: string },
  secret: string,
  options: VerifyOptions = {},
): Promise<E> {
  const { tolerance = 300 } = options;

  const isRequest = source instanceof Request;
  const headers = isRequest ? source.headers : source.headers;
  const body = isRequest ? await source.text() : source.body;

  const webhookId = getHeader(headers, "webhook-id");
  const webhookTimestamp = getHeader(headers, "webhook-timestamp");
  const webhookSignature = getHeader(headers, "webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new WebhookError(
      "missing_headers",
      "Missing required webhook headers",
    );
  }

  const ts = Number(webhookTimestamp);
  if (!Number.isFinite(ts)) {
    throw new WebhookError(
      "invalid_timestamp",
      "Invalid webhook-timestamp header",
    );
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > tolerance) {
    throw new WebhookError("stale_timestamp", "Webhook timestamp is too old");
  }

  const valid = await verifySignature(
    webhookId,
    ts,
    body,
    webhookSignature,
    secret,
  );
  if (!valid) {
    throw new WebhookError("invalid_signature", "Invalid webhook signature");
  }

  let event: E;
  try {
    event = JSON.parse(body) as E;
  } catch {
    throw new WebhookError("invalid_body", "Webhook body is not valid JSON");
  }

  if (typeof (event as WebhookEvent).type !== "string") {
    throw new WebhookError("invalid_body", "Webhook body missing 'type' field");
  }

  return event;
}
