import React, { useState, useEffect, useRef } from "react";
import { FiMail, FiLock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./contexts/AuthContext";
import Dashboard from './Dashboard';
import MedicalKnowledgeDashboard from './MedicalKnowledgeDashboard';
import Settings from './Settings';
import EmailResponder from './components/EmailResponder';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user } = useAuth();

  const handleLogin = async () => {
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      // Die Navigation wird jetzt vom AuthProvider übernommen
    } catch (error) {
      console.error("Login failed:", error.message);
      setError("Login fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <motion.h1
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="text-white text-5xl tracking-[0.3em] font-bold mb-4 drop-shadow-xl"
      >
        EVIDENTIA
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="w-[180px] h-[3px] bg-white mb-10 rounded-full"
      />

      <motion.div
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -200 }}
        transition={{ duration: 0.6 }}
        className="backdrop-blur-md bg-white/50 rounded-2xl shadow-2xl p-8 w-full max-w-sm"
      >
        <h2 className="text-xl font-semibold text-center mb-1 text-gray-900">Login</h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          Willkommen zurück! Bitte logge dich ein.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <FiMail className="absolute top-3.5 left-3 text-gray-400" />
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="relative">
            <FiLock className="absolute top-3.5 left-3 text-gray-400" />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
        >
          Einloggen
        </button>

        <p className="text-sm text-center text-gray-700 mt-4">
          Noch kein Account?{" "}
          <a href="#" className="text-blue-600 hover:underline">
            Registrieren
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// Page Transition Variants für Dashboard <-> Wissensdatenbank
// Mit weißem Übergang zwischen den Seiten
const pageVariants = {
  initial: (direction) => ({
    x: direction === 'forward' ? '100%' : '-100%',
    opacity: 0
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
      duration: 0.5,
      delay: 0.1 // Kurze Verzögerung für weißen Moment
    }
  },
  exit: (direction) => ({
    x: direction === 'forward' ? '-100%' : '100%',
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
      duration: 0.3
    }
  })
};

function AnimatedRoute({ children }) {
  return <>{children}</>;
}

function App() {
  const { loading } = useAuth();
  const location = useLocation();

  // Speichere vorherige Route für Richtungsbestimmung
  useEffect(() => {
    const prevPath = sessionStorage.getItem('currentPath');
    if (prevPath && prevPath !== location.pathname) {
      sessionStorage.setItem('prevPath', prevPath);
    }
    sessionStorage.setItem('currentPath', location.pathname);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const [showWhiteTransition, setShowWhiteTransition] = useState(false);
  const prevPathRef = useRef(location.pathname);

  // Erkenne Wechsel zwischen Dashboard und Wissensdatenbank
  useEffect(() => {
    const isDashboardOrKnowledge = 
      location.pathname === '/dashboard' || 
      location.pathname === '/medical-knowledge' || 
      location.pathname === '/knowledge';
    const wasDashboardOrKnowledge = 
      prevPathRef.current === '/dashboard' || 
      prevPathRef.current === '/medical-knowledge' || 
      prevPathRef.current === '/knowledge';
    
    if (isDashboardOrKnowledge && wasDashboardOrKnowledge && prevPathRef.current !== location.pathname) {
      setShowWhiteTransition(true);
      setTimeout(() => setShowWhiteTransition(false), 200);
    }
    
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className="relative">
      {/* Weißer Übergang - Erscheint zwischen Dashboard und Wissensdatenbank */}
      <AnimatePresence>
        {showWhiteTransition && (
          <motion.div
            key="white-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route element={<Layout />}>
            <Route path="/" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <AnimatedRoute path="/dashboard">
                  <Dashboard />
                </AnimatedRoute>
              } 
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="/knowledge" element={<MedicalKnowledgeDashboard />} />
            <Route 
              path="/medical-knowledge" 
              element={
                <AnimatedRoute path="/medical-knowledge">
                  <MedicalKnowledgeDashboard />
                </AnimatedRoute>
              } 
            />
            <Route path="/email" element={<EmailResponder />} />
            <Route path="/landing" element={<LandingPage />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;