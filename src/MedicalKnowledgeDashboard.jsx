import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiSearch, FiBook, FiFileText, FiArrowRight } from "react-icons/fi";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const hoverScale = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

export default function MedicalKnowledgeDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const articlesSnap = await getDocs(collection(db, "Praxen", "1", "Wissensdatenbank"));
        const articlesList = articlesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setArticles(articlesList);
        setFilteredArticles(articlesList);
        
        // Extrahiere eindeutige Kategorien
        const uniqueCategories = [...new Set(articlesList.map(article => article.kategorie))];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Fehler beim Laden der Artikel:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, []);

  useEffect(() => {
    let filtered = articles;

    // Filter nach Suchanfrage
    if (searchQuery) {
      filtered = filtered.filter(article => 
        article.titel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.beschreibung.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter nach Kategorie
    if (selectedCategory) {
      filtered = filtered.filter(article => article.kategorie === selectedCategory);
    }

    setFilteredArticles(filtered);
  }, [searchQuery, selectedCategory, articles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Wissensdatenbank
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600"
          >
            Zugriff auf medizinisches Fachwissen und Behandlungsrichtlinien
          </motion.p>
        </div>

        {/* Suchleiste und Filter */}
        <div className="max-w-3xl mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suche nach Artikeln..."
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/90 shadow-sm transition-all"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/90 shadow-sm transition-all"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </motion.div>
        </div>

        {/* Artikel-Liste */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FiBook className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Artikel gefunden</h3>
              <p className="mt-1 text-sm text-gray-500">Versuchen Sie es mit anderen Suchkriterien.</p>
            </div>
          ) : (
            filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={hoverScale}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {article.kategorie}
                    </span>
                    <FiFileText className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {article.titel}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {article.beschreibung}
                  </p>
                  <button
                    onClick={() => window.open(article.link, '_blank')}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Zum Artikel
                    <FiArrowRight className="ml-2" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
} 