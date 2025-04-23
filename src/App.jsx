import { useState } from "react";
import { FiMail, FiLock } from "react-icons/fi";
import { motion } from "framer-motion";
import { useNavigate, Routes, Route } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import Dashboard from './Dashboard';
import MedicalKnowledgeDashboard from './MedicalKnowledgeDashboard';
import Settings from './Settings';
import EmailResponder from './components/EmailResponder';
import Layout from './components/Layout';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error.message);
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

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/knowledge" element={<MedicalKnowledgeDashboard />} />
        <Route path="/medical-knowledge" element={<MedicalKnowledgeDashboard />} />
        <Route path="/email" element={<EmailResponder />} />
      </Route>
    </Routes>
  );
}

export default App;