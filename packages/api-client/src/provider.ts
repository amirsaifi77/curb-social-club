import { createContext, createElement, useContext, type ReactNode } from 'react';

import type { ApiClient } from './client';

const ApiClientContext = createContext<ApiClient | null>(null);

// Hands the app's client to the hooks. Sits inside QueryClientProvider.
export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children?: ReactNode;
}) {
  return createElement(ApiClientContext.Provider, { value: client }, children);
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('useApiClient needs an ApiClientProvider above this component.');
  return client;
}
