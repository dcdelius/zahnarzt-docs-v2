import React, { useState } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';

export default function ChipInput({ value = [], onChange, placeholder = "Eintrag hinzufügen...", color = "indigo", darkMode = false }) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addChip();
        }
    };

    const addChip = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed]);
            setInputValue("");
        }
    };

    const removeChip = (chipToRemove) => {
        onChange(value.filter(chip => chip !== chipToRemove));
    };

    const colorClasses = {
        indigo: darkMode ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-200",
        green: darkMode ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-green-50 text-green-700 border-green-200",
        blue: darkMode ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200",
        orange: darkMode ? "bg-orange-500/20 text-orange-300 border-orange-500/30" : "bg-orange-50 text-orange-700 border-orange-200",
        cyan: darkMode ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-50 text-cyan-700 border-cyan-200",
    };

    const activeColorClass = colorClasses[color] || colorClasses.indigo;
    const inputBg = darkMode ? "bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-600 focus:border-cyan-500" : "bg-white border-gray-300 text-gray-900 focus:border-[#ff9900]";

    return (
        <div className="w-full">
            <div className="flex flex-wrap gap-2 mb-3">
                {value.map((chip, index) => (
                    <span
                        key={index}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border transition-all shadow-sm ${activeColorClass}`}
                    >
                        {chip}
                        <button
                            type="button"
                            onClick={() => removeChip(chip)}
                            className="flex-shrink-0 ml-2 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-black/20 focus:outline-none transition-colors"
                        >
                            <span className="sr-only">Remove {chip}</span>
                            <FiX className="h-3 w-3" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="relative">
                <input
                    type="text"
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-1 focus:outline-none transition-all ${inputBg}`}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addChip}
                />
                <button
                    onClick={addChip}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${darkMode ? 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10' : 'text-gray-400 hover:text-[#ff9900] hover:bg-orange-50'}`}
                >
                    <FiPlus className="h-5 w-5" />
                </button>
            </div>
            <p className={`text-xs mt-2 ml-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                Drücken Sie <kbd className={`font-sans px-1 rounded border ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200'}`}>Enter</kbd> zum Hinzufügen
            </p>
        </div>
    );
}
