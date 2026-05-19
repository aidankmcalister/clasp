import { verifySignature } from "./sign";
import { WebhookError } from "./errors";
import type { VerifyOptions, WebhookEvent } from "./types";

const DEFAULT_TOLERANCE = 300; // 5 minutes

function getHeader(
  headers: Headers | Record<string, string>,
  name: string,
): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  return headers[name] ?? null;
}

export async function verify(options: VerifyOptions): Promise<WebhookEvent> {
  const { secret, request, tolerance = DEFAULT_TOLERANCE } = options;

  let headers: Headers | Record<string, string>;
  let body: string;

  if (request instanceof Request) {
    headers = request.headers;
    body = await request.text();
  } else {
    headers = request.headers;
    body = request.body;
  }

  const messageId = getHeader(headers, "webhook-id");
  const timestamp = getHeader(headers, "webhook-timestamp");
  const signature = getHeader(headers, "webhook-signature");

  if (!messageId || !timestamp || !signature) {
    throw new WebhookError(
      "missing_headers",
      "Missing required webhook headers",
    );
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    throw new WebhookError("invalid_timestamp", "Invalid webhook timestamp");
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) {
    throw new WebhookError("stale_timestamp", "Webhook timestamp too old");
  }

  const content = `${messageId}.${timestamp}.${body}`;
  const isValid = await verifySignature(secret, content, signature);

  if (!isValid) {
    throw new WebhookError("invalid_signature", "Webhook signature mismatch");
  }

  try {
    const event = JSON.parse(body);
    if (!event.type) {
      throw new WebhookError("invalid_body", "Missing event type");
    }
    return event as WebhookEvent;
  } catch (err) {
    if (err instanceof WebhookError) throw err;
    throw new WebhookError("invalid_body", "Invalid JSON body");
  }
}
