export type WebhookEvent = {
  type: string;
  data: unknown;
};

export type WebhookErrorCode =
  | "missing_headers"
  | "invalid_timestamp"
  | "stale_timestamp"
  | "invalid_signature"
  | "invalid_body";

export type SendOptions = {
  secret: string;
  url: string;
  event: WebhookEvent;
  messageId?: string;
  maxRetries?: number;
  timeout?: number;
};

export type SendResult = {
  success: boolean;
  statusCode?: number;
  attempts: number;
};

export type VerifyOptions = {
  secret: string;
  request:
    | Request
    | { headers: Headers | Record<string, string>; body: string };
  tolerance?: number;
};
