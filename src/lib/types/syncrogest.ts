export interface SyncrogestBaseRequest {
  token_uid: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  gauth_code?: string;
}

export interface LoginResponse {
  status_code: number;
  message?: string;
  data?: {
    token_uid?: string;
    [key: string]: unknown;
  } | null;
}

export interface SyncrogestResponse {
  status_code: number;
  message?: string;
  data?: unknown;
}
