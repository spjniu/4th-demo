import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type AuthContextValue = {
  token: string | null;
  userName: string;
  isAuthenticated: boolean;
  login: (token: string, name?: string) => void;
  logout: () => void;
  setUserName: (name: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [userName, setUserNameState] = useState<string>(() => localStorage.getItem('userName') ?? '회원');

  const login = (newToken: string, name?: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    if (name) {
      localStorage.setItem('userName', name);
      setUserNameState(name);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setUserNameState('회원');
  };

  const setUserName = (name: string) => {
    localStorage.setItem('userName', name);
    setUserNameState(name);
  };

  // client.ts에서 401 응답 시 dispatch하는 이벤트 수신
  useEffect(() => {
    const handleAuthLogout = () => logout();
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userName, isAuthenticated: !!token, login, logout, setUserName }}>
      {children}
    </AuthContext.Provider>
  );
}

// 페이지/컴포넌트에서 사용:
//   const { token, isAuthenticated, login, logout } = useAuth();
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
