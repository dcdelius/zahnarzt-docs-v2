import { useState } from "react";
import { motion } from "framer-motion";
import { FiMail } from "react-icons/fi";
import Navigation from "./Navigation";

export default function EmailResponder() {
  return (
    <div className="min-h-screen bg-[url('/background.jpg')] bg-cover bg-center">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto bg-white/10 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left sidebar */}
              <div className="md:col-span-1 bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Behandler</h3>
                <select
                  className="w-full bg-gray-700 text-white rounded-md p-2"
                >
                  <option value="">Behandler auswählen</option>
                </select>

                <h3 className="text-lg font-semibold text-white mb-4 mt-6">Kategorie</h3>
                <select
                  className="w-full bg-gray-700 text-white rounded-md p-2"
                >
                  <option value="">Kategorie auswählen</option>
                </select>

                <h3 className="text-lg font-semibold text-white mb-4 mt-6">Behandlung</h3>
                <select
                  className="w-full bg-gray-700 text-white rounded-md p-2"
                >
                  <option value="">Behandlung auswählen</option>
                </select>
              </div>

              {/* Main content area */}
              <div className="md:col-span-2 bg-gray-800/50 rounded-lg p-6">
                <div className="flex flex-col h-[600px]">
                  <textarea
                    placeholder="Geben Sie hier Ihre Dokumentation ein..."
                    className="w-full h-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  
                  <div className="flex justify-between items-center mt-4">
                    <button
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      <FiMail />
                      Aufnahme starten
                    </button>

                    <button
                      className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 