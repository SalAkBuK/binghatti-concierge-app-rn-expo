import { Alert } from "react-native";
import { getUserErrorMessage } from "../services/api/errors";

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const toLowerSafe = (value: unknown) => {
    if (typeof value === "string") return value.toLowerCase();
    if (typeof value === "number") return String(value).toLowerCase();
    if (!value) return "";
    try {
      return JSON.stringify(value).toLowerCase();
    } catch {
      return "";
    }
  };

  const errorString = toLowerSafe(error);
  const messageString = toLowerSafe(error?.message);
  const errorCode = toLowerSafe(error?.code);

  // Common network error patterns
  const networkPatterns = [
    "network",
    "connection",
    "internet",
    "offline",
    "no connection",
    "failed to fetch",
    "network request failed",
    "unable to connect",
    "enotfound",
    "etimedout",
    "econnrefused",
    "econnreset",
  ];

  return (
    networkPatterns.some(
      (pattern) =>
        errorString.includes(pattern) ||
        messageString.includes(pattern) ||
        errorCode.includes(pattern)
    ) ||
    error?.code === "NETWORK_ERROR" ||
    error?.name === "NetworkError" ||
    error?.type === "network"
  );
}

/**
 * Get appropriate error message and title based on error type
 */
export function getErrorDetails(error: any): {
  title: string;
  message: string;
} {
  // Check if it's a network error
  if (isNetworkError(error)) {
    return {
      title: "Alert",
      message: "No internet available. Please check your connection and try again.",
    };
  }

  // For all other errors, use the normalized error message
  const errorMessage = getUserErrorMessage(error);

  return {
    title: "Alert",
    message: errorMessage,
  };
}

/**
 * Show an alert with proper error handling
 * Automatically detects network errors and shows appropriate message
 */
export function showErrorAlert(error: any, customMessage?: string): void {
  const { title, message } = getErrorDetails(error);

  Alert.alert(title, customMessage || message);
}

/**
 * Show a success alert
 */
export function showSuccessAlert(message: string): void {
  Alert.alert("Success", message);
}

/**
 * Show a confirmation alert
 */
export function showConfirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  Alert.alert(title, message, [
    {
      text: "Cancel",
      style: "cancel",
      onPress: onCancel,
    },
    {
      text: "Confirm",
      onPress: onConfirm,
    },
  ]);
}

/**
 * Show an alert with custom title
 */
export function showAlert(title: string, message: string): void {
  Alert.alert(title, message);
}
