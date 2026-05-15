export interface WebhookConfig {
  secret: string;
}

export interface WebhookEvent {
  id?: string;
  type: string;
  data: unknown;
}

export interface AttemptResult {
  statusCode?: number;
  error?: string;
  timestamp: number;
}

export interface SendResult {
  success: boolean;
  statusCode?: number;
  attempts: AttemptResult[];
}

export interface SendOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  headers?: Record<string, string>;
}

export interface VerifyOptions {
  secret: string;
  tolerance?: number;
}
