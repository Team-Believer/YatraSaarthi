/**
 * YatraSaarthi - Centralized Robust API Client
 * 
 * Safe HTTP wrapper checking response.ok and content-type: application/json
 * to eliminate "Unexpected token '<', '<!doctype'..." HTML errors and
 * provide clear network error diagnostics.
 */

import { getApiBaseUrl, classifyNetworkError, type NetworkErrorKind } from './apiConfig';

export class ApiError extends Error {
  public status: number;
  public isHtmlResponse: boolean;
  public kind: NetworkErrorKind;
  public userFriendlyMessage: string;

  constructor(
    message: string,
    status: number,
    isHtmlResponse: boolean = false,
    kind: NetworkErrorKind = 'UNKNOWN',
    userFriendlyMessage?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isHtmlResponse = isHtmlResponse;
    this.kind = kind;
    this.userFriendlyMessage = userFriendlyMessage || message;
  }
}

class ApiClient {
  public getBaseUrl(): string {
    return getApiBaseUrl();
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    try {
      const authStorage = localStorage.getItem('yatrasaarthi-auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        if (parsed?.state?.token) {
          headers['Authorization'] = `Bearer ${parsed.state.token}`;
        }
      }
    } catch {
      // Ignore storage parse errors
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers as Record<string, string>),
    };

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (err: any) {
      const classified = classifyNetworkError(err);
      throw new ApiError(
        `Network request failed: ${err.message || 'Server unreachable'}`,
        0,
        false,
        classified.kind,
        classified.userFriendlyMessage
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.detail || errorData.message || `HTTP ${response.status}`;
        const classified = classifyNetworkError({ message: msg, status: response.status });
        throw new ApiError(msg, response.status, false, classified.kind, classified.userFriendlyMessage);
      } else {
        throw new ApiError(
          `Navigation API returned an unexpected non-JSON response (HTTP ${response.status}). Check backend server URL & proxy configuration.`,
          response.status,
          true,
          'HTTP_ERROR',
          `Navigation server returned an unexpected response (HTTP ${response.status}).`
        );
      }
    }

    if (!isJson) {
      const textSample = await response.text().catch(() => '');
      if (textSample.trim().startsWith('<')) {
        throw new ApiError(
          'Navigation API returned HTML instead of expected JSON. Ensure backend FastAPI server is running on port 8000.',
          response.status,
          true,
          'HTTP_ERROR',
          'Navigation server returned HTML. Check backend URL configuration.'
        );
      }
    }

    return response.json();
  }

  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async del<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
