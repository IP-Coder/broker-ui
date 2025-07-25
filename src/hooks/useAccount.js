import { useQuery } from '@tanstack/react-query';
import api from '../api/api';

/**
 * Fetch current user account details.
 * Cached for 5 minutes, no refetch on window focus.
 */
export default function useAccount() {
  return useQuery(
    ['account'],
    () => api.get('/account').then(res => res.data.account),
    {
      staleTime: 300_000,
      refetchOnWindowFocus: false,
    }
  );
}
