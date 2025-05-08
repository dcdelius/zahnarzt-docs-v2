import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiHeart, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

export default function BausteinVerwaltung({ currentUserId }) {
  const [bausteine, setBausteine] = useState([]);
  const [editBaustein, setEditBaustein] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Bausteine laden
  useEffect(() => {
    const loadBausteine = async () => {
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Bausteine"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBausteine(data);
    };
    loadBausteine();
  }, []);

  // Baustein speichern/aktualisieren
  const handleSave = async (e) => {
    e.preventDefault();
    const baustein = {
      titel: e.target.titel.value,
      standardText: e.target.standardText.value,
      abrechnung: e.target.abrechnung.value.split(',').map(x => x.trim()),
      kategorie: e.target.kategorie.value,
      platzhalter: e.target.platzhalter.value.split(',').map(x => x.trim()).filter(Boolean),
      favoritenVon: editBaustein?.favoritenVon || []
    };

    try {
      if (editBaustein) {
        await setDoc(doc(db, "Praxen", "1", "Bausteine", editBaustein.id), baustein);
      } else {
        const id = baustein.titel.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(db, "Praxen", "1", "Bausteine", id), baustein);
      }
      
      // Liste neu laden
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Bausteine"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBausteine(data);
      
      setEditBaustein(null);
      setShowForm(false);
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  };

  // Baustein löschen
  const handleDelete = async (id) => {
    if (!window.confirm("Baustein wirklich löschen?")) return;
    
    try {
      await deleteDoc(doc(db, "Praxen", "1", "Bausteine", id));
      setBausteine(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  };

  // Favorit toggle
  const toggleFavorit = async (baustein) => {
    const isFavorit = baustein.favoritenVon?.includes(currentUserId);
    const newFavoriten = isFavorit
      ? baustein.favoritenVon.filter(id => id !== currentUserId)
      : [...(baustein.favoritenVon || []), currentUserId];
    
    try {
      await updateDoc(doc(db, "Praxen", "1", "Bausteine", baustein.id), {
        favoritenVon: newFavoriten
      });
      
      setBausteine(prev => prev.map(b =>
        b.id === baustein.id
          ? { ...b, favoritenVon: newFavoriten }
          : b
      ));
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Favoriten:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Bausteine verwalten</h2>
        <button
          onClick={() => { setEditBaustein(null); setShowForm(true); }}
          className="px-4 py-2 bg-[#ff9900] text-white rounded-lg flex items-center gap-2 hover:bg-orange-600 transition-colors"
        >
          <FiPlus /> Neuer Baustein
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-8 bg-white p-6 rounded-xl shadow">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Titel</label>
              <input
                name="titel"
                defaultValue={editBaustein?.titel}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Kategorie</label>
              <input
                name="kategorie"
                defaultValue={editBaustein?.kategorie}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block mb-2 text-sm font-medium">Standardtext</label>
              <textarea
                name="standardText"
                defaultValue={editBaustein?.standardText}
                className="w-full p-2 border rounded"
                rows="3"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Abrechnung (kommagetrennt)</label>
              <input
                name="abrechnung"
                defaultValue={editBaustein?.abrechnung?.join(', ')}
                className="w-full p-2 border rounded"
                placeholder="z.B. GOZ 0090, GOZ 2040"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Platzhalter (kommagetrennt)</label>
              <input
                name="platzhalter"
                defaultValue={editBaustein?.platzhalter?.join(', ')}
                className="w-full p-2 border rounded"
                placeholder="z.B. Art der Anästhesie, Menge"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Speichern
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {bausteine.map(baustein => (
          <div key={baustein.id} className="bg-white p-4 rounded-lg shadow flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{baustein.titel}</h3>
                <span className="text-sm text-gray-500">{baustein.kategorie}</span>
              </div>
              <p className="text-gray-700 mb-2">{baustein.standardText}</p>
              {baustein.abrechnung?.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {baustein.abrechnung.map(code => (
                    <span key={code} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleFavorit(baustein)}
                className={`p-2 rounded hover:bg-gray-100 ${
                  baustein.favoritenVon?.includes(currentUserId)
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}
              >
                <FiHeart />
              </button>
              <button
                onClick={() => { setEditBaustein(baustein); setShowForm(true); }}
                className="p-2 rounded hover:bg-gray-100 text-gray-600"
              >
                <FiEdit2 />
              </button>
              <button
                onClick={() => handleDelete(baustein.id)}
                className="p-2 rounded hover:bg-gray-100 text-gray-600"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 