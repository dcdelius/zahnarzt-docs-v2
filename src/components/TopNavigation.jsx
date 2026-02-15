import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import CustomDropdown from "./CustomDropdown";

/**
 * TopNavigation - Transparent, adaptive colors
 * 
 * Design: minimal, subtle, round dots, no emojis/icons
 * Fully transparent background, text color adapts to page theme
 */

const navLinks = [
  { to: "/docudent/v10", label: "V10" },
  { to: "/docudent/v10/settings", label: "Settings" },
];

export default function TopNavigation({ users = [], selectedUser = "", onUserChange, onLogout }) {
  const location = useLocation();

  // Check if on a warm-themed page (V10)
  const isWarmPage = location.pathname.startsWith('/docudent/v10');

  // Adaptive colors - V6 uses white text on warm gradient
  const textColor = isWarmPage ? 'rgba(255,255,255,0.7)' : 'rgba(34, 34, 59, 0.6)';
  const textColorMuted = isWarmPage ? 'rgba(255,255,255,0.5)' : 'rgba(34, 34, 59, 0.4)';
  const accentColor = '#FF6B4A';
  const accentBg = isWarmPage ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 107, 74, 0.12)';

  return (
    <nav
      className="w-full flex items-center justify-between px-8 py-3"
      style={{ background: 'transparent' }}
    >
      {/* Logo - Minimal */}
      <motion.div whileHover={{ opacity: 0.7 }} transition={{ duration: 0.2 }}>
        <Link
          to="/docudent/v10"
          className="text-xs font-medium"
          style={{
            color: textColor,
            letterSpacing: '0.12em',
          }}
        >
          DOCUDENT
        </Link>
      </motion.div>

      {/* Navigation Links - Minimal pills */}
      <div className="flex items-center gap-1">
        {navLinks.map(link => {
          const isActive = location.pathname === link.to;

          return (
            <motion.div
              key={link.to}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to={link.to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: isActive ? accentBg : 'transparent',
                  color: isActive ? accentColor : textColorMuted,
                }}
              >
                {isActive && (
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: accentColor }}
                  />
                )}
                {link.label}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* User dropdown - Minimal */}
      {users.length > 0 && onUserChange && (
        <div className="flex items-center gap-2">
          <CustomDropdown
            label=""
            value={selectedUser}
            options={[
              ...users.map(u => ({ value: u.id, label: u.name })),
              { value: "__logout__", label: "Logout" }
            ]}
            onChange={val => {
              if (val === "__logout__" && onLogout) {
                onLogout();
              } else if (onUserChange) {
                onUserChange(val);
              }
            }}
            color={textColor}
            size="small"
          />
        </div>
      )}
    </nav>
  );
}
