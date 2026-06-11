import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { api, setAccessToken, getAccessToken } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import type { User } from '../types';

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMe = useCallback(async () => {
        try {
            const res = await api.get<{ data: User }>('/auth/me');
            setUser(res.data.data);
        } catch {
            setUser(null);
            setAccessToken(null);
        }
    }, []);

    // On mount: try to restore session via refresh token cookie
    useEffect(() => {
        const restore = async () => {
            if (getAccessToken()) {
                await fetchMe();
            } else {
                try {
                    const res = await api.post<{ data: { accessToken: string } }>('/auth/refresh');
                    setAccessToken(res.data.data.accessToken);
                    await fetchMe();
                } catch {
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        void restore();
    }, [fetchMe]);

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post<{
            data: { accessToken: string; user: User };
        }>('/auth/login', { email, password });
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            setAccessToken(null);
            setUser(null);
            queryClient.clear();
        }
    }, []);

    const refreshUser = useCallback(async () => {
        await fetchMe();
    }, [fetchMe]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
    return ctx;
}
