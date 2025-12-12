import React from 'react';

export default function MaterialsPanel({ manualMaterial, onChange, insuranceType, onInsuranceChange }) {
    return (
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-lg ring-1 ring-black/5 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Konfiguration</h2>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">Versicherung</label>
                <div className="flex bg-gray-100 rounded-full p-1.5 shadow-inner">
                    <button
                        onClick={() => onInsuranceChange('GKV')}
                        className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${insuranceType === 'GKV' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        GKV
                    </button>
                    <button
                        onClick={() => onInsuranceChange('PKV')}
                        className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${insuranceType === 'PKV' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        PKV
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Material (Manuell)</label>
                <input
                    type="text"
                    value={manualMaterial}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="z.B. Admira Fusion"
                    className="w-full bg-white text-gray-800 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm"
                />
            </div>
        </div>
    );
}
