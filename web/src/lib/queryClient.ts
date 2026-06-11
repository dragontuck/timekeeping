import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes
            retry: (failureCount, error) => {
                // Don't retry on 4xx
                const status = (error as { response?: { status: number } })?.response?.status;
                if (status && status >= 400 && status < 500) return false;
                return failureCount < 2;
            },
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: false,
        },
    },
});
