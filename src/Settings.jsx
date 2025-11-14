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
import TopNavigation from "./components/TopNavigation";
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
  const [editDictationInstructions, setEditDictationInstructions] = useState("");
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
      dictationInstructions: editDictationInstructions,
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
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Gradient Background - Gleicher wie Dashboard */}
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-gradient-to-br from-[#e6f7c1] via-[#ffe6a7] to-[#ffb36b]" style={{background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)'}} />
      </div>
      <TopNavigation />
      
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar - Gleicher Stil wie Dashboard */}
        <aside className="w-[320px] flex flex-col justify-start py-16 px-12 min-h-screen relative">
          {/* Branding */}
          <div className="mb-20">
            <span className="text-5xl font-extrabold tracking-tight text-[#ff9900] block mb-2">evident.</span>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AI DOCS</span>
          </div>
          
          {/* Navigation */}
          <div className="mb-16 space-y-2">

            <motion.button 
              whileHover={{ scale: 1.08 }}
              onClick={() => setTab("user")} 
              className={`w-full py-2 text-2xl font-semibold font-sans tracking-tight cursor-pointer select-none px-2 text-left transition-colors ${
                tab === "user" ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              <FiUsers className="inline mr-3" /> Benutzer
            </motion.button>

            <div>
              <motion.button 
                whileHover={{ scale: 1.08 }}
                onClick={() => setTab("templates")} 
                className={`w-full py-2 text-2xl font-semibold font-sans tracking-tight cursor-pointer select-none px-2 text-left transition-colors ${
                  tab === "templates" ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                <FiFileText className="inline mr-3" /> Vorlagen
              </motion.button>

              <AnimatePresence>
                {tab === "templates" && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="mt-4 ml-6 space-y-3"
                  >
                    {/* Benutzerfilter */}
                    <div className="mb-4 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Benutzer</div>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setAktiverBenutzer("")}
                        className={`w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors ${
                          aktiverBenutzer === "" ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        Alle Vorlagen
                      </motion.button>
                      {benutzer.map((user) => (
                        <motion.button
                          key={user.id}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setAktiverBenutzer(user.id)}
                          className={`w-full py-1.5 px-3 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                            aktiverBenutzer === user.id ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                            style={{ backgroundColor: user.avatarColor || "#94a3b8" }}
                          >
                            {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </div>
                          <span className="truncate">{user.name}</span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Kategorienfilter */}
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Kategorien</div>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setAktiveKategorie("")} 
                        className={`w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors ${
                          aktiveKategorie === "" ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        Alle Kategorien
                      </motion.button>
                      {kategorien.map((k) => (
                        <motion.button 
                          key={k}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setAktiveKategorie(k)} 
                          className={`w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors ${
                            aktiveKategorie === k ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
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
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col px-24 py-16 overflow-auto">
          <div className="max-w-5xl mx-auto w-full">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-5xl font-extrabold text-[#22223b] mb-2 tracking-tight">
                {tab === "user" ? "Benutzerverwaltung" : "Vorlagenverwaltung"}
              </h1>
              <p className="text-gray-600 text-lg">
                {tab === "user" 
                  ? "Verwalten Sie Benutzer und deren Berechtigungen" 
                  : "Erstellen und bearbeiten Sie Dokumentationsvorlagen"}
              </p>
            </motion.div>

            {tab === "templates" ? (
              <div className="space-y-6">
                {!editVorlage && (
                  <div className="flex justify-end mb-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
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
                        setEditDictationInstructions('');
                      }}
                      className="px-6 py-3 bg-[#ff9900] text-white font-semibold rounded-full hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <FiPlus /> Neue Vorlage
                    </motion.button>
                  </div>
                )}

                {editVorlage ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-gray-200/50"
                  >
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-700 block mb-2 font-semibold">Behandlungsname</label>
                          <input 
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none transition-colors bg-white/80" 
                            value={editTitel} 
                            onChange={(e) => setEditTitel(e.target.value)} 
                            placeholder="z.B. Füllungstherapie"
                          />
                        </div>
                        <div>
                          <label className="text-gray-700 block mb-2 font-semibold">Kategorie</label>
                          <input 
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none transition-colors bg-white/80" 
                            value={editKategorie} 
                            onChange={(e) => setEditKategorie(e.target.value)} 
                            placeholder="z.B. Füllung"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-700 block mb-2 font-semibold">Verfügbar für</label>
                        <div className="flex flex-wrap gap-3 p-4 border-2 border-gray-200 rounded-lg bg-white/60 backdrop-blur-sm">
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

                      {/* Dictation Instructions - über dem Material */}
                      <div className="border-t border-gray-200 pt-6">
                        <label className="text-gray-700 block mb-2 font-semibold">Diktat-Hinweise</label>
                        <input 
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none transition-colors bg-white/80" 
                          value={editDictationInstructions} 
                          onChange={(e) => setEditDictationInstructions(e.target.value)} 
                          placeholder="z.B. Zahnnummer, Kosten, Farbe, Anästhesie"
                        />
                        <p className="text-xs text-gray-500 mt-2">Diese Hinweise werden im Dashboard angezeigt, wenn diese Vorlage ausgewählt wird. Beispiel: "Zahnnummer, Kosten, Farbe, Anästhesie"</p>
                      </div>

                      {/* Material Field - über dem Textfenster */}
                      <div className="border-t border-gray-200 pt-6">
                        <label className="text-gray-700 block mb-2 font-semibold">Material</label>
                        <input 
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none transition-colors bg-white/80" 
                          value={editMaterial} 
                          onChange={(e) => setEditMaterial(e.target.value)} 
                          placeholder="z.B. Komposit, Gaenial Flow A2, Tetric EvoCeram A2"
                        />
                        <p className="text-xs text-gray-500 mt-2">Das Material wird automatisch in der Dokumentation verwendet, wenn [MATERIAL] in der Vorlage steht oder wenn Materialien in der Behandlungsdokumentation erwähnt werden.</p>
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

                      <div className="border-t border-gray-200 pt-6">
                        <label className="text-gray-700 block mb-3 font-semibold text-lg">GPT-Konfiguration</label>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-gray-700 block mb-2 font-medium">GPT-Prompt</label>
                            <textarea 
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none transition-colors bg-white/80 resize-none" 
                              rows={4} 
                              value={editPrompt} 
                              onChange={(e) => setEditPrompt(e.target.value)} 
                              placeholder="Zusätzliche Anweisungen für GPT. Wenn leer, wird automatisch verwendet: 'Halte dich strikt an die Vorlagen-Struktur. Wenn im Diktat zusätzliche Behandlungen oder Informationen erwähnt werden, die nicht in der Vorlage stehen, füge diese trotzdem hinzu. Verwende die Materialien aus der Vorlage, es sei denn, im Diktat werden andere Materialien genannt.'"
                            />
                            <p className="text-xs text-gray-500 mt-2">Diese Anweisungen werden in den System-Prompt integriert. Wenn leer, wird automatisch ein Standard-Prompt verwendet, der zusätzliche Informationen aus dem Diktat einbezieht.</p>
                            {!editPrompt && (
                              <p className="text-xs text-blue-600 mt-1 italic">💡 Tipp: Lassen Sie das Feld leer, um den Standard-Prompt zu verwenden, der automatisch zusätzliche Informationen einbezieht.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
                      {editVorlage.id && (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={deleteVorlage} 
                          className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
                        >
                          <FiTrash2 /> Löschen
                        </motion.button>
                      )}
                      <div className="flex gap-3 ml-auto">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditVorlage(null)} 
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors shadow-sm hover:shadow-md font-semibold"
                        >
                          Abbrechen
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveVorlage} 
                          className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl font-semibold"
                        >
                          Speichern
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {filteredTemplates.map((v, index) => (
                      <motion.div 
                        key={v.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-5 rounded-xl bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 flex justify-between items-center cursor-pointer border border-gray-200/50"
                        onClick={() => {
                          setEditVorlage(v);
                          setEditTitel(v.id);
                          setEditKategorie(v.Kategorie || "");
                          setEditPrompt(v.Prompt || v.prompt || "");
                          setEditText(v.Text || "");
                          setEditMaterial(v.Material || v.material || "");
                          setEditDictationInstructions(v.dictationInstructions || v.DictationInstructions || "");
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
              <div className="space-y-6">
                {!editUser && (
                  <div className="flex justify-end mb-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                    setEditUser({
                      id: '',
                      name: '',
                      rolle: '',
                      avatarColor: '#94a3b8'
                    });
                    setEditName('');
                    setEditRolle('');
                    setEditAvatarColor('#94a3b8');
                      }}
                      className="px-6 py-3 bg-[#ff9900] text-white font-semibold rounded-full hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <FiPlus /> Neuer Benutzer
                    </motion.button>
                  </div>
                )}

                {editUser && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setEditUser(null)}
                    className="flex items-center gap-2 text-[#22223b] hover:text-[#ff9900] transition-colors mb-4 font-medium"
                  >
                    <FiChevronRight className="rotate-180" /> Zurück zur Übersicht
                  </motion.button>
                )}

                {editUser ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-gray-200/50"
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-700 block mb-2 font-semibold">Name</label>
                          <input 
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none transition-colors bg-white/80" 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Dr. Max Mustermann" 
                          />
                        </div>
                        <div>
                          <label className="text-gray-700 block mb-2 font-semibold">Rolle</label>
                          <input 
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none transition-colors bg-white/80" 
                            value={editRolle} 
                            onChange={(e) => setEditRolle(e.target.value)}
                            placeholder="Zahnarzt" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-700 block mb-2 font-semibold">Avatar-Farbe</label>
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
                    <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
                      {editUser.id && (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={deleteUser} 
                          className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
                        >
                          <FiTrash2 /> Löschen
                        </motion.button>
                      )}
                      <div className="flex gap-3 ml-auto">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditUser(null)} 
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors shadow-sm hover:shadow-md font-semibold"
                        >
                          Abbrechen
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveUser} 
                          className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl font-semibold"
                        >
                          Speichern
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {benutzer.map((b, index) => (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-5 rounded-xl bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-between cursor-pointer border border-gray-200/50"
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
        </main>
      </div>
    </div>
  );
}
