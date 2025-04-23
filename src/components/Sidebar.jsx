import { motion } from "framer-motion";
import { FiX } from "react-icons/fi";

const hoverScale = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

export default function Sidebar({ 
  users, 
  selectedUser, 
  setSelectedUser, 
  categories, 
  selectedCategory, 
  setSelectedCategory, 
  treatments, 
  selectedTreatment, 
  setSelectedTreatment, 
  history, 
  setProcessedText, 
  setShowModal 
}) {
  return (
    <div className="w-full md:w-64 bg-black/60 backdrop-blur-sm text-white p-6 md:p-8 flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Benutzer-Avatar mit Dropdown */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative group">
            <button
              onClick={() => document.getElementById('user-select').click()}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center text-white text-2xl md:text-3xl font-bold transition-all hover:scale-105 shadow-xl"
              style={{ 
                backgroundColor: users.find(u => u.id === selectedUser)?.avatarColor || "#94a3b8"
              }}
            >
              {selectedUser ? 
                users.find(u => u.id === selectedUser)?.name.split(' ').map(n => n[0]).join('') : 
                "B"
              }
            </button>
            <select
              id="user-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
            >
              <option value="">Behandler wählen...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-300 font-medium">
              {selectedUser ? users.find(u => u.id === selectedUser)?.name : "Behandler wählen"}
            </span>
            <span className="text-xs px-3 py-1 mt-2 bg-white/10 rounded-full text-gray-300">
              {selectedUser ? users.find(u => u.id === selectedUser)?.role : ""}
            </span>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="space-y-4 w-full mt-6">
          <div>
            <div className="text-sm text-gray-400 mb-2 font-medium">Kategorie</div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all hover:bg-white/20 cursor-pointer"
            >
              <option value="">Kategorie auswählen...</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-2 font-medium">Behandlung</div>
            <select
              value={selectedTreatment}
              onChange={(e) => setSelectedTreatment(e.target.value)}
              className="w-full bg-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all hover:bg-white/20 cursor-pointer"
              disabled={!selectedCategory}
            >
              <option value="">Behandlung auswählen...</option>
              {treatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>{treatment.id}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trennstrich */}
        <div className="w-full h-px bg-white/10 my-4"></div>

        {/* Verlauf */}
        <div className="flex-1 space-y-3">
          <div className="text-sm text-gray-400 font-medium">Verlauf</div>
          <div className="space-y-1">
            {history.map((doc) => (
              <motion.div 
                key={doc.id}
                whileHover={hoverScale}
                onClick={() => {
                  setProcessedText(doc.dokumentation);
                  setShowModal(true);
                }}
                className="text-sm text-gray-300 py-2 px-3 rounded-xl hover:bg-white/10 flex items-center cursor-pointer transition-all"
              >
                <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
                <span>{doc.behandlung} – {new Date(doc.timestamp).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-gray-500 mt-4">© Evidentia 2025</div>
      </div>
    </div>
  );
} 