import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { HomeIcon, BookOpenIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { FiUser } from "react-icons/fi";
import CustomDropdown from "./CustomDropdown";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: <HomeIcon className="h-5 w-5 mr-2" /> },
  { to: "/medical-knowledge", label: "Wissensdatenbank", icon: <BookOpenIcon className="h-5 w-5 mr-2" /> },
  { to: "/settings", label: "Einstellungen", icon: <Cog6ToothIcon className="h-5 w-5 mr-2" /> },
];

export default function TopNavigation({ users = [], selectedUser = "", onUserChange, onLogout }) {
  const location = useLocation();
  
  return (
    <nav className="w-full bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-sm flex items-center justify-between px-10 py-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#ff9900] flex items-center justify-center">
          <span className="text-white text-2xl font-extrabold">d</span>
        </div>
        <span className="text-xl font-bold text-[#22223b] tracking-tight">docudent.</span>
      </div>
      {/* Navigation Links */}
      <div className="flex items-center gap-8 text-base font-medium">
        {navLinks.map(link => (
          <motion.div
            key={link.to}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center"
          >
            <Link
              to={link.to}
              className={`flex items-center transition-colors ${
                location.pathname === link.to 
                  ? "text-[#ff9900] font-semibold" 
                  : "text-[#22223b] hover:text-[#ff9900]"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          </motion.div>
        ))}
      </div>
      {/* Right Side: Behandler */}
      {users.length > 0 && onUserChange && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#ff9900] flex items-center justify-center text-white text-xl font-extrabold">
            <FiUser />
          </div>
          <div className="flex flex-col min-w-[180px]">
            <CustomDropdown
              label="Behandler"
              value={selectedUser}
              options={[
                ...users.map(u => ({ value: u.id, label: u.name })),
                { value: "__logout__", label: "Abmelden" }
              ]}
              onChange={val => {
                if (val === "__logout__" && onLogout) {
                  onLogout();
                } else if (onUserChange) {
                  onUserChange(val);
                }
              }}
              color="#22223b"
              size="small"
            />
          </div>
        </div>
      )}
    </nav>
  );
} 