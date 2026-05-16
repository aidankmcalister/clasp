import { send } from "./send.ts";
import type {
  SendOptions,
  SendResult,
  VerifyOptions,
  WebhookConfig,
  WebhookEvent,
} from "./types.ts";
import { verify } from "./verify.ts";

export { WebhookError, type WebhookErrorCode } from "./errors.ts";
export type {
  AttemptResult,
  SendOptions,
  SendResult,
  VerifyOptions,
  WebhookConfig,
  WebhookEvent,
} from "./types.ts";

export interface Clasp<E extends WebhookEvent> {
  send: (url: string, event: E, options?: SendOptions) => Promise<SendResult>;
  verify: (
    source:
      | Request
      | { headers: Headers | Record<string, string>; body: string },
    options?: VerifyOptions,
  ) => Promise<E>;
}

export function clasp<E extends WebhookEvent = WebhookEvent>(
  config: WebhookConfig,
): Clasp<E> {
  return {
    send: (url, event, options) => send<E>(url, event, config.secret, options),
    verify: (source, options) => verify<E>(source, config.secret, options),
  };
}
