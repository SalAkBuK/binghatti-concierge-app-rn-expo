// Base API service implementation

import * as SecureStore from "expo-secure-store";
import { APP_CONFIG } from "../../utils/constants";
import type {
  ApiConfig,
  RequestConfig,
  ApiError,
  ResponseInterceptor,
  RequestInterceptor,
  ErrorHandler,
} from "./types";

export class BaseApiService {
  private config: ApiConfig;
  private authToken: string | null = null;
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

  // Initialize authentication token from secure storage
  private async initializeAuth(): Promise<void> {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        this.authToken = token;
      }
    } catch (error) {
      console.warn("Failed to load auth token:", error);
    }
  }

  // Token management
  async setAuthToken(token: string): Promise<void> {
    this.authToken = token;
    try {
      await SecureStore.setItemAsync("auth_token", token);
    } catch (error) {
      console.error("Failed to store auth token:", error);
    }
  }

  async clearAuthToken(): Promise<void> {
    this.authToken = null;
    try {
      await SecureStore.deleteItemAsync("auth_token");
    } catch (error) {
      console.warn("Failed to clear auth token:", error);
    }
  }

  async getAuthToken(): Promise<string | null> {
    if (!this.authToken) {
      await this.initializeAuth();
    }
    return this.authToken;
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
  ): Promise<Record<string, string>> {
    const headers = {
      ...this.config.headers,
      ...customHeaders,
    };

    // Add auth token if available
    const token = await this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Core request method
  async request<T = any>(config: RequestConfig): Promise<T> {
    try {
      // Apply request interceptors
      const modifiedConfig = await this.applyRequestInterceptors(config);

      // Build full URL and headers
      const url = this.buildUrl(modifiedConfig.url);
      const headers = await this.buildHeaders(modifiedConfig.headers);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: modifiedConfig.method,
        headers,
        signal: AbortSignal.timeout(
          modifiedConfig.timeout || this.config.timeout,
        ),
      };

      // Add body for non-GET requests
      if (modifiedConfig.data && modifiedConfig.method !== "GET") {
        fetchOptions.body = JSON.stringify(modifiedConfig.data);
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
      const response = await fetch(finalUrl, fetchOptions);

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const parsedError = JSON.parse(errorData);
          errorMessage =
            parsedError.message || parsedError.error || errorMessage;
        } catch {
          // Use the raw text if JSON parsing fails
          errorMessage = errorData || errorMessage;
        }

        const apiError: ApiError = {
          message: errorMessage,
          status: response.status,
          code: response.status.toString(),
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

  async delete<T = any>(url: string): Promise<T> {
    return this.request<T>({
      method: "DELETE",
      url,
    });
  }
}
