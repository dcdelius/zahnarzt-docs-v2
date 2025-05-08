import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { HomeIcon, BookOpenIcon, EnvelopeIcon, Cog6ToothIcon, StarIcon } from "@heroicons/react/24/outline";

const navLinks = [
  { to: "/landing", label: "Landingpage", icon: <StarIcon className="h-5 w-5 mr-2" /> },
  { to: "/dashboard", label: "Dashboard", icon: <HomeIcon className="h-5 w-5 mr-2" /> },
  { to: "/medical-knowledge", label: "Wissensdatenbank", icon: <BookOpenIcon className="h-5 w-5 mr-2" /> },
  { to: "/email", label: "E-Mail", icon: <EnvelopeIcon className="h-5 w-5 mr-2" /> },
  { to: "/settings", label: "Einstellungen", icon: <Cog6ToothIcon className="h-5 w-5 mr-2" /> },
];

export default function TopNavigation() {
  const location = useLocation();
  return (
    <nav className="w-full bg-white/70 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-10 py-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#ff9900] flex items-center justify-center">
          <span className="text-white text-2xl font-extrabold">e</span>
        </div>
        <span className="text-xl font-bold text-gray-800 tracking-tight">evident.</span>
      </div>
      {/* Navigation Links */}
      <div className="flex items-center gap-8 text-base font-medium text-white">
        {navLinks.map(link => (
          <motion.div
            key={link.to}
            whileHover={{ y: -2, color: "#ffb84d" }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center"
          >
            <Link
              to={link.to}
              className={`flex items-center transition-colors ${location.pathname === link.to ? "text-[#ffb84d]" : "hover:text-[#ffb84d]"}`}
            >
              {link.icon}
              {link.label}
            </Link>
          </motion.div>
        ))}
      </div>
      {/* CTA Button */}
      <div>
        <Link to="/dashboard" className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-full transition text-base shadow-none">Zum Dashboard</Link>
      </div>
    </nav>
  );
} 