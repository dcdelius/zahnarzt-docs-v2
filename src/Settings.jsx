// EVIDENTIA SETTINGS – Benutzer- und Vorlagenverwaltung mit Kategorie-Filter

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db } from "./firebase";
import {
  FiUsers,
  FiFileText,
  FiChevronRight,
  FiPlus,
  FiTrash2,
  FiX,
  FiLogOut,
} from "react-icons/fi";
import Navigation from "./components/Navigation";
import TemplateBuilder from './components/TemplateBuilder';

// Animation variants für konsistente Übergänge
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

export default function Settings() {
  const [tab, setTab] = useState("user");

  // Benutzerverwaltung
  const [benutzer, setBenutzer] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRolle, setEditRolle] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState("#94a3b8");

  // Vorlagenverwaltung
  const [vorlagen, setVorlagen] = useState([]);
  const [editVorlage, setEditVorlage] = useState(null);
  const [editTitel, setEditTitel] = useState("");
  const [editKategorie, setEditKategorie] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editText, setEditText] = useState("");
  const [editMaterial, setEditMaterial] = useState("");
  const [aktiveKategorie, setAktiveKategorie] = useState("");
  const [aktiverBenutzer, setAktiverBenutzer] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
        setBenutzer(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const templateSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
        const templates = templateSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setVorlagen(templates);
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      }
    };
    fetchData();
  }, []);

  const kategorien = [...new Set(vorlagen.map((v) => v.Kategorie).filter(Boolean))];

  const handleSaveUser = async () => {
    if (!editName.trim()) return;
    const id = editUser?.id || crypto.randomUUID();
    await setDoc(doc(db, "Praxen", "1", "Benutzer", id), {
      name: editName,
      rolle: editRolle,
      avatarColor: editAvatarColor,
    });
    setEditUser(null);
    const res = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
    setBenutzer(res.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const deleteUser = async () => {
    if (!editUser?.id) return;
    await deleteDoc(doc(db, "Praxen", "1", "Benutzer", editUser.id));
    setEditUser(null);
    const res = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
    setBenutzer(res.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleSaveVorlage = async () => {
    if (!editTitel.trim()) return;
    const vorlageId = editVorlage?.id || editTitel.trim();
    const vorlageData = {
      id: vorlageId,
      Kategorie: editKategorie,
      Prompt: editPrompt,
      Text: editText,
      Material: editMaterial,
      users: editVorlage?.users || ["all"]
    };
    
    try {
      await setDoc(doc(db, "Praxen", "1", "Vorlagen", vorlageId), vorlageData);
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
      setVorlagen(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setEditVorlage(null);
    } catch (error) {
      console.error("Fehler beim Speichern der Vorlage:", error);
      alert("Fehler beim Speichern der Vorlage");
    }
  };

  const deleteVorlage = async () => {
    if (!editVorlage?.id) return;
    await deleteDoc(doc(db, "Praxen", "1", "Vorlagen", editVorlage.id));
    setEditVorlage(null);
    const res = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
    setVorlagen(res.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    navigate("/");
  };

  // Filter-Logik für Vorlagen
  const gefilterteVorlagen = vorlagen.filter(v => {
    const matchesCategory = !aktiveKategorie || v.Kategorie === aktiveKategorie;
    const matchesUser = !aktiverBenutzer || v.users?.includes("all") || v.users?.includes(aktiverBenutzer);
    return matchesCategory && matchesUser;
  });

  // Ensure the variable is used consistently
  const filteredTemplates = gefilterteVorlagen;

  return (
    <div className="min-h-screen bg-[url('/background.jpg')] bg-cover bg-center">
      <Navigation />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div className="flex w-full max-w-7xl h-[780px] bg-white/40 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden">
          {/* 🧭 Sidebar */}
          <div className="w-64 bg-black/60 backdrop-blur-lg text-white p-4 flex flex-col gap-6">
            <div className="space-y-1">
              <motion.button 
                whileHover={{ backgroundColor: "#FFFFFF15" }}
                onClick={() => setTab("user")} 
                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm w-full transition-colors ${tab === "user" ? "bg-white/20 font-semibold" : ""}`}
              >
                <FiUsers /> Benutzer
              </motion.button>

              <div>
                <motion.button 
                  whileHover={{ backgroundColor: "#FFFFFF15" }}
                  onClick={() => setTab("templates")} 
                  className={`flex items-center justify-between w-full gap-2 py-2 px-3 rounded-lg text-sm transition-colors ${tab === "templates" ? "bg-white/20 font-semibold" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <FiFileText /> Vorlagen
                  </span>
                </motion.button>

                <AnimatePresence>
                  {tab === "templates" && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="mt-1 ml-2 pl-4 border-l border-white/10"
                    >
                      {/* Benutzerfilter */}
                      <div className="mb-4 space-y-1 py-1">
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2 pl-2">Benutzer</div>
                        <motion.button 
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          whileHover={{ backgroundColor: "#FFFFFF10" }}
                          onClick={() => setAktiverBenutzer("")}
                          className={`flex items-center w-full px-2 py-1.5 rounded text-sm transition-colors ${aktiverBenutzer === "" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                        >
                          Alle Vorlagen
                        </motion.button>
                        {benutzer.map((user, index) => (
                          <motion.button
                            key={user.id}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 + (index * 0.05) }}
                            whileHover={{ backgroundColor: "#FFFFFF10" }}
                            onClick={() => setAktiverBenutzer(user.id)}
                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${aktiverBenutzer === user.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                          >
                            <div 
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium"
                              style={{ backgroundColor: user.avatarColor || "#94a3b8" }}
                            >
                              {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </div>
                            <span className="truncate">{user.name}</span>
                          </motion.button>
                        ))}
                      </div>

                      {/* Kategorienfilter */}
                      <div className="space-y-1 py-1">
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2 pl-2">Kategorien</div>
                        <motion.button 
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          whileHover={{ backgroundColor: "#FFFFFF10" }}
                          onClick={() => setAktiveKategorie("")} 
                          className={`flex items-center w-full px-2 py-1.5 rounded text-sm transition-colors ${aktiveKategorie === "" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                        >
                          Alle Kategorien
                        </motion.button>
                        {kategorien.map((k, index) => (
                          <motion.button 
                            key={k} 
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 + (index * 0.05) }}
                            whileHover={{ backgroundColor: "#FFFFFF10" }}
                            onClick={() => setAktiveKategorie(k)} 
                            className={`flex items-center w-full px-2 py-1.5 rounded text-sm transition-colors ${aktiveKategorie === k ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                          >
                            {k}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 🧱 Inhalt */}
          <div className="flex-1 p-8 overflow-auto">
            <motion.div 
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-sm text-gray-600 mb-6"
            >
              <button onClick={() => navigate("/dashboard")} className="hover:text-blue-600 transition-colors">Evident</button>
              <FiChevronRight className="inline mx-1" />
              <span className="text-gray-800 font-semibold">{tab === "user" ? "Benutzer" : "Vorlagen"}</span>
            </motion.div>

            {tab === "templates" ? (
              <div className="relative">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    {editVorlage && (
                      <button 
                        onClick={() => setEditVorlage(null)} 
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <FiChevronRight className="rotate-180" /> Zurück
                      </button>
                    )}
                    <h2 className="text-xl font-bold text-gray-800">Vorlagenverwaltung</h2>
                  </div>
                  <button onClick={() => {
                    setEditVorlage({
                      id: '',
                      Kategorie: '',
                      Prompt: '',
                      Text: '',
                      Material: '',
                      users: ['all']
                    });
                    setEditTitel('');
                    setEditKategorie('');
                    setEditPrompt('');
                    setEditText('');
                    setEditMaterial('');
                  }}>
                    <FiPlus size={24} className="text-blue-600 hover:text-blue-800" />
                  </button>
                </div>

                {editVorlage ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6"
                  >
                    <div className="space-y-6">
                      <div>
                        <label className="text-gray-600 block mb-1">Behandlungsname</label>
                        <input 
                          className="w-full px-3 py-2 rounded border border-gray-300" 
                          value={editTitel} 
                          onChange={(e) => setEditTitel(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 block mb-1">Kategorie</label>
                        <input 
                          className="w-full px-3 py-2 rounded border border-gray-300" 
                          value={editKategorie} 
                          onChange={(e) => setEditKategorie(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 block mb-1">Verfügbar für</label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50">
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600"
                              checked={editVorlage.users?.includes("all")}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditVorlage(prev => ({
                                    ...prev,
                                    users: ["all"]
                                  }));
                                } else {
                                  setEditVorlage(prev => ({
                                    ...prev,
                                    users: []
                                  }));
                                }
                              }}
                            />
                            <span className="text-sm">Alle Benutzer</span>
                          </label>
                          {!editVorlage.users?.includes("all") && benutzer.map(user => (
                            <label key={user.id} className="flex items-center gap-2">
                              <input 
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600"
                                checked={editVorlage.users?.includes(user.id)}
                                onChange={(e) => {
                                  setEditVorlage(prev => ({
                                    ...prev,
                                    users: e.target.checked 
                                      ? [...(prev.users || []), user.id]
                                      : (prev.users || []).filter(id => id !== user.id)
                                  }));
                                }}
                              />
                              <span className="text-sm">{user.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Template Builder Integration */}
                      <div className="border-t border-gray-200 pt-6">
                        <label className="text-gray-600 block mb-4">Vorlage erstellen</label>
                        <TemplateBuilder
                          template={editVorlage}
                          onChange={(updatedTemplate) => {
                            setEditVorlage(prev => ({
                              ...prev,
                              Text: updatedTemplate.Text
                            }));
                            setEditText(updatedTemplate.Text || '');
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 block mb-1">GPT-Prompt</label>
                        <textarea 
                          className="w-full px-3 py-2 rounded border border-gray-300" 
                          rows={3} 
                          value={editPrompt} 
                          onChange={(e) => setEditPrompt(e.target.value)} 
                          placeholder="Anweisungen für GPT, wie der Text verarbeitet werden soll..."
                        />
                      </div>
                      
                      <div>
                        <label className="text-gray-600 block mb-1">Material</label>
                        <input 
                          className="w-full px-3 py-2 rounded border border-gray-300" 
                          value={editMaterial} 
                          onChange={(e) => setEditMaterial(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 mt-6">
                      {editVorlage.id && (
                        <button 
                          onClick={deleteVorlage} 
                          className="text-sm px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <FiTrash2 className="inline mr-1" /> Löschen
                        </button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <button 
                          onClick={() => setEditVorlage(null)} 
                          className="text-sm px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Abbrechen
                        </button>
                        <button 
                          onClick={handleSaveVorlage} 
                          className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {filteredTemplates.map((v, index) => (
                      <motion.div 
                        key={v.id} 
                        variants={pageTransition}
                        initial="initial"
                        animate="animate"
                        whileHover={hoverScale}
                        className="p-3 rounded-xl bg-white/50 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-200 flex justify-between items-center cursor-pointer"
                        onClick={() => {
                          setEditVorlage(v);
                          setEditTitel(v.id);
                          setEditKategorie(v.Kategorie || "");
                          setEditPrompt(v.Prompt || "");
                          setEditText(v.Text || "");
                          setEditMaterial(v.Material || "");
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">{v.id}</p>
                            {v.users?.includes("all") ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Alle</span>
                            ) : (
                              <div className="flex -space-x-2">
                                {v.users?.map(userId => {
                                  const user = benutzer.find(b => b.id === userId);
                                  return user ? (
                                    <div
                                      key={userId}
                                      className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-medium text-white"
                                      style={{ backgroundColor: user.avatarColor || "#94a3b8" }}
                                      title={user.name}
                                    >
                                      {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{v.Kategorie}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    {editUser && (
                      <button 
                        onClick={() => setEditUser(null)} 
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <FiChevronRight className="rotate-180" /> Zurück
                      </button>
                    )}
                    <h2 className="text-xl font-bold text-gray-800">Benutzerverwaltung</h2>
                  </div>
                  <button onClick={() => {
                    setEditUser({
                      id: '',
                      name: '',
                      rolle: '',
                      avatarColor: '#94a3b8'
                    });
                    setEditName('');
                    setEditRolle('');
                    setEditAvatarColor('#94a3b8');
                  }}>
                    <FiPlus size={24} className="text-blue-600 hover:text-blue-800" />
                  </button>
                </div>

                {editUser ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-center mb-6">
                        <div 
                          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                          style={{ backgroundColor: editAvatarColor }}
                        >
                          {editName ? editName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-600 block mb-1">Name</label>
                        <input 
                          className="w-full px-3 py-2 rounded border border-gray-300" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Dr. Max Mustermann" 
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 block mb-1">Rolle</label>
                        <input 
                          className="w-full px-3 py-2 rounded border border-gray-300" 
                          value={editRolle} 
                          onChange={(e) => setEditRolle(e.target.value)}
                          placeholder="Zahnarzt" 
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 block mb-1">Avatar-Farbe</label>
                        <div className="flex flex-wrap gap-2">
                          {["#94a3b8", "#38bdf8", "#4ade80", "#facc15", "#f87171"].map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditAvatarColor(color)}
                              className={`w-8 h-8 rounded-full transition-transform ${editAvatarColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 mt-6">
                      {editUser.id && (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={deleteUser} 
                          className="text-sm px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm hover:shadow-md"
                        >
                          <FiTrash2 className="inline mr-1" /> Löschen
                        </motion.button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditUser(null)} 
                          className="text-sm px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm hover:shadow-md"
                        >
                          Abbrechen
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveUser} 
                          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                        >
                          Speichern
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {benutzer.map((b, index) => (
                      <motion.div
                        key={b.id}
                        variants={pageTransition}
                        initial="initial"
                        animate="animate"
                        whileHover={hoverScale}
                        className="p-4 rounded-xl bg-white/50 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          setEditUser(b);
                          setEditName(b.name);
                          setEditRolle(b.rolle);
                          setEditAvatarColor(b.avatarColor || "#94a3b8");
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                            style={{ backgroundColor: b.avatarColor || "#94a3b8" }}
                          >
                            {b.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{b.name}</p>
                            <p className="text-sm text-gray-500">{b.rolle || "Keine Rolle"}</p>
                          </div>
                        </div>
                        <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {b.rolle || "—"}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
