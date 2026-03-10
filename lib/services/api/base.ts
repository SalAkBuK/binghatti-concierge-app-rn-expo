// Base API service implementation

import * as SecureStore from "expo-secure-store";
import { APP_CONFIG, API_ENDPOINTS, STORAGE_KEYS } from "../../utils/constants";
import type {
  ApiConfig,
  RequestConfig,
  ApiError,
  ResponseInterceptor,
  RequestInterceptor,
  ErrorHandler,
} from "./types";

// Helper to create timeout signal (compatible with Hermes/React Native)
function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

export class BaseApiService {
  private config: ApiConfig;
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;
  private static isInitialized = false;
  private static refreshPromise: Promise<string | null> | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorHandlers: ErrorHandler[] = [];

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      baseUrl: APP_CONFIG.api.baseUrl,
      timeout: APP_CONFIG.api.timeout,
      headers: {
        "Content-Type": "application/json",
      },
      ...config,
    };

    this.initializeAuth();
  }

  // Initialize authentication tokens from secure storage
  private async initializeAuth(): Promise<void> {
    if (BaseApiService.isInitialized) {
      return;
    }

    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.auth_token),
        SecureStore.getItemAsync(STORAGE_KEYS.refresh_token),
      ]);
      BaseApiService.accessToken = accessToken ?? null;
      BaseApiService.refreshToken = refreshToken ?? null;
    } catch (error) {
      console.warn("Failed to load auth tokens:", error);
    } finally {
      BaseApiService.isInitialized = true;
    }
  }

  // Token management
  async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    BaseApiService.isInitialized = true;
    BaseApiService.accessToken = accessToken;
    BaseApiService.refreshToken = refreshToken;
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.auth_token, accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.refresh_token, refreshToken);
    } catch (error) {
      console.error("Failed to store auth tokens:", error);
    }
  }

  async setAuthToken(token: string): Promise<void> {
    BaseApiService.isInitialized = true;
    BaseApiService.accessToken = token;
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.auth_token, token);
    } catch (error) {
      console.error("Failed to store auth token:", error);
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    BaseApiService.isInitialized = true;
    BaseApiService.refreshToken = token;
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.refresh_token, token);
    } catch (error) {
      console.error("Failed to store refresh token:", error);
    }
  }

  async clearAuthToken(): Promise<void> {
    BaseApiService.accessToken = null;
    BaseApiService.refreshToken = null;
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.refresh_token);
    } catch (error) {
      console.warn("Failed to clear auth tokens:", error);
    }
  }

  async getAuthToken(): Promise<string | null> {
    if (!BaseApiService.isInitialized) {
      await this.initializeAuth();
    }
    return BaseApiService.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    if (!BaseApiService.isInitialized) {
      await this.initializeAuth();
    }
    return BaseApiService.refreshToken;
  }

  // Interceptor management
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  addErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  // Apply request interceptors
  private async applyRequestInterceptors(
    config: RequestConfig,
  ): Promise<RequestConfig> {
    let modifiedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = await interceptor(modifiedConfig);
    }

    return modifiedConfig;
  }

  // Apply response interceptors
  private async applyResponseInterceptors<T>(response: T): Promise<T> {
    let modifiedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      modifiedResponse = await interceptor(modifiedResponse);
    }

    return modifiedResponse;
  }

  // Handle errors
  private async handleError(error: ApiError): Promise<void> {
    for (const handler of this.errorHandlers) {
      await handler(error);
    }
  }

  // Build full URL
  private buildUrl(endpoint: string): string {
    // Handle absolute URLs
    if (endpoint.startsWith("http")) {
      return endpoint;
    }

    // Handle relative URLs
    const baseUrl = this.config.baseUrl.endsWith("/")
      ? this.config.baseUrl.slice(0, -1)
      : this.config.baseUrl;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    return `${baseUrl}${cleanEndpoint}`;
  }

  // Build request headers
  private async buildHeaders(
    customHeaders: Record<string, string> = {},
    skipAuth: boolean = false,
  ): Promise<Record<string, string>> {
    const headers = {
      ...this.config.headers,
      ...customHeaders,
    };

    // Add auth token if available
    if (!skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private isRefreshRequest(url: string): boolean {
    const refreshPath = API_ENDPOINTS.auth.refresh;
    return url === refreshPath || url.endsWith(refreshPath);
  }

  private normalizeErrorText(value: unknown): string | null {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (!value || typeof value !== "object") {
      return null;
    }

    const payload = value as Record<string, unknown>;
    const nestedMessage =
      this.normalizeErrorText(payload.message) ??
      this.normalizeErrorText(payload.error) ??
      this.normalizeErrorText(payload.detail) ??
      this.normalizeErrorText(payload.title);
    if (nestedMessage) {
      return nestedMessage;
    }

    try {
      const serialized = JSON.stringify(value);
      return serialized.length > 0 ? serialized : null;
    } catch {
      return null;
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (BaseApiService.refreshPromise) {
      return BaseApiService.refreshPromise;
    }

    BaseApiService.refreshPromise = (async () => {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        await this.clearAuthToken();
        return null;
      }

      try {
        const response = await fetch(this.buildUrl(API_ENDPOINTS.auth.refresh), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          await this.clearAuthToken();
          return null;
        }

        const contentType = response.headers.get("content-type");
        const payload = contentType && contentType.includes("application/json")
          ? await response.json()
          : await response.text();

        const accessToken = payload?.accessToken ?? payload?.data?.accessToken;
        const newRefreshToken =
          payload?.refreshToken ?? payload?.data?.refreshToken ?? refreshToken;

        if (!accessToken) {
          await this.clearAuthToken();
          return null;
        }

        await this.setAuthTokens(accessToken, newRefreshToken);
        return accessToken;
      } catch (error) {
        await this.clearAuthToken();
        return null;
      } finally {
        BaseApiService.refreshPromise = null;
      }
    })();

    return BaseApiService.refreshPromise;
  }

  // Core request method
  async request<T = any>(config: RequestConfig): Promise<T> {
    try {
      // Apply request interceptors
      const modifiedConfig = await this.applyRequestInterceptors(config);

      // Build full URL and headers
      const url = this.buildUrl(modifiedConfig.url);
      const headers = await this.buildHeaders(
        modifiedConfig.headers,
        modifiedConfig.skipAuth,
      );

      // Create timeout signal (compatible with Hermes/React Native)
      const { signal, cleanup } = createTimeoutSignal(
        modifiedConfig.timeout || this.config.timeout,
      );

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: modifiedConfig.method,
        headers,
        signal,
      };

      // Add body for non-GET requests
      if (modifiedConfig.data && modifiedConfig.method !== "GET") {
        if (modifiedConfig.data instanceof FormData) {
          fetchOptions.body = modifiedConfig.data;
          if (fetchOptions.headers && typeof fetchOptions.headers === "object") {
            const headers = fetchOptions.headers as Record<string, string>;
            if (
              headers["Content-Type"] &&
              headers["Content-Type"].includes("application/json")
            ) {
              delete headers["Content-Type"];
            }
          }
        } else {
          fetchOptions.body = JSON.stringify(modifiedConfig.data);
        }
      }

      // Add query parameters for GET requests or if specified
      let finalUrl = url;
      if (modifiedConfig.params) {
        const searchParams = new URLSearchParams();
        Object.entries(modifiedConfig.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        finalUrl = `${url}?${searchParams.toString()}`;
      }

      // Make the request
      let response: Response;
      try {
        response = await fetch(finalUrl, fetchOptions);
      } finally {
        cleanup(); // Clear timeout to prevent memory leaks
      }

      if (
        response.status === 401 &&
        !modifiedConfig.skipAuth &&
        !modifiedConfig.skipAuthRefresh &&
        !this.isRefreshRequest(modifiedConfig.url)
      ) {
        const refreshedToken = await this.refreshAccessToken();
        if (refreshedToken) {
          return this.request<T>({
            ...modifiedConfig,
            skipAuthRefresh: true,
            retryCount: (modifiedConfig.retryCount ?? 0) + 1,
          });
        }
      }

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.text();
        // Include status text when available; some RN environments leave it blank
        let errorMessage = response.statusText
          ? `HTTP ${response.status}: ${response.statusText}`
          : `HTTP ${response.status}`;
        let parsedError: any;

        // Try to surface the most helpful backend error message
        try {
          parsedError = JSON.parse(errorData);

          const problemMessage = this.normalizeErrorText(
            parsedError.message ||
              parsedError.error ||
              parsedError.title ||
              parsedError.detail,
          );

          // ASP.NET-style validation errors live under "errors"
          if (parsedError.errors && typeof parsedError.errors === "object") {
            const firstKey = Object.keys(parsedError.errors)[0];
            const firstValue = parsedError.errors[firstKey];
            const firstValueText = Array.isArray(firstValue)
              ? firstValue[0]
              : String(firstValue);

            if (problemMessage) {
              errorMessage = `${problemMessage} (${firstKey}: ${firstValueText})`;
            } else {
              errorMessage = `${firstKey}: ${firstValueText}`;
            }
          } else if (problemMessage && typeof problemMessage === "string") {
            errorMessage = problemMessage;
          }

          // If we still have no message, fall back to raw text
          if (!errorMessage && errorData) {
            errorMessage = errorData;
          }
        } catch {
          // Use the raw text if JSON parsing fails
          errorMessage = errorData || errorMessage;
        }

        const apiError: ApiError = {
          message: errorMessage,
          status: response.status,
          code: response.status.toString(),
          details: parsedError,
        };

        await this.handleError(apiError);
        throw apiError;
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Apply response interceptors
      const finalData = await this.applyResponseInterceptors(data);

      return finalData;
    } catch (error) {
      // Handle network or other errors
      if (error instanceof Error && error.name === "TimeoutError") {
        const apiError: ApiError = {
          message: "Request timeout",
          code: "TIMEOUT",
        };
        await this.handleError(apiError);
        throw apiError;
      }

      if (error instanceof Error && error.name === "AbortError") {
        const apiError: ApiError = {
          message: "Request cancelled",
          code: "CANCELLED",
        };
        await this.handleError(apiError);
        throw apiError;
      }

      // Re-throw API errors
      if (error && typeof error === "object" && "status" in error) {
        throw error;
      }

      // Handle other errors
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : "Network error",
        code: "NETWORK_ERROR",
      };

      await this.handleError(apiError);
      throw apiError;
    }
  }

  // Convenience methods
  async get<T = any>(url: string, params?: any): Promise<T> {
    return this.request<T>({
      method: "GET",
      url,
      params,
    });
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    return this.request<T>({
      method: "POST",
      url,
      data,
    });
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    return this.request<T>({
      method: "PUT",
      url,
      data,
    });
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    return this.request<T>({
      method: "PATCH",
      url,
      data,
    });
  }

  async delete<T = any>(url: string, data?: any): Promise<T> {
    return this.request<T>({
      method: "DELETE",
      url,
      data,
    });
  }
}
