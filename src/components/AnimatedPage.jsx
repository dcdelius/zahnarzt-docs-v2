import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

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
      duration: 0.5
    }
  },
  exit: (direction) => ({
    x: direction === 'forward' ? '-100%' : '100%',
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
      duration: 0.4
    }
  })
};

export default function AnimatedPage({ children, direction = 'forward' }) {
  return (
    <motion.div
      key={useLocation().pathname}
      custom={direction}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

