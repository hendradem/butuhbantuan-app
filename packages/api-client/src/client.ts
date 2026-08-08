import type { ApiError } from "@butuhbantuan/types";

export class ApiClient {
  private baseUrl: string;
  constructor(baseUrl: string) { this.baseUrl = baseUrl.replace(/\/$/, ""); }

  get<T>(path: string, init?: RequestInit): Promise<T> { return this.request("GET", path, undefined, init); }
  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T> { return this.request("POST", path, body, init); }
  put<T>(path: string, body: unknown, init?: RequestInit): Promise<T> { return this.request("PUT", path, body, init); }
  delete<T>(path: string, init?: RequestInit): Promise<T> { return this.request("DELETE", path, undefined, init); }

  private async request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, method, headers: { "Content-Type": "application/json", ...init?.headers }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) { const err: ApiError = await res.json().catch(() => ({ message: res.statusText, status: res.status })); throw err; }
    return res.json();
  }
}
