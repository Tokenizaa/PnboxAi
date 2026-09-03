import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  AuthState,
  AuthAction,
  AuthResponse,
  AuthSession,
  User,
  AuthContextValue,
} from '../types/auth';
import { setAuthTokenGetter } from '../utils/authFetch';

const STORAGE_KEY = 'pnboxai_auth_session';
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

const initialState: AuthState = {
  session: {
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isAuthenticated: false,
  },
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };

    case 'AUTH_SUCCESS': {
      const { user, accessToken, refreshToken, expiresIn } = action.payload;
      const expiresAt = Date.now() + expiresIn * 1000;
      const newSession: AuthSession = {
        user,
        accessToken,
        refreshToken,
        expiresAt,
        isAuthenticated: true,
      };
      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      } catch {
        // Ignore storage errors
      }
      return { ...state, session: newSession, isLoading: false, error: null };
    }

    case 'AUTH_FAILURE':
      return { ...state, isLoading: false, error: action.payload };

    case 'AUTH_LOGOUT': {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
      return {
        ...state,
        session: initialState.session,
        isLoading: false,
        error: null,
      };
    }

    case 'AUTH_RESTORE':
      return {
        ...state,
        session: action.payload,
        isLoading: false,
        error: null,
      };

    case 'AUTH_CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Register token getter for apiCall utility
  useEffect(() => {
    setAuthTokenGetter(() => state.session.accessToken);
  }, [state.session.accessToken]);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session: AuthSession = JSON.parse(stored);
          // Check if token is still valid (with buffer)
          if (session.expiresAt && session.expiresAt > Date.now() + REFRESH_THRESHOLD_MS) {
            dispatch({ type: 'AUTH_RESTORE', payload: session });
            return;
          }
          // Token expired or near expiry - try refresh
          if (session.refreshToken) {
            // We'll attempt refresh in the background
            dispatch({ type: 'AUTH_RESTORE', payload: session });
            return;
          }
        }
      } catch {
        // Invalid storage - clear it
        localStorage.removeItem(STORAGE_KEY);
      }
      dispatch({ type: 'AUTH_RESTORE', payload: initialState.session });
    };

    restoreSession();
  }, []);

  // Auto-refresh token when near expiry
  useEffect(() => {
    if (!state.session.isAuthenticated || !state.session.expiresAt) return;

    const timeUntilExpiry = state.session.expiresAt - Date.now();
    if (timeUntilExpiry <= 0) {
      // Already expired - try refresh
      refreshAccessToken();
      return;
    }

    if (timeUntilExpiry <= REFRESH_THRESHOLD_MS) {
      // Near expiry - refresh proactively
      refreshAccessToken();
      return;
    }

    // Schedule refresh check
    const timer = setTimeout(() => {
      refreshAccessToken();
    }, timeUntilExpiry - REFRESH_THRESHOLD_MS);

    return () => clearTimeout(timer);
  }, [state.session.expiresAt, state.session.isAuthenticated]);

  const apiCall = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // Add auth header if we have a token
      if (state.session.accessToken) {
        headers['Authorization'] = `Bearer ${state.session.accessToken}`;
      }

      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return response.json();
    },
    [state.session.accessToken]
  );

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      dispatch({ type: 'AUTH_START' });
      try {
        const response = await apiCall<AuthResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        dispatch({ type: 'AUTH_SUCCESS', payload: response });
      } catch (error) {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: error instanceof Error ? error.message : 'Falha no login',
        });
        throw error;
      }
    },
    [apiCall]
  );

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => {
      dispatch({ type: 'AUTH_START' });
      try {
        const response = await apiCall<AuthResponse>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        dispatch({ type: 'AUTH_SUCCESS', payload: response });
      } catch (error) {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: error instanceof Error ? error.message : 'Falha no cadastro',
        });
        throw error;
      }
    },
    [apiCall]
  );

  const logout = useCallback(async () => {
    // Call logout endpoint to invalidate server-side session
    if (state.session.accessToken) {
      try {
        await apiCall('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore logout errors - clear local state anyway
      }
    }
    dispatch({ type: 'AUTH_LOGOUT' });
  }, [apiCall, state.session.accessToken]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!state.session.refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.session.refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - logout
        dispatch({ type: 'AUTH_LOGOUT' });
        return false;
      }

      const data = await response.json();
      const { accessToken, refreshToken, expiresIn } = data;
      const expiresAt = Date.now() + expiresIn * 1000;

      const newSession: AuthSession = {
        ...state.session,
        accessToken,
        refreshToken: refreshToken || state.session.refreshToken,
        expiresAt,
        isAuthenticated: true,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      } catch {
        // Ignore
      }

      dispatch({ type: 'AUTH_RESTORE', payload: newSession });
      return true;
    } catch {
      dispatch({ type: 'AUTH_LOGOUT' });
      return false;
    }
  }, [state.session.refreshToken, state.session]);

  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  const value: AuthContextValue = {
    ...state,
    user: state.session.user,
    isAuthenticated: state.session.isAuthenticated,
    login,
    register,
    logout,
    refreshAccessToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}