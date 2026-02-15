import React from 'react';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck } from 'react-icons/fi';

export default function PreviewPanel({ result, loading }) {
    const [copied, setCopied] = React.useState(false);

    // Handle both string and object result
    const text = typeof result === 'string'
        ? result
        : result?.fullText || result?.text || '';

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-sm flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-3">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                    />
                    <span className="text-sm text-gray-500">Generiere...</span>
                </div>
            </div>
        );
    }

    if (!text) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-sm flex items-center justify-center min-h-[200px]">
                <span className="text-gray-400 text-sm">Noch keine Dokumentation.</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Dokumentation</span>
                <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${copied
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    {copied ? <FiCheck className="w-3 h-3" /> : <FiCopy className="w-3 h-3" />}
                    {copied ? 'Kopiert!' : 'Kopieren'}
                </button>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[60vh] overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {text}
                </pre>
            </div>
        </div>
    );
}
