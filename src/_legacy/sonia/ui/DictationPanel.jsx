import React from 'react';

export default function DictationPanel({ value, onChange, onExtract }) {
    return (
        <div className="bg-gray-800 p-4 rounded-xl h-full flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-2">Diktat</h2>
            <textarea
                className="flex-1 bg-gray-900 text-white p-3 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Hier diktieren..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {onExtract && (
                <button
                    onClick={onExtract}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                >
                    Extrahieren
                </button>
            )}
        </div>
    );
}
