import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('fleetflow_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) sessionStorage.setItem('fleetflow_user', JSON.stringify(user));
    else sessionStorage.removeItem('fleetflow_user');
  }, [user]);

  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);

  return (
    <AppContext.Provider value={{ user, login, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
