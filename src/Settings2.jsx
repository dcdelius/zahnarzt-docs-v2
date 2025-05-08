import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiSend, FiLogOut, FiUser, FiHelpCircle, FiEdit2, FiChevronLeft, FiCircle, FiPlus, FiTrash2, FiChevronRight, FiX } from "react-icons/fi";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import TopNavigation from "./components/TopNavigation";
import CustomDropdown from "./components/CustomDropdown";

const CategoryDropdown = ({ value, onChange, categories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-xl bg-white/80 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#ff9900] focus:border-transparent flex items-center justify-between group"
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || "Kategorie auswählen..."}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 group-hover:text-gray-600"
        >
          <FiChevronRight className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="max-h-60 overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  !value ? 'text-[#ff9900]' : 'text-gray-600'
                }`}
              >
                <span className="text-lg">Keine Kategorie</span>
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    onChange(category);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                    value === category ? 'text-[#ff9900]' : 'text-gray-600'
                  }`}
                >
                  <span className="text-lg">{category}</span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Settings2() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedSection, setSelectedSection] = useState("benutzer");
  const [editItem, setEditItem] = useState(null);
  const [sidebarStep, setSidebarStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const [selectedUser, setSelectedUser] = useState(() => {
    return localStorage.getItem('selectedUser') || "";
  });

  // Template-Verwaltung
  const [templateData, setTemplateData] = useState({
    name: "",
    category: "",
    availableForAll: true,
    availableForUsers: [],
    content: "",
    blocks: []
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Extrahiere einzigartige Kategorien aus den Templates
  const categories = [...new Set(templates.map(t => t.Kategorie).filter(Boolean))].sort();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
        const userList = userSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(userList);

        const templateSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
        const templateList = templateSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setTemplates(templateList);
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      }
    };
    fetchData();
  }, []);

  const handleSaveTemplate = async () => {
    if (!templateData.name) return;
    
    try {
      const templateId = selectedTemplate?.id || templateData.name;
      await setDoc(doc(db, "Praxen", "1", "Vorlagen", templateId), {
        name: templateData.name,
        Kategorie: templateData.category,
        users: templateData.availableForAll ? ["all"] : templateData.availableForUsers,
        content: templateData.content,
        blocks: templateData.blocks
      });

      const snapshot = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
      setTemplates(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setSelectedTemplate(null);
      setTemplateData({
        name: "",
        category: "",
        availableForAll: true,
        availableForUsers: [],
        content: "",
        blocks: []
      });
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  const deleteTemplate = async () => {
    if (!selectedTemplate?.id) return;
    
    try {
      await deleteDoc(doc(db, "Praxen", "1", "Vorlagen", selectedTemplate.id));
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
      setTemplates(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setSelectedTemplate(null);
      setTemplateData({
        name: "",
        category: "",
        availableForAll: true,
        availableForUsers: [],
        content: "",
        blocks: []
      });
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      const categoryId = newCategory.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, "Praxen", "1", "Kategorien", categoryId), {
        name: newCategory.trim()
      });
      
      const categorySnap = await getDocs(collection(db, "Praxen", "1", "Kategorien"));
      const categoryList = categorySnap.docs.map(doc => doc.data().name);
      setCategories(categoryList);
      setNewCategory("");
      setShowCategoryModal(false);
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Kategorie:", error);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    try {
      const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
      await deleteDoc(doc(db, "Praxen", "1", "Kategorien", categoryId));
      
      const categorySnap = await getDocs(collection(db, "Praxen", "1", "Kategorien"));
      const categoryList = categorySnap.docs.map(doc => doc.data().name);
      setCategories(categoryList);
      
      if (selectedCategory === categoryName) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Kategorie:", error);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full" style={{background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)'}} />
      </div>
      
      <TopNavigation />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-[380px] flex flex-col justify-start py-16 px-16 min-h-screen relative">
          {/* Branding */}
          <div className="mb-12">
            <span className="text-5xl font-extrabold tracking-tight text-[#ff9900] block mb-2">evident.</span>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AI DOCS</span>
          </div>

          {/* Navigation */}
          <div className="flex-1">
            {sidebarStep === 1 && (
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedSection("benutzer");
                    setSidebarStep(2);
                  }}
                  className="w-full py-2 text-2xl font-semibold text-white hover:scale-105 transition-transform text-left"
                >
                  Benutzer
                </button>
                <button
                  onClick={() => {
                    setSelectedSection("vorlagen");
                    setSidebarStep(2);
                  }}
                  className="w-full py-2 text-2xl font-semibold text-white hover:scale-105 transition-transform text-left"
                >
                  Vorlagen
                </button>
              </div>
            )}

            {sidebarStep === 2 && (
              <div>
                <button
                  onClick={() => setSidebarStep(1)}
                  className="mb-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <FiChevronLeft className="text-2xl text-white" />
                </button>

                {selectedSection === "vorlagen" && (
                  <div className="space-y-6">
                    {/* Kategorien als Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Kategorien</h3>
                        <button
                          onClick={() => setShowCategoryModal(true)}
                          className="text-sm text-white/70 hover:text-white flex items-center gap-1"
                        >
                          <FiPlus className="text-lg" />
                          <span>Neue Kategorie</span>
                        </button>
                      </div>
                      <div className="space-y-1">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className={`w-full py-2 text-xl font-semibold text-left transition-colors ${
                            selectedCategory === null ? 'text-white' : 'text-white/70 hover:text-white'
                          }`}
                        >
                          Alle Vorlagen
                        </button>
                        {categories.map(category => (
                          <div key={category} className="flex items-center group">
                            <button
                              onClick={() => setSelectedCategory(category)}
                              className={`flex-1 py-2 text-xl font-semibold text-left transition-colors ${
                                selectedCategory === category ? 'text-white' : 'text-white/70 hover:text-white'
                              }`}
                            >
                              {category}
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-white/50 hover:text-white/80 transition-opacity"
                            >
                              <FiX />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vorlagen Liste */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Vorlagen</h3>
                      <div className="space-y-1 max-h-[calc(100vh-500px)] overflow-y-auto custom-scrollbar pr-2">
                        {templates
                          .filter(t => selectedCategory === null || t.Kategorie === selectedCategory)
                          .map(template => (
                            <button
                              key={template.id}
                              onClick={() => {
                                setSelectedTemplate(template);
                                setTemplateData({
                                  name: template.name || template.id,
                                  category: template.Kategorie || "",
                                  availableForAll: template.users?.includes("all"),
                                  availableForUsers: template.users?.filter(u => u !== "all") || [],
                                  content: template.content || "",
                                  blocks: template.blocks || []
                                });
                              }}
                              className={`w-full py-2 text-xl font-semibold text-left transition-colors ${
                                selectedTemplate?.id === template.id ? 'text-white' : 'text-white/70 hover:text-white'
                              } flex items-center justify-between`}
                            >
                              <span className="truncate">{template.name || template.id}</span>
                              {template.Kategorie && (
                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/50">
                                  {template.Kategorie}
                                </span>
                              )}
                            </button>
                          ))}
                        <button
                          onClick={() => {
                            setSelectedTemplate(null);
                            setTemplateData({
                              name: "",
                              category: selectedCategory || "",
                              availableForAll: true,
                              availableForUsers: [],
                              content: "",
                              blocks: []
                            });
                          }}
                          className="w-full py-2 text-xl font-semibold text-white/70 hover:text-white text-left transition-colors flex items-center gap-2"
                        >
                          <FiPlus className="text-lg" />
                          <span>Neue Vorlage</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === "benutzer" && (
                  <div className="space-y-1">
                    {users.map(user => (
                      <button
                        key={user.id}
                        onClick={() => setEditItem(user)}
                        className={`w-full py-2 text-xl font-semibold text-left transition-colors ${
                          editItem?.id === user.id ? 'text-white' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        {user.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setEditItem({ id: null, name: "", role: "", avatarColor: "#94a3b8" })}
                      className="w-full py-2 text-xl font-semibold text-white/70 hover:text-white text-left transition-colors"
                    >
                      + Neuer Benutzer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Selection */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-[#ff9900] flex items-center justify-center text-white text-2xl font-extrabold">
                <FiUser />
              </div>
              <div className="flex-1">
                <CustomDropdown
                  label="Behandler"
                  value={selectedUser}
                  options={[
                    ...users.map(u => ({ value: u.id, label: u.name })),
                    { value: "__logout__", label: "Abmelden" }
                  ]}
                  onChange={val => {
                    if (val === "__logout__") handleLogout();
                    else setSelectedUser(val);
                  }}
                  color="#22223b"
                  size="small"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {selectedUser ? users.find(u => u.id === selectedUser)?.role : ""}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-16 px-24">
          {selectedSection === "vorlagen" && (selectedTemplate !== undefined) && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedTemplate ? "Vorlage bearbeiten" : "Neue Vorlage"}
              </h2>

              {/* Rest of the form */}
              <div className="space-y-8">
                {/* Hauptinformationen in einer Zeile */}
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Kategorie</div>
                    <CategoryDropdown
                      value={templateData.category}
                      onChange={(category) => setTemplateData({ ...templateData, category })}
                      categories={categories}
                    />
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">Name</div>
                    <input
                      type="text"
                      value={templateData.name}
                      onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                      className="w-full px-4 py-3 text-lg bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                      placeholder="Name eingeben..."
                    />
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">Verfügbar für</div>
                    <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={templateData.availableForAll}
                          onChange={(e) => setTemplateData({ 
                            ...templateData, 
                            availableForAll: e.target.checked,
                            availableForUsers: e.target.checked ? [] : templateData.availableForUsers 
                          })}
                          className="rounded border-gray-300 text-[#ff9900] focus:ring-[#ff9900]"
                        />
                        <span className="text-gray-700">Alle Benutzer</span>
                      </label>
                      
                      {!templateData.availableForAll && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                          {users.map(user => (
                            <label key={user.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={templateData.availableForUsers.includes(user.id)}
                                onChange={(e) => {
                                  const newUsers = e.target.checked
                                    ? [...templateData.availableForUsers, user.id]
                                    : templateData.availableForUsers.filter(id => id !== user.id);
                                  setTemplateData({ ...templateData, availableForUsers: newUsers });
                                }}
                                className="rounded border-gray-300 text-[#ff9900] focus:ring-[#ff9900]"
                              />
                              <span className="text-sm text-gray-600">{user.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vorlage erstellen */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Vorlage erstellen</div>
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    {/* Aktionsbuttons für Bausteine */}
                    <div className="flex gap-3 mb-6">
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-medium text-gray-700">Dokumentationsbausteine</div>
                        <div className="flex flex-wrap gap-2">
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Überschrift
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Datum
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Befund & Diagnose
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Behandlung
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Materialien
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Aufklärung
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Bemerkung
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Abrechnung
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mb-6">
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-medium text-gray-700">Textbausteine</div>
                        <div className="flex flex-wrap gap-2">
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Anästhesie
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Kofferdam
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Adhäsivtechnik
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Kompositfüllung
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mb-6">
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-medium text-gray-700">Materialauswahl</div>
                        <div className="flex flex-wrap gap-2">
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Komposit
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Adhäsiv
                          </button>
                          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2">
                            <FiPlus className="text-lg" />
                            Instrumente
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Editor und Vorschau */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Editor */}
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Ausgewählte Bausteine</div>
                        <div className="space-y-3">
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Überschrift</span>
                              <button className="text-gray-400 hover:text-gray-600">
                                <FiX />
                              </button>
                            </div>
                            <input
                              type="text"
                              className="w-full px-3 py-1.5 text-sm bg-white rounded border border-gray-200 focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                              placeholder="Füllungstherapie – Zahn ..."
                            />
                          </div>

                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Datum</span>
                              <button className="text-gray-400 hover:text-gray-600">
                                <FiX />
                              </button>
                            </div>
                            <input
                              type="date"
                              className="w-full px-3 py-1.5 text-sm bg-white rounded border border-gray-200 focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                            />
                          </div>

                          <div className="text-gray-500 italic">
                            Weitere Bausteine per Drag & Drop hier ablegen
                          </div>
                        </div>
                      </div>

                      {/* Vorschau */}
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Vorschau</div>
                        <div className="font-mono text-sm whitespace-pre-wrap text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[200px]">
                          Füllungstherapie – Zahn 26 (MO)

Datum: 08.05.2025

[Hier erscheint die Live-Vorschau der ausgewählten Bausteine]
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aktionsbuttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleSaveTemplate}
                  className="flex-1 py-4 px-6 bg-[#ff9900] hover:bg-[#ff9900]/90 text-white font-bold rounded-full text-lg uppercase tracking-wide"
                >
                  {selectedTemplate ? "Vorlage speichern" : "Neue Vorlage anlegen"}
                </button>
                {selectedTemplate && (
                  <button
                    onClick={deleteTemplate}
                    className="flex-1 py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full text-lg uppercase tracking-wide"
                  >
                    Vorlage löschen
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Kategorie Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[400px]">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Neue Kategorie</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name der Kategorie</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                  placeholder="z.B. Chirurgie, Diagnostik..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-[#ff9900] text-white rounded-lg hover:bg-[#ff9900]/90"
                >
                  Kategorie hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 