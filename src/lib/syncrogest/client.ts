export class SyncrogestClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl =
      process.env.SYNCROGEST_BASE_URL ?? 'https://app.syncrogest.it/api/v1/';
    this.apiKey = process.env['WS-API-KEY'] ?? process.env.WS_API_KEY ?? '';
  }

  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = this.baseUrl.endsWith('/')
      ? `${this.baseUrl}${endpoint}`
      : `${this.baseUrl}/${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'WS-API-KEY': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Syncrogest HTTP ${response.status} on ${endpoint}: ${text}`);
    }

    return response.json() as Promise<T>;
  }
}
