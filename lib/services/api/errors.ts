// Global error normalization and user-friendly error messages

export interface NormalizedApiError {
  ok: false;
  error: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface NormalizedApiSuccess<T = any> {
  ok: true;
  data: T;
}

export type NormalizedApiResponse<T = any> =
  | NormalizedApiSuccess<T>
  | NormalizedApiError;

// Known backend error codes and their user-friendly messages
const ERROR_MESSAGES = {
  // Authentication errors
  INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  ACCOUNT_LOCKED:
    "Your account has been temporarily locked. Please contact support.",

  // Validation errors
  VALIDATION_ERROR: "Please check your input and try again.",
  INVALID_EMAIL: "Please enter a valid email address.",
  PASSWORD_TOO_WEAK: "Password must be at least 8 characters long.",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists.",

  // Request errors
  REQUEST_NOT_FOUND: "The requested item could not be found.",
  REQUEST_ALREADY_ASSIGNED: "This request is already assigned to someone else.",
  REQUEST_CANNOT_BE_DELETED:
    "This request cannot be deleted in its current state.",

  // General errors
  NETWORK_ERROR:
    "Unable to connect to the server. Please check your internet connection.",
  SERVER_ERROR: "Something went wrong on our end. Please try again later.",
  TIMEOUT_ERROR: "The request took too long. Please try again.",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment and try again.",

  // Default fallback
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
} as const;

// HTTP status code to error code mapping
const STATUS_CODE_MAPPING: Record<number, keyof typeof ERROR_MESSAGES> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "UNAUTHORIZED",
  404: "REQUEST_NOT_FOUND",
  409: "REQUEST_ALREADY_ASSIGNED",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMIT_EXCEEDED",
  500: "SERVER_ERROR",
  502: "SERVER_ERROR",
  503: "SERVER_ERROR",
  504: "TIMEOUT_ERROR",
};

export class ApiErrorNormalizer {
  /**
   * Normalize any API error to a consistent format
   */
  static normalize(error: any): NormalizedApiError {
    // If it's already normalized
    if (error && typeof error === "object" && "ok" in error) {
      return error;
    }

    let normalizedError: NormalizedApiError = {
      ok: false,
      error: ERROR_MESSAGES.UNKNOWN_ERROR,
    };

    // Handle different error types
    if (error && typeof error === "object") {
      // API errors with status codes
      if (error.status) {
        normalizedError.status = error.status;
        const errorCode = STATUS_CODE_MAPPING[error.status];
        if (errorCode) {
          normalizedError.code = errorCode;
          normalizedError.error = ERROR_MESSAGES[errorCode];
        }
      }

      // Backend error codes
      if (error.code && error.code in ERROR_MESSAGES) {
        normalizedError.code = error.code;
        normalizedError.error =
          ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES];
      }

      // Custom error messages from backend
      if (error.message) {
        // Check if the message matches any known patterns
        const message = error.message.toLowerCase();

        if (message.includes("network") || message.includes("connection")) {
          normalizedError.code = "NETWORK_ERROR";
          normalizedError.error = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (message.includes("timeout")) {
          normalizedError.code = "TIMEOUT_ERROR";
          normalizedError.error = ERROR_MESSAGES.TIMEOUT_ERROR;
        } else if (
          message.includes("validation") ||
          message.includes("invalid")
        ) {
          normalizedError.code = "VALIDATION_ERROR";
          normalizedError.error = ERROR_MESSAGES.VALIDATION_ERROR;
        } else {
          // Use the original message if it's user-friendly
          normalizedError.error = error.message;
        }
      }

      // Store original error details for debugging
      normalizedError.details = {
        originalError: error,
        timestamp: new Date().toISOString(),
      };
    } else if (typeof error === "string") {
      normalizedError.error = error;
    }

    return normalizedError;
  }

  /**
   * Normalize success response
   */
  static normalizeSuccess<T>(data: T): NormalizedApiSuccess<T> {
    return {
      ok: true,
      data,
    };
  }

  /**
   * Transform any API response to normalized format
   */
  static transformResponse<T>(response: any): NormalizedApiResponse<T> {
    // If response indicates success
    if (response && (response.success === true || response.ok === true)) {
      return this.normalizeSuccess(response.data || response);
    }

    // If response indicates failure
    if (response && (response.success === false || response.ok === false)) {
      return this.normalize(response);
    }

    // For raw data responses (like direct API calls)
    return this.normalizeSuccess(response);
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    const normalized = this.normalize(error);
    return normalized.error;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    const normalized = this.normalize(error);

    const retryableCodes = ["NETWORK_ERROR", "TIMEOUT_ERROR", "SERVER_ERROR"];

    const retryableStatusCodes = [500, 502, 503, 504];

    return (
      (normalized.code && retryableCodes.includes(normalized.code)) ||
      (normalized.status && retryableStatusCodes.includes(normalized.status)) ||
      false
    );
  }

  /**
   * Check if error is authentication related
   */
  static isAuthError(error: any): boolean {
    const normalized = this.normalize(error);

    const authCodes = [
      "INVALID_CREDENTIALS",
      "TOKEN_EXPIRED",
      "UNAUTHORIZED",
      "ACCOUNT_LOCKED",
    ];

    const authStatusCodes = [401, 403];

    return (
      (normalized.code && authCodes.includes(normalized.code)) ||
      (normalized.status && authStatusCodes.includes(normalized.status)) ||
      false
    );
  }

  /**
   * Log error for debugging while showing user-friendly message
   */
  static logAndGetUserMessage(error: any): string {
    const normalized = this.normalize(error);

    // Log detailed error for debugging
    console.error("API Error Details:", {
      userMessage: normalized.error,
      code: normalized.code,
      status: normalized.status,
      details: normalized.details,
    });

    // Return user-friendly message
    return normalized.error;
  }
}

// Convenience functions
export const normalizeApiError = ApiErrorNormalizer.normalize;
export const normalizeApiSuccess = ApiErrorNormalizer.normalizeSuccess;
export const transformApiResponse = ApiErrorNormalizer.transformResponse;
export const getUserErrorMessage = ApiErrorNormalizer.getUserMessage;
export const isRetryableError = ApiErrorNormalizer.isRetryable;
export const isAuthenticationError = ApiErrorNormalizer.isAuthError;
