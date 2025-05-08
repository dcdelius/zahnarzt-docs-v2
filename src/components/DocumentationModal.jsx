import { motion } from "framer-motion";
import { FiX } from "react-icons/fi";

export default function DocumentationModal({ 
  showModal, 
  setShowModal, 
  processedText, 
  selectedUser, 
  users 
}) {
  if (!showModal || !processedText) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Dokumentation</h3>
            {selectedUser && (
              <p className="text-sm text-gray-500">
                {users.find(u => u.id === selectedUser)?.name} - {users.find(u => u.id === selectedUser)?.role}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="prose prose-sm max-w-none">
            {processedText.split('\n').map((line, index) => (
              <p key={index} className="text-gray-700 mb-2">{line}</p>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => setShowModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Schließen
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(processedText);
              // Optional: Zeige eine Bestätigung
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Kopieren
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
} 