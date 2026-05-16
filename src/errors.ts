export type WebhookErrorCode =
  | "missing_headers"
  | "invalid_timestamp"
  | "stale_timestamp"
  | "invalid_signature"
  | "invalid_body";

export class WebhookError extends Error {
  readonly code: WebhookErrorCode;

  constructor(code: WebhookErrorCode, message: string) {
    super(message);
    this.name = "WebhookError";
    this.code = code;
  }
}
