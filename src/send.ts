import { createSignature } from "./sign";
import type { SendOptions, SendResult } from "./types";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30_000;
const BASE_DELAY = 1_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function send(options: SendOptions): Promise<SendResult> {
  const {
    secret,
    url,
    event,
    messageId = crypto.randomUUID(),
    maxRetries = DEFAULT_MAX_RETRIES,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const content = `${messageId}.${timestamp}.${body}`;
  const signature = await createSignature(secret, content);

  let lastStatusCode: number | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "webhook-id": messageId,
          "webhook-timestamp": timestamp,
          "webhook-signature": signature,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);
      lastStatusCode = response.status;

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          attempts: attempt,
        };
      }
    } catch {}

    if (attempt < maxRetries + 1) {
      await wait(BASE_DELAY * Math.pow(2, attempt - 1));
    }
  }

  return {
    success: false,
    statusCode: lastStatusCode,
    attempts: maxRetries + 1,
  };
}
