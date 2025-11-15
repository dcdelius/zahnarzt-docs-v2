import React, { Suspense, lazy, useRef, useEffect } from "react";
import { FiMail, FiLock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./contexts/AuthContext";
import Layout from './components/Layout';

// Lazy Loading für bessere Performance und kein weißer Flash
const Dashboard = lazy(() => import('./Dashboard'));
const MedicalKnowledgeDashboard = lazy(() => import('./MedicalKnowledgeDashboard'));
const Settings = lazy(() => import('./Settings'));
const EmailResponder = lazy(() => import('./components/EmailResponder'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

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
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Loading Component für Suspense
  const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  // Bestimme Richtung für Slide-Animation
  const getDirection = (currentPath, prevPath) => {
    const dashboardPaths = ['/dashboard'];
    const knowledgePaths = ['/medical-knowledge', '/knowledge'];
    const settingsPaths = ['/settings'];
    
    const isDashboard = dashboardPaths.includes(currentPath);
    const isKnowledge = knowledgePaths.includes(currentPath);
    const isSettings = settingsPaths.includes(currentPath);
    const wasDashboard = dashboardPaths.includes(prevPath);
    const wasKnowledge = knowledgePaths.includes(prevPath);
    const wasSettings = settingsPaths.includes(prevPath);
    
    // Dashboard -> Knowledge: von rechts rein (direction = 1)
    // Knowledge -> Dashboard: von links rein (direction = -1)
    // Dashboard -> Settings: von rechts rein (direction = 1)
    // Settings -> Dashboard: von links rein (direction = -1)
    // Knowledge -> Settings: von rechts rein (direction = 1)
    // Settings -> Knowledge: von links rein (direction = -1)
    
    if (isKnowledge && wasDashboard) return 1;
    if (isDashboard && wasKnowledge) return -1;
    if (isSettings && wasDashboard) return 1;
    if (isDashboard && wasSettings) return -1;
    if (isSettings && wasKnowledge) return 1;
    if (isKnowledge && wasSettings) return -1;
    
    // Standard: von rechts
    return 1;
  };

  const prevPathRef = useRef(location.pathname);
  const direction = getDirection(location.pathname, prevPathRef.current);
  
  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Slide-Animation Variants
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0
    })
  };

  return (
    <div className="relative">
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <Routes location={location} key={location.pathname}>
            <Route element={<Layout />}>
              <Route path="/" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <motion.div
                    key="dashboard"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.4
                    }}
                    className="absolute inset-0"
                  >
                    <Dashboard />
                  </motion.div>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <motion.div
                    key="settings"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.4
                    }}
                    className="absolute inset-0"
                  >
                    <Settings />
                  </motion.div>
                } 
              />
              <Route 
                path="/knowledge" 
                element={
                  <motion.div
                    key="knowledge"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.4
                    }}
                    className="absolute inset-0"
                  >
                    <MedicalKnowledgeDashboard />
                  </motion.div>
                } 
              />
              <Route 
                path="/medical-knowledge" 
                element={
                  <motion.div
                    key="medical-knowledge"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.4
                    }}
                    className="absolute inset-0"
                  >
                    <MedicalKnowledgeDashboard />
                  </motion.div>
                } 
              />
              <Route 
                path="/email" 
                element={
                  <motion.div
                    key="email"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.4
                    }}
                    className="absolute inset-0"
                  >
                    <EmailResponder />
                  </motion.div>
                } 
              />
              <Route 
                path="/landing" 
                element={
                  <motion.div
                    key="landing"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.4
                    }}
                    className="absolute inset-0"
                  >
                    <LandingPage />
                  </motion.div>
                } 
              />
            </Route>
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

export default App;