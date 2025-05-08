import { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomDropdown({ label, value, options, onChange, disabled, color, size, forceHorizontalMenu }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const accent = color || '#ff9900';
  const isSmall = size === 'small';

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scrollen des Bodys deaktivieren, wenn Dropdown offen
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup falls Komponente unmounted wird
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div ref={ref} className="relative select-none z-30">
      <button
        type="button"
        className={
          isSmall
            ? `w-full flex items-center text-base font-normal bg-transparent border-none p-0 m-0 focus:outline-none transition-colors duration-150 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:underline'}`
            : `w-full flex items-center justify-center text-5xl font-extrabold transition-colors duration-150 focus:outline-none bg-transparent border-none p-0 m-0 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:underline'}`
        }
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{ color: accent, letterSpacing: isSmall ? undefined : '0.01em' }}
      >
        <span className={isSmall ? "block w-full text-left" : "block w-full text-center"}>{selectedLabel}</span>
        {!isSmall && <FiChevronDown className={`ml-3 text-4xl transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      <AnimatePresence>
        {open && (
          <>
            {/* Heller Backdrop + Flexbox-Zentrierung */}
            {forceHorizontalMenu ? (
              <div
                className="fixed z-[9999]"
                style={{ left: '120px', top: '120px' }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl shadow-xl px-6 py-6 min-w-[340px] max-w-lg w-auto flex flex-row items-center gap-4"
                  style={{ transform: 'rotate(0deg)' }}
                  onClick={e => e.stopPropagation()}
                >
                  {options.map(opt => (
                    <div
                      key={opt.value}
                      className={`px-4 py-2 text-2xl font-extrabold text-center cursor-pointer hover:underline transition ${value === opt.value ? 'underline' : ''}`}
                      style={{ color: accent, writingMode: 'horizontal-tb' }}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </motion.div>
              </div>
            ) : (
              <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setOpen(false)}
              >
                {/* Großes zentriertes Dropdown-Fenster */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl shadow-xl px-12 py-10 min-w-[340px] max-w-lg w-full flex flex-col items-center"
                  onClick={e => e.stopPropagation()}
                >
                  {options.map(opt => (
                    <div
                      key={opt.value}
                      className={`py-4 w-full text-3xl font-extrabold text-center cursor-pointer hover:underline transition ${value === opt.value ? 'underline' : ''}`}
                      style={{ color: accent }}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 