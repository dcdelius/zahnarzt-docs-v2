/**
 * HomePage - Modern Landing Page after Login
 * Clean entry point directing users to Docudent V5
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-rose-50/40 flex flex-col items-center justify-center p-8">
            {/* Header */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-2">
                    Docudent
                </h1>
                <p className="text-slate-500 text-lg">
                    Intelligente Behandlungsdokumentation
                </p>
            </motion.div>

            {/* Main CTA */}
            <motion.button
                onClick={() => navigate('/docudent')}
                className="group relative px-8 py-4 rounded-2xl text-left
                    bg-white/80 backdrop-blur-xl shadow-xl
                    border border-white/50
                    hover:shadow-2xl hover:scale-[1.02]
                    transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -4 }}
            >
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center
                        bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-800 mb-1">
                            Starten
                        </h2>
                        <p className="text-slate-500">
                            Behandlung dokumentieren
                        </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-2 transition-all ml-4" />
                </div>
            </motion.button>

            {/* Version Info */}
            <motion.p
                className="mt-12 text-xs text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                Version 5.0 • Docudent Core
            </motion.p>
        </div>
    );
}
