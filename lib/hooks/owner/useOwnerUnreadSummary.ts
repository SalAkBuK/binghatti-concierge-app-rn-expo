import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { useOptionalOwnerNotifications } from '../../context/owner-notifications-context';
import { ownerPortalApi } from '../../services/api/owner-portal';

type UseOwnerUnreadSummaryOptions = {
  enabled?: boolean;
};

export const useOwnerUnreadSummary = (
  options?: UseOwnerUnreadSummaryOptions,
) => {
  const enabled = options?.enabled ?? true;
  const context = useOptionalOwnerNotifications();

  if (enabled && context) {
    return context;
  }

  const [conversationUnreadCount, setConversationUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [requestCommentUnreadCount, setRequestCommentUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);
  const [notificationsRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setConversationUnreadCount(0);
      setNotificationUnreadCount(0);
      setRequestCommentUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [conversations, notifications, requestComments] = await Promise.all([
        ownerPortalApi.getConversationUnreadCount(),
        ownerPortalApi.getNotificationUnreadCount(),
        ownerPortalApi.getUnreadRequestCommentCount(),
      ]);

      setConversationUnreadCount(conversations);
      setNotificationUnreadCount(notifications);
      setRequestCommentUnreadCount(requestComments);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    conversationUnreadCount,
    notificationUnreadCount,
    requestCommentUnreadCount,
    totalUnreadCount:
      conversationUnreadCount +
      notificationUnreadCount +
      requestCommentUnreadCount,
    isLoading,
    notificationsRefreshKey,
    refresh,
  };
};
