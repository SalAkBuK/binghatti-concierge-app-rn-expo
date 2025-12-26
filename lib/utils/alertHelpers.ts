import { Alert } from "react-native";
import { getUserErrorMessage } from "../services/api/errors";

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const errorString = JSON.stringify(error).toLowerCase();
  const messageString = error?.message?.toLowerCase() || "";
  const errorCode = error?.code?.toLowerCase() || "";

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
