import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

/**
 * Navigation - Warm Dark Coral Theme
 * 
 * Design principles:
 * - Small and subtle
 * - Round items/dots
 * - No emojis
 * - Dark coral aesthetic
 */

const navItems = [
  { path: "/dashboard", label: "Home" },
  { path: "/docudent/v10", label: "V10", highlight: true },
  { path: "/docudent-v5", label: "V5" },
  { path: "/settings", label: "Settings" }
];

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Check if on V10 page - use transparent nav
  const isV10Page = location.pathname.startsWith('/docudent/v10');

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: isV10Page
          ? 'transparent'
          : 'rgba(44, 26, 30, 0.95)',
        backdropFilter: isV10Page ? 'none' : 'blur(12px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo - Minimal */}
          <motion.div
            whileHover={{ opacity: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              to="/dashboard"
              className="text-sm font-medium tracking-wide"
              style={{
                color: isV10Page ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.7)',
                letterSpacing: '0.1em',
              }}
            >
              DOCUDENT
            </Link>
          </motion.div>

          {/* Navigation Items - Minimal dots + labels */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <motion.div
                  key={item.path}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={item.path}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: isActive
                        ? 'rgba(255, 107, 74, 0.15)'
                        : item.highlight && !isActive
                          ? 'rgba(255, 107, 74, 0.08)'
                          : 'transparent',
                      color: isActive
                        ? '#FF6B4A'
                        : item.highlight && !isActive
                          ? '#FF6B4A'
                          : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {/* Active dot */}
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#FF6B4A' }}
                      />
                    )}
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}

            {/* Divider */}
            <div
              className="w-px h-4 mx-2"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />

            {/* Logout - Subtle */}
            <motion.button
              onClick={handleLogout}
              whileHover={{ opacity: 0.8 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2 rounded-full text-xs transition-all"
              style={{
                color: 'rgba(255,255,255,0.4)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Logout
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}