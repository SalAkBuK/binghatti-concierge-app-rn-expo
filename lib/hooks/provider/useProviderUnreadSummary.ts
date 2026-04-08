import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { providerPortalApi } from '../../services/api/provider-portal';

type UseProviderUnreadSummaryOptions = {
  enabled?: boolean;
};

export const useProviderUnreadSummary = (
  options?: UseProviderUnreadSummaryOptions,
) => {
  const enabled = options?.enabled ?? true;
  const [requestCommentUnreadCount, setRequestCommentUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRequestCommentUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const unreadCount = await providerPortalApi.getUnreadRequestCommentCount();
      setRequestCommentUnreadCount(unreadCount);
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
    requestCommentUnreadCount,
    totalUnreadCount: requestCommentUnreadCount,
    isLoading,
    refresh,
  };
};
