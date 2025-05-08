import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { 
  HomeIcon, 
  Cog6ToothIcon, 
  BookOpenIcon, 
  EnvelopeIcon, 
  ArrowRightOnRectangleIcon, 
  StarIcon 
} from "@heroicons/react/24/outline";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const navItems = [
  { path: "/dashboard", icon: <HomeIcon className="h-5 w-5" />, label: "Dashboard" },
  { path: "/medical-knowledge", icon: <BookOpenIcon className="h-5 w-5" />, label: "Wissensdatenbank" },
  { path: "/email", icon: <EnvelopeIcon className="h-5 w-5" />, label: "E-Mail" },
  { path: "/settings", icon: <Cog6ToothIcon className="h-5 w-5" />, label: "Einstellungen" }
];

const navItemVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }
};

const activeItemVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }
};

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

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src="/inverted_logo.png" alt="Logo" className="h-8 w-8" />
              <span className="text-gray-900 font-semibold text-lg tracking-tight">EVIDENTIA</span>
            </Link>
          </motion.div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {/* Landingpage-Link ganz links */}
            <motion.div
              variants={location.pathname === "/landing" ? activeItemVariants : navItemVariants}
              initial="initial"
              whileHover="hover"
            >
              <Link
                to="/landing"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                  location.pathname === "/landing"
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <StarIcon className="h-5 w-5" />
                Landingpage
              </Link>
            </motion.div>
            {navItems.map((item) => (
              <motion.div
                key={item.path}
                variants={location.pathname === item.path ? activeItemVariants : navItemVariants}
                initial="initial"
                whileHover="hover"
              >
                <Link
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    location.pathname === item.path
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </motion.div>
            ))}
            <motion.div
              variants={navItemVariants}
              initial="initial"
              whileHover="hover"
            >
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Abmelden
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
} 