import { useState, useEffect } from 'react';

// Simplificado - substituir por Supabase Auth
export function useAuth() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setUser({ id: userId });
    }
    setLoading(false);
  }, []);

  const login = (userId: string) => {
    localStorage.setItem('userId', userId);
    setUser({ id: userId });
  };

  const logout = () => {
    localStorage.removeItem('userId');
    setUser(null);
  };

  return { user, loading, login, logout };
}
