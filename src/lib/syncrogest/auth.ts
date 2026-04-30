import { SyncrogestClient } from './client';
import type { LoginResponse } from '../types/syncrogest';

let cachedToken: string | null = null;
let tokenExpiry = 0;

/** Restituisce il token di autenticazione Syncrogest, usando la cache se ancora valida (55 min). */
export async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const client = new SyncrogestClient();
  const response = await client.post<LoginResponse>('ws_common/logincheck', {
    username: process.env.SYNCROGEST_USERNAME!,
    password: process.env.SYNCROGEST_PASSWORD!,
  });

  // status_code 1 = success
  const token = response.data?.token_uid;
  if (response.status_code !== 1 || !token) {
    throw new Error(
      `Syncrogest login failed (code ${response.status_code}): ${response.message ?? 'unknown error'}`,
    );
  }

  cachedToken = token;
  tokenExpiry = now + 55 * 60 * 1000;
  return cachedToken;
}
