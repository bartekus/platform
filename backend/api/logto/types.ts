export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface TokenCache {
  token: string;
  expiresAt: number;
}

// Export interfaces for service-to-service communication
export interface LogtoAPIOptions {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface TokenResult {
  token: string;
}

export interface LogtoAPIResponse<T> {
  data?: T;
}
