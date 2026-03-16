import { Platform } from "react-native";
import Constants from "expo-constants";
import type { PushDevicePlatform, PushDeviceProvider } from "./api/types";

type NotificationsModule = typeof import("expo-notifications");

type NotifyInput = {
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown>;
};

export type PushDeviceRegistration = {
  token: string;
  provider: PushDeviceProvider;
  platform: PushDevicePlatform;
};

let initialized = false;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

const isExpoGo = (): boolean => {
  const ownership = (Constants as any)?.appOwnership;
  const executionEnvironment = (Constants as any)?.executionEnvironment;
  return ownership === "expo" || executionEnvironment === "storeClient";
};

const getNotificationsModule = async (): Promise<NotificationsModule | null> => {
  if (isExpoGo()) return null;
  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications");
  }
  return notificationsModulePromise;
};

const resolveExpoProjectId = (): string | null => {
  const easProjectId =
    (Constants as any)?.easConfig?.projectId ??
    (Constants as any)?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.manifest2?.extra?.eas?.projectId ??
    null;
  return typeof easProjectId === "string" && easProjectId.trim().length > 0
    ? easProjectId
    : null;
};

const resolvePushPlatform = (): PushDevicePlatform => {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return "WEB";
};

export const configureLocalNotifications = async (): Promise<void> => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  if (!initialized) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    initialized = true;
  }
};

export const ensureNotificationPermissions = async (): Promise<boolean> => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  await configureLocalNotifications();

  const current = await Notifications.getPermissionsAsync();
  const alreadyGranted =
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (alreadyGranted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
};

export const playIncomingNotificationSound = async (
  input: NotifyInput,
): Promise<void> => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title?.trim() || "Notification",
      body: input.body?.trim() || "",
      data: input.data ?? {},
      sound: "default",
    },
    trigger: null,
  });
};

export const getPushDeviceRegistration =
  async (): Promise<PushDeviceRegistration | null> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      if (__DEV__) {
        console.log(
          "[Push] expo-notifications unavailable (likely Expo Go or unsupported runtime)",
        );
      }
      return null;
    }

    const granted = await ensureNotificationPermissions();
    if (!granted) {
      if (__DEV__) {
        console.log("[Push] Notification permission not granted");
      }
      return null;
    }

    const projectId = resolveExpoProjectId();
    let expoPushToken;
    try {
      expoPushToken = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
    } catch (error) {
      if (__DEV__) {
        console.log("[Push] Failed to get Expo push token", error);
      }
      return null;
    }

    const token = expoPushToken?.data?.trim();
    if (!token) {
      if (__DEV__) {
        console.log("[Push] Expo push token response was empty");
      }
      return null;
    }

    return {
      token,
      provider: "EXPO",
      platform: resolvePushPlatform(),
    };
  };
