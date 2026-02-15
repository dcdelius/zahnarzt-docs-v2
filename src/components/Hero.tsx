import { motion } from "framer-motion";
import { FiMic, FiSend, FiSearch } from "react-icons/fi";
import { AnimatePresence } from "framer-motion";

interface HeroProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onRecordingToggle: () => void;
  onTextSubmit: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  selectedTreatment: string | null;
  dictationInstructions?: string;
  showMaterialField: boolean;
  onToggleMaterialField: () => void;
  material?: string;
  children?: React.ReactNode; // Optional extra components
}

export default function Hero({
  inputValue,
  onInputChange,
  onRecordingToggle,
  onTextSubmit,
  isRecording,
  isProcessing,
  selectedTreatment,
  dictationInstructions,
  showMaterialField,
  onToggleMaterialField,
  material,
  children
}: HeroProps) {
  const canRecord = !isProcessing && !!selectedTreatment;
  const canSubmit = !!inputValue.trim() && !!selectedTreatment && !isProcessing && !isRecording;

  return (
    <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 min-h-[calc(100vh-80px)]">
      {/* Original colored gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e6f7c1] via-[#ffe6a7] to-[#ffb36b] -z-10" style={{background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)'}} />

      <div className="w-full max-w-3xl mx-auto">
        {/* Typography Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 mb-4 tracking-tight">
            Dokumentation beginnt hier
          </h1>
          <p className="text-lg text-[#64748B] font-normal">
            Erfassen Sie Behandlungen per Sprache oder Text
          </p>
        </motion.div>

        {/* Dictation Instructions */}
        <AnimatePresence>
          {dictationInstructions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                <span>💡</span>
                <span className="font-semibold">Bitte diktieren Sie:</span>
                <span>{dictationInstructions}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Material Field (Collapsible) */}
        <AnimatePresence>
          {selectedTreatment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <button
                onClick={onToggleMaterialField}
                className="flex items-center gap-2 text-sm text-[#64748B] hover:text-gray-900 transition-colors mx-auto"
              >
                <span className="text-xs">Material {showMaterialField ? 'ausblenden' : 'anzeigen'}</span>
              </button>
              {showMaterialField && material && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-center text-sm text-gray-600"
                >
                  {material}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Additional Components */}
        {children && (
          <div className="mb-6">
            {children}
          </div>
        )}

        {/* Command Bar Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="relative">
            {/* Input Container with glass effect */}
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-200/50 overflow-hidden" style={{ borderRadius: '16px' }}>
              {/* Left Icon */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <FiSearch className="w-5 h-5" />
              </div>

              {/* Input Field */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) {
                    e.preventDefault();
                    onTextSubmit();
                  }
                }}
                placeholder="Spracheingabe oder Text eingeben…"
                className="w-full pl-12 pr-4 py-4 sm:py-5 text-base sm:text-lg bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder:text-gray-400"
                disabled={isProcessing}
              />
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4"
        >
          {/* Primary Button - Recording */}
          <motion.button
            onClick={onRecordingToggle}
            disabled={!canRecord}
            whileHover={canRecord ? { scale: 1.02 } : {}}
            whileTap={canRecord ? { scale: 0.98 } : {}}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium text-base transition-all ${
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600 shadow-lg"
                : canRecord
                ? "bg-[#ff9900] text-white hover:bg-orange-600 shadow-md hover:shadow-lg"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <FiMic className={`w-5 h-5 ${isRecording ? "animate-pulse" : ""}`} />
            <span>
              {isProcessing ? "Verarbeite..." : isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
            </span>
          </motion.button>

          {/* Secondary Button - Text Submit */}
          <motion.button
            onClick={onTextSubmit}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium text-base transition-all ${
              canSubmit
                ? "bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <FiSend className="w-5 h-5" />
            <span>{isProcessing ? "Verarbeite..." : "Text verarbeiten"}</span>
          </motion.button>
        </motion.div>

        {/* Helper Text */}
        {!selectedTreatment && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-sm text-[#64748B] mt-6"
          >
            Wählen Sie zuerst eine Behandlung aus der Sidebar
          </motion.p>
        )}
      </div>
    </div>
  );
}

