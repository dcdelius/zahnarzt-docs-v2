import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiCalendar, FiActivity, FiSave, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'sonner';

export default function AssistantDashboard() {
    const [patient, setPatient] = useState("");
    const [tooth, setTooth] = useState("");
    const [treatment, setTreatment] = useState("");
    const [anesthesia, setAnesthesia] = useState("");
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        if (!patient || !tooth) {
            toast.error("Bitte Patient und Zahn angeben.");
            return;
        }
        // Mock Save
        setTimeout(() => {
            setIsSaved(true);
            toast.success("Vorbereitung gespeichert! Zahnarzt kann übernehmen.");
        }, 800);
    };

    const handleReset = () => {
        setPatient("");
        setTooth("");
        setTreatment("");
        setAnesthesia("");
        setIsSaved(false);
    };

    if (isSaved) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-green-50 p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiCheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Bereit für den Arzt!</h2>
                    <p className="text-gray-600 mb-8">Die Daten für <strong>{patient}</strong> (Zahn {tooth}) wurden übermittelt.</p>
                    <button
                        onClick={handleReset}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        Nächster Patient
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">ZFA Assistenz-Modus</h1>
                    <p className="text-gray-500">Behandlung vorbereiten und Daten vorerfassen.</p>
                </header>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 space-y-8">

                        {/* Patient */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FiUser /> Patient Name
                            </label>
                            <input
                                type="text"
                                value={patient}
                                onChange={e => setPatient(e.target.value)}
                                placeholder="z.B. Max Mustermann"
                                className="w-full p-4 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Zahn */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <FiActivity /> Zahn / Region
                                </label>
                                <input
                                    type="text"
                                    value={tooth}
                                    onChange={e => setTooth(e.target.value)}
                                    placeholder="z.B. 16, 24-27"
                                    className="w-full p-4 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-lg"
                                />
                            </div>

                            {/* Behandlung */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <FiCalendar /> Geplante Behandlung
                                </label>
                                <select
                                    value={treatment}
                                    onChange={e => setTreatment(e.target.value)}
                                    className="w-full p-4 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-lg appearance-none"
                                >
                                    <option value="">- Wählen -</option>
                                    <option value="kons">Füllung (Kons)</option>
                                    <option value="endo">Wurzelkanal (Endo)</option>
                                    <option value="ze">Krone/Brücke (ZE)</option>
                                    <option value="chirurgie">Extraktion (Chirurgie)</option>
                                </select>
                            </div>
                        </div>

                        {/* Anästhesie Pre-Fill */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Vorbereitete Anästhesie</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Oberflächenanästhesie', 'Infiltration (Ultracain)', 'Leitung (Ultracain)', 'Intraligamentär'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setAnesthesia(opt)}
                                        className={`p-3 rounded-xl text-sm font-bold border transition-all ${anesthesia === opt ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    <div className="p-6 bg-gray-50 border-t flex justify-end">
                        <button
                            onClick={handleSave}
                            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3"
                        >
                            <FiSave /> An Zahnarzt übergeben
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
