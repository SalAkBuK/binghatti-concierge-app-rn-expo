import AsyncStorage from "@react-native-async-storage/async-storage";

export type CrashReport = {
  id: string;
  name?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
};

const CRASH_REPORT_KEY = "binghatti_last_crash_report";

const safeString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const recordCrash = async (
  error: unknown,
  errorInfo?: { componentStack?: string | null },
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    const errorObj = error as Error | null;
    const report: CrashReport = {
      id: timestamp,
      name: errorObj?.name,
      message: errorObj?.message ? errorObj.message : safeString(error),
      stack: errorObj?.stack,
      componentStack: errorInfo?.componentStack ?? undefined,
      timestamp,
    };

    await AsyncStorage.setItem(CRASH_REPORT_KEY, JSON.stringify(report));
  } catch (storageError) {
    console.warn("[CrashReport] Failed to persist crash report:", storageError);
  }
};

export const getLastCrashReport = async (): Promise<CrashReport | null> => {
  try {
    const payload = await AsyncStorage.getItem(CRASH_REPORT_KEY);
    if (!payload) return null;
    return JSON.parse(payload) as CrashReport;
  } catch (error) {
    console.warn("[CrashReport] Failed to read crash report:", error);
    return null;
  }
};

export const clearLastCrashReport = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CRASH_REPORT_KEY);
  } catch (error) {
    console.warn("[CrashReport] Failed to clear crash report:", error);
  }
};

export const formatCrashReport = (report: CrashReport): string => {
  return [
    `id: ${report.id}`,
    `timestamp: ${report.timestamp}`,
    report.name ? `name: ${report.name}` : null,
    `message: ${report.message}`,
    report.stack ? `stack:\n${report.stack}` : null,
    report.componentStack ? `componentStack:\n${report.componentStack}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};
