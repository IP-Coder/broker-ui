import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/api';

/**
 * Fetch orders by status: 'pending', 'open', or 'closed'.
 * Caches results for 10 minutes, no refetch on window focus.
 */
export function useOrders(status) {
  return useQuery(
    ['orders', status],
    () => api.get(`/orders?status=${status}`).then(res => res.data.orders),
    {
      staleTime: 600_000,
      refetchOnWindowFocus: false,
    }
  );
}

/**
 * Mutation to close an order. Invalidates 'open' and 'closed' lists on success.
 */
export function useCloseOrder() {
  const queryClient = useQueryClient();
  return useMutation(
    orderId => api.post('/order/close', { order_id: orderId }),
    {
      onSuccess: (_, orderId) => {
        queryClient.invalidateQueries(['orders', 'open']);
        queryClient.invalidateQueries(['orders', 'closed']);
      },
    }
  );
}
