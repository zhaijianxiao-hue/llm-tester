import { useQuery } from '@tanstack/react-query'
import { getProviders, getModels } from '../lib/api'

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: getProviders,
  })
}

export function useModels(provider: string | null) {
  return useQuery({
    queryKey: ['models', provider],
    queryFn: () => provider ? getModels(provider) : [],
    enabled: !!provider,
  })
}