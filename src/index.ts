import { sendWebhook } from "./send.ts";
import type {
  SendOptions,
  SendResult,
  VerifyOptions,
  WebhookConfig,
  WebhookEvent,
} from "./types.ts";
import { verifyWebhook } from "./verify.ts";

export { verifyWebhook } from "./verify.ts";
export { sendWebhook } from "./send.ts";
export type {
  AttemptResult,
  SendOptions,
  SendResult,
  VerifyOptions,
  WebhookConfig,
  WebhookEvent,
} from "./types.ts";

export function createWebhooks(config: WebhookConfig): {
  send: (
    url: string,
    event: WebhookEvent,
    options?: SendOptions,
  ) => Promise<SendResult>;
  verify: (
    headers: Headers | Record<string, string>,
    body: string,
    options?: Omit<VerifyOptions, "secret">,
  ) => Promise<WebhookEvent>;
} {
  return {
    send: (url, event, options) => sendWebhook(url, event, config, options),
    verify: (headers, body, options) =>
      verifyWebhook(headers, body, { ...options, secret: config.secret }),
  };
}
