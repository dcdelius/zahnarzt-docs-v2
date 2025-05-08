import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Wenn der Benutzer nicht eingeloggt ist und nicht auf der Login-Seite ist,
      // leite ihn zur Login-Seite weiter
      if (!user && location.pathname !== '/') {
        navigate('/', { replace: true });
      }
      
      // Wenn der Benutzer eingeloggt ist und auf der Login-Seite ist,
      // leite ihn zum Dashboard weiter
      if (user && location.pathname === '/') {
        navigate('/dashboard', { replace: true });
      }
    });

    return unsubscribe;
  }, [navigate, location]);

  const value = {
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 