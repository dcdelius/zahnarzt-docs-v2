import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext();

// ═══════════════════════════════════════════════════════════════
// E2E TEST MODE — SAFE BYPASS
// Only active when BOTH conditions are true:
// 1. DEV mode (import.meta.env.DEV === true)
// 2. VITE_E2E_TEST_MODE=true environment variable
// This allows Playwright to access pages without Firebase auth.
// ═══════════════════════════════════════════════════════════════
const isE2EMode =
  import.meta.env.DEV === true &&
  import.meta.env.VITE_E2E_TEST_MODE === 'true';

// Mock user for E2E mode to prevent UI breakage
const E2E_MOCK_USER = {
  uid: 'e2e-test-user',
  email: 'e2e@local.test',
  displayName: 'E2E Test User',
};

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // In E2E mode, start with mock user to avoid loading states
  const [user, setUser] = useState(isE2EMode ? E2E_MOCK_USER : null);
  const [loading, setLoading] = useState(!isE2EMode);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // In E2E mode, skip Firebase auth entirely
    if (isE2EMode) {
      return;
    }

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