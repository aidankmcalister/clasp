import { withRetry } from "./retry.ts";
import { signPayload } from "./sign.ts";
import type {
  AttemptResult,
  SendOptions,
  SendResult,
  WebhookEvent,
} from "./types.ts";

export async function send<E extends WebhookEvent = WebhookEvent>(
  url: string,
  event: E,
  secret: string,
  options: SendOptions = {},
): Promise<SendResult> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30_000,
    headers: extraHeaders,
  } = options;

  const body = JSON.stringify(event);
  const webhookId = event.id ?? crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signPayload(webhookId, timestamp, body, secret);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "webhook-id": webhookId,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": signature,
    ...extraHeaders,
  };

  const startTimes: number[] = [];

  const outcomes = await withRetry<Response>(
    () => {
      startTimes.push(Date.now());
      return fetch(url, { method: "POST", headers, body });
    },
    (o) => !o.error && (o.value as Response).ok,
    { maxRetries, baseDelay, maxDelay },
  );

  const attempts: AttemptResult[] = outcomes.map((o, i) => ({
    timestamp: startTimes[i] ?? Date.now(),
    statusCode: o.value?.status,
    error:
      o.error instanceof Error
        ? o.error.message
        : o.error != null
          ? String(o.error)
          : undefined,
  }));

  const last = outcomes[outcomes.length - 1];
  return {
    success: !last?.error && last?.value?.ok === true,
    statusCode: last?.value?.status,
    attempts,
  };
}
