import { useEffect } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribes to Pusher events for real-time order updates,
 * and patches React Query cache directly.
 */
export function useRealtimeOrders(userId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    window.Pusher = Pusher;
    const echo = new Echo({
      broadcaster: 'pusher',
      key: process.env.REACT_APP_PUSHER_KEY,
      cluster: process.env.REACT_APP_PUSHER_CLUSTER,
      forceTLS: true,
      authEndpoint: '/sanctum/csrf-cookie',
      auth: {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      },
    });

    const channel = echo.private(`account.${userId}`);

    channel.listen('OrderPendingCreated', payload => {
      queryClient.setQueryData(
        ['orders', 'pending'],
        old => [payload, ...(old || [])]
      );
    });
    channel.listen('OrderOpened', payload => {
      queryClient.setQueryData(
        ['orders', 'open'],
        old => [payload, ...(old || [])]
      );
      queryClient.setQueryData(
        ['orders', 'pending'],
        old => (old || []).filter(o => o.id !== payload.id)
      );
    });
    channel.listen('OrderClosed', payload => {
      queryClient.setQueryData(
        ['orders', 'closed'],
        old => [payload, ...(old || [])]
      );
      queryClient.setQueryData(
        ['orders', 'open'],
        old => (old || []).filter(o => o.id !== payload.id)
      );
    });

    return () => {
      channel.stopListening('OrderPendingCreated');
      channel.stopListening('OrderOpened');
      channel.stopListening('OrderClosed');
      echo.leaveChannel(`account.${userId}`);
      echo.disconnect();
    };
  }, [userId, queryClient]);
}
