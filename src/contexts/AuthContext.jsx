import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext();

// ═══════════════════════════════════════════════════════════════
// E2E TEST MODE — STRICT BYPASS WITH MULTIPLE GUARDS
// 
// Bypass is ONLY active when ALL conditions are met:
// 1. VITE_E2E_BYPASS_AUTH=1 (build-time flag)
// 2. Host is localhost or 127.0.0.1
// 3. Browser is automated (navigator.webdriver === true)
// 4. Playwright handshake was set (window.__DOCUDENT_E2E_BYPASS_AUTH)
//
// If flag is set but guards fail → normal auth, console.warn once
// ═══════════════════════════════════════════════════════════════

function checkE2EBypassAllowed() {
  // Guard 1: Build-time flag must be set
  const flagSet = import.meta.env.VITE_E2E_BYPASS_AUTH === '1';
  if (!flagSet) {
    // Also check legacy DEV-only flags
    if (import.meta.env.DEV === true && (
      import.meta.env.VITE_E2E_TEST_MODE === 'true' ||
      import.meta.env.VITE_STUB_EXTRACTION === 'true' ||
      import.meta.env.VITE_V7_E2E_LIVE === '1'
    )) {
      return true; // Legacy DEV flags still work in DEV mode
    }
    return false;
  }

  // Guard 2: Must be localhost
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  // Guard 3: Must be automated browser (Playwright/Puppeteer)
  const isAutomated = typeof navigator !== 'undefined' && navigator.webdriver === true;

  // Guard 4: Playwright handshake must be set
  const hasHandshake = typeof window !== 'undefined' &&
    window.__DOCUDENT_E2E_BYPASS_AUTH === true;

  // All guards must pass
  if (flagSet && (!isLocalhost || !isAutomated || !hasHandshake)) {
    // Only warn once
    if (typeof window !== 'undefined' && !window.__e2eBypassWarned) {
      console.warn(
        '[AuthContext] E2E bypass flag set but guards failed:',
        { isLocalhost, isAutomated, hasHandshake },
        '→ Using normal auth'
      );
      window.__e2eBypassWarned = true;
    }
    return false;
  }

  return flagSet && isLocalhost && isAutomated && hasHandshake;
}

const isE2EMode = checkE2EBypassAllowed();

// Mock user for E2E mode to prevent UI breakage
const E2E_MOCK_USER = {
  uid: 'e2e-test-user',
  email: 'e2e@local.test',
  displayName: 'E2E Test User',
};

function getActivePracticeId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('docudent_practice_id');
}

function mapPracticeRoleFromClaims(claims) {
  const practiceId = getActivePracticeId();
  const practiceRoles = (practiceId && claims?.practices?.[practiceId]) || [];
  if (practiceRoles.includes('practice_admin')) return 'practice_admin';
  if (practiceRoles.includes('provider')) return 'provider';
  if (practiceRoles.includes('assistant')) return 'assistant';
  if (claims?.isSoftwareAdmin) return 'practice_admin';
  return null;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // In E2E mode, start with mock user to avoid loading states
  const [user, setUser] = useState(isE2EMode ? E2E_MOCK_USER : null);
  const [actorRole, setActorRole] = useState(isE2EMode ? 'practice_admin' : null);
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
      if (user) {
        user.getIdTokenResult()
          .then((tokenResult) => {
            setActorRole(mapPracticeRoleFromClaims(tokenResult.claims));
          })
          .catch(() => {
            setActorRole(null);
          });
      } else {
        setActorRole(null);
      }
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
    loading,
    actorRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 
