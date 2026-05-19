import type { WebhookErrorCode } from "./types";

export class WebhookError extends Error {
  code: WebhookErrorCode;

  constructor(code: WebhookErrorCode, message: string) {
    super(message);
    this.name = "WebhookError";
    this.code = code;
  }
}
