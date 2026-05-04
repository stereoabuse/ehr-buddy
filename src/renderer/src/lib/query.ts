import type { QueryClient } from '@tanstack/react-query'

export function invalidateSessionDerivedQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['sessions'] })
  void queryClient.invalidateQueries({ queryKey: ['clients', 'roster'] })
}
