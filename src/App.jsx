import React, { Suspense, lazy, useState } from "react";
import { FiMail, FiLock } from "react-icons/fi";
import { motion } from "framer-motion";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./contexts/AuthContext";
import Layout from './components/Layout';
import { Toaster } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// LAZY IMPORTS - Active Tools Only
// ═══════════════════════════════════════════════════════════════
const HomePage = lazy(() => import('./pages/HomePage'));
const DocudentV5 = lazy(() => import('./docudent/v5/pages/DocudentV5Page'));
const DocudentV6 = lazy(() => import('./docudent/v6/pages/DocudentV6Page').then(m => ({ default: m.DocudentV6Page })));
const DocudentV7 = lazy(() => import('./docudent/v7/pages/DocudentV7Page').then(m => ({ default: m.DocudentV7Page })));

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
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
        DOCUDENT
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

        {error && (
          <p className="text-red-500 text-sm text-center mt-2">{error}</p>
        )}
      </motion.div>
    </div>
  );
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="relative">
      <Toaster position="bottom-right" expand={true} richColors />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* CLEAN ROUTES - Only Docudent */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <Route path="/" element={<Login />} />
            <Route path="/home" element={<HomePage />} />

            {/* Docudent V5 - Primary Tool */}
            <Route path="/docudent" element={<DocudentV5 />} />
            <Route path="/docudent/v5" element={<DocudentV5 />} />

            {/* Docudent V6 - New Clean Architecture */}
            <Route path="/docudent/v6" element={<DocudentV6 />} />

            {/* Docudent V7 - Pure Renderer (Reality Gate) */}
            <Route path="/docudent/v7" element={<DocudentV7 />} />

            {/* Legacy redirects */}
            <Route path="/dashboard" element={<Navigate to="/home" replace />} />
            <Route path="/sonia-v3" element={<Navigate to="/docudent" replace />} />
            <Route path="/sonia-flow" element={<Navigate to="/docudent" replace />} />
            <Route path="/docudent-v5" element={<Navigate to="/docudent" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;