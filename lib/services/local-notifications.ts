import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

type NotifyInput = {
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown>;
};

let initialized = false;

export const configureLocalNotifications = async (): Promise<void> => {
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
