import React, { useState, useEffect } from 'react';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';
import { motion } from 'framer-motion';
import { FiSave, FiPlus, FiTrash2, FiCpu, FiList, FiSettings, FiShield, FiEdit3, FiCheck } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function SoniaDesigner() {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [activeTab, setActiveTab] = useState("fields"); // fields, blocks, settings

    // Load Templates
    useEffect(() => {
        const load = async () => {
            try {
                const snap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
                const dbList = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.systemVersion === 'v3');

                // Merge DB list with Master Template if not present
                const hasMaster = dbList.find(t => t.id === MASTER_TEMPLATE_V3.id);
                const list = hasMaster ? dbList : [MASTER_TEMPLATE_V3, ...dbList];

                setTemplates(list);
            } catch (e) {
                console.error("Failed to load from DB, falling back to Master Template", e);
                setTemplates([MASTER_TEMPLATE_V3]);
            }
        };
        load();
    }, []);

    const handleSelect = (id) => {
        setSelectedTemplateId(id);
        const tmpl = templates.find(t => t.id === id);
        if (tmpl) setCurrentTemplate(JSON.parse(JSON.stringify(tmpl))); // Deep clone
    };

    const handleSave = async () => {
        if (!currentTemplate) return;
        try {
            await setDoc(doc(db, "Praxen", "1", "Vorlagen", currentTemplate.id), currentTemplate);
            toast.success("Template gespeichert!");
            // Reload list
            const snap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
            setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.systemVersion === 'v3'));
        } catch (e) {
            console.error(e);
            toast.error("Fehler beim Speichern.");
        }
    };

    const addField = () => {
        setCurrentTemplate(prev => ({
            ...prev,
            fields: [...(prev.fields || []), { id: `field_${Date.now()}`, label: "Neues Feld", type: "string" }]
        }));
    };

    const removeField = (idx) => {
        setCurrentTemplate(prev => ({
            ...prev,
            fields: prev.fields.filter((_, i) => i !== idx)
        }));
    };

    const updateField = (idx, key, val) => {
        setCurrentTemplate(prev => {
            const newFields = [...prev.fields];
            newFields[idx] = { ...newFields[idx], [key]: val };
            return { ...prev, fields: newFields };
        });
    };

    const handleCreate = async () => {
        const newId = `template_v3_${Date.now()}`;
        const newTemplate = {
            id: newId,
            title: "Neues Template",
            category: "Allgemein",
            systemVersion: "v3",
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            description: "Eine neue Vorlage",
            fields: [],
            rules: [],
            practiceDefaults: { standardLeistungen: "" },
            aiSettings: { textLength: "standard", forensicLevel: "standard", blueprint: "" },
            renderConfig: {
                blocks: [
                    { id: "b1", title: "Diagnose", type: "text", template: "Befund an Zahn {tooth}." },
                    { id: "b2", title: "Therapie", type: "bullets", fields: [] }
                ]
            }
        };

        try {
            await setDoc(doc(db, "Praxen", "1", "Vorlagen", newId), newTemplate);
            setTemplates(prev => [...prev, newTemplate]);
            handleSelect(newId);
            toast.success("Neues Template erstellt!");
        } catch (e) {
            console.error(e);
            toast.error("Fehler beim Erstellen.");
        }
    };

    // Preview Logic
    const generateDummyData = (fields) => {
        const data = {};
        fields?.forEach(f => {
            if (f.type === 'string') data[f.id] = "Beispieltext";
            else if (f.type === 'text') data[f.id] = "Dies ist ein längerer Beispieltext.";
            else if (f.type === 'boolean') data[f.id] = true;
            else if (f.type === 'enum') data[f.id] = f.options?.[0] || "Option 1";
            else if (f.type === 'multiselect') data[f.id] = f.options?.slice(0, 2) || ["Option A", "Option B"];
        });
        return data;
    };

    const renderPreview = (config, data) => {
        if (!config?.blocks) return "Keine Text-Bausteine definiert.";
        return config.blocks.map(block => {
            if (block.type === 'text') {
                return block.template?.replace(/\{(\w+)\}/g, (_, key) => {
                    const val = data[key];
                    if (Array.isArray(val)) return val.join(", ");
                    return val || `[${key}]`;
                });
            } else if (block.type === 'bullets') {
                return block.fields?.map(fid => {
                    const val = data[fid];
                    if (val === true) return `- ${fid} (Ja)`;
                    if (!val) return null;
                    return `- ${val}`;
                }).filter(Boolean).join('\n');
            }
            return "";
        }).join('\n\n');
    };

    const dummyData = currentTemplate ? generateDummyData(currentTemplate.fields) : {};
    const previewText = currentTemplate ? renderPreview(currentTemplate.renderConfig, dummyData) : "";

    // Block Handlers
    const addBlock = (type) => {
        setCurrentTemplate(prev => ({
            ...prev,
            renderConfig: {
                ...prev.renderConfig,
                blocks: [...(prev.renderConfig?.blocks || []), {
                    id: `b_${Date.now()}`,
                    title: "Neuer Baustein",
                    type,
                    template: type === 'text' ? "Text hier..." : undefined,
                    fields: type === 'bullets' ? [] : undefined
                }]
            }
        }));
    };

    const updateBlock = (idx, key, val) => {
        setCurrentTemplate(prev => {
            const newBlocks = [...(prev.renderConfig?.blocks || [])];
            newBlocks[idx] = { ...newBlocks[idx], [key]: val };
            return { ...prev, renderConfig: { ...prev.renderConfig, blocks: newBlocks } };
        });
    };

    const removeBlock = (idx) => {
        setCurrentTemplate(prev => ({
            ...prev,
            renderConfig: {
                ...prev.renderConfig,
                blocks: (prev.renderConfig?.blocks || []).filter((_, i) => i !== idx)
            }
        }));
    };
    return (
        <div className="flex h-screen bg-[#1a1a1a] text-white font-sans overflow-hidden">
            {/* SIDEBAR */}
            <aside className="w-[320px] flex flex-col py-6 px-6 bg-[#111] border-r border-white/5">
                <div className="mb-8">
                    <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        <FiCpu className="text-[#ff9900]" /> Sonia Designer
                    </h1>
                    <p className="text-white/30 text-[10px] font-medium uppercase tracking-widest mt-1">Template Engineering V3</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    {templates.length === 0 && <div className="text-white/30 text-sm italic">Keine V3 Templates gefunden.</div>}
                    {templates.map(t => (
                        <motion.div
                            key={t.id}
                            onClick={() => handleSelect(t.id)}
                            whileHover={{ scale: 1.02 }}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedTemplateId === t.id
                                ? 'bg-white/10 border-white/20 text-white shadow-sm'
                                : 'bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <div className="font-bold text-sm truncate">{t.title}</div>
                            <div className="text-[10px] opacity-50 mt-0.5">{t.category}</div>
                        </motion.div>
                    ))}
                </div>

                <button
                    className="mt-4 w-full py-3 border border-dashed border-white/10 rounded-xl text-white/30 hover:border-white/30 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                    onClick={handleCreate}
                >
                    <FiPlus /> Neues Template
                </button>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#161616]">
                {currentTemplate ? (
                    <>
                        {/* HEADER */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#111]">
                            <div>
                                <input
                                    value={currentTemplate.title}
                                    onChange={e => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                                    className="bg-transparent border-none text-lg font-bold text-white focus:ring-0 p-0 w-96 placeholder-white/20"
                                    placeholder="Template Titel"
                                />
                                <div className="text-[10px] text-white/30 flex gap-2 mt-0.5 font-mono">
                                    <span>ID: {currentTemplate.id}</span>
                                    <span>v{currentTemplate.version}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex bg-white/5 rounded-lg p-1">
                                    <button
                                        onClick={() => setActiveTab("fields")}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'fields' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Daten-Felder
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("blocks")}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'blocks' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Text-Bausteine
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("settings")}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Settings
                                    </button>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSave}
                                    className="flex items-center gap-2 bg-[#ff9900] text-black px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-[#ffaa33] transition-colors"
                                >
                                    <FiSave /> Speichern
                                </motion.button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* EDITOR AREA */}
                            <div className="flex-1 overflow-y-auto p-8 relative">
                                {activeTab === 'fields' && (
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold flex items-center gap-2"><FiList className="text-[#ff9900]" /> Daten-Felder</h2>
                                            <button onClick={addField} className="text-[#ff9900] text-xs font-bold uppercase tracking-wider hover:text-[#ffaa33] flex items-center gap-2 bg-[#ff9900]/10 px-3 py-2 rounded-lg">
                                                <FiPlus /> Feld hinzufügen
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {currentTemplate.fields?.map((field, idx) => (
                                                <div key={idx} className="group bg-[#1a1a1a] hover:bg-[#222] rounded-xl border border-white/5 hover:border-white/10 transition-all p-4 flex items-start gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center text-white/30 group-hover:text-[#ff9900] transition-colors mt-1">
                                                        {field.type === 'string' && <span title="Text (Kurz)">Aa</span>}
                                                        {field.type === 'text' && <span title="Text (Lang)">¶</span>}
                                                        {field.type === 'boolean' && <span title="Ja/Nein">?</span>}
                                                        {field.type === 'multiselect' && <span title="Mehrfachauswahl">☑</span>}
                                                        {field.type === 'enum' && <span title="Einzelauswahl">◉</span>}
                                                    </div>
                                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-white/20 uppercase block mb-1">Feld-Name</label>
                                                            <input
                                                                value={field.label}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const newId = val.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                                                    const isNew = field.id.startsWith('field_') || field.id === '';
                                                                    if (isNew) updateField(idx, 'id', newId);
                                                                    updateField(idx, 'label', val);
                                                                }}
                                                                className="w-full bg-transparent border-none p-0 text-white font-bold focus:ring-0 placeholder-white/20"
                                                                placeholder="Name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-white/20 uppercase block mb-1">Instruktion</label>
                                                            <input
                                                                value={field.description || ""}
                                                                onChange={e => updateField(idx, 'description', e.target.value)}
                                                                className="w-full bg-transparent border-none p-0 text-white/70 text-sm focus:ring-0 placeholder-white/10"
                                                                placeholder="Beschreibung..."
                                                            />
                                                        </div>
                                                        {(field.type === 'enum' || field.type === 'multiselect') && (
                                                            <div className="col-span-2">
                                                                <label className="text-[10px] font-bold text-white/20 uppercase block mb-1">Optionen (Kommagetrennt)</label>
                                                                <input
                                                                    value={field.options?.join(', ') || ""}
                                                                    onChange={e => updateField(idx, 'options', e.target.value.split(',').map(s => s.trim()))}
                                                                    className="w-full bg-black/20 rounded-lg border-none py-1 px-2 text-white/70 text-xs focus:ring-0"
                                                                    placeholder="Option A, Option B..."
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <select
                                                            value={field.type}
                                                            onChange={e => updateField(idx, 'type', e.target.value)}
                                                            className="bg-black/30 rounded-md border-none text-white/50 text-[10px] py-1 px-2 focus:ring-0"
                                                        >
                                                            <option value="string">Text</option>
                                                            <option value="text">Langtext</option>
                                                            <option value="boolean">Ja/Nein</option>
                                                            <option value="enum">Single</option>
                                                            <option value="multiselect">Multi</option>
                                                        </select>
                                                        <button
                                                            onClick={() => updateField(idx, 'required', !field.required)}
                                                            className={`p-1.5 rounded-md transition-colors ${field.required ? 'text-[#ff9900] bg-[#ff9900]/10' : 'text-white/20 hover:text-white'}`}
                                                            title="Pflichtfeld"
                                                        >
                                                            <FiShield />
                                                        </button>
                                                        <button onClick={() => removeField(idx)} className="text-white/20 hover:text-red-400 p-1.5 transition-colors">
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'blocks' && (
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold flex items-center gap-2"><FiList className="text-[#ff9900]" /> Text-Bausteine</h2>
                                            <div className="flex gap-2">
                                                <button onClick={() => addBlock('text')} className="text-[#ff9900] text-xs font-bold uppercase tracking-wider hover:text-[#ffaa33] flex items-center gap-2 bg-[#ff9900]/10 px-3 py-2 rounded-lg">
                                                    <FiPlus /> Text
                                                </button>
                                                <button onClick={() => addBlock('bullets')} className="text-[#ff9900] text-xs font-bold uppercase tracking-wider hover:text-[#ffaa33] flex items-center gap-2 bg-[#ff9900]/10 px-3 py-2 rounded-lg">
                                                    <FiList /> Liste
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {currentTemplate.renderConfig?.blocks?.map((block, idx) => (
                                                <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 relative group">
                                                    <button onClick={() => removeBlock(idx)} className="absolute top-4 right-4 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <FiTrash2 />
                                                    </button>

                                                    <div className="mb-4">
                                                        <input
                                                            value={block.title}
                                                            onChange={e => updateBlock(idx, 'title', e.target.value)}
                                                            className="bg-transparent border-none text-base font-bold text-white focus:ring-0 p-0 placeholder-white/20 w-full"
                                                            placeholder="Titel (z.B. Diagnose)"
                                                        />
                                                    </div>

                                                    {block.type === 'text' && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-white/30 uppercase block mb-2">Template Text (Nutze {'{FeldName}'} für Platzhalter)</label>
                                                            <textarea
                                                                value={block.template}
                                                                onChange={e => updateBlock(idx, 'template', e.target.value)}
                                                                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-[#ff9900] focus:ring-0 font-mono leading-relaxed"
                                                                rows={3}
                                                                placeholder="Der Patient klagt über Schmerzen an Zahn {tooth}..."
                                                            />
                                                        </div>
                                                    )}

                                                    {block.type === 'bullets' && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-white/30 uppercase block mb-2">Felder für Liste</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {currentTemplate.fields.map(f => (
                                                                    <button
                                                                        key={f.id}
                                                                        onClick={() => {
                                                                            const current = block.fields || [];
                                                                            const newFields = current.includes(f.id)
                                                                                ? current.filter(id => id !== f.id)
                                                                                : [...current, f.id];
                                                                            updateBlock(idx, 'fields', newFields);
                                                                        }}
                                                                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${block.fields?.includes(f.id) ? 'bg-[#ff9900]/20 border-[#ff9900] text-[#ff9900]' : 'bg-transparent border-white/10 text-white/50 hover:border-white/30'}`}
                                                                    >
                                                                        {f.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {(!currentTemplate.renderConfig?.blocks || currentTemplate.renderConfig.blocks.length === 0) && (
                                                <div className="text-center py-12 text-white/20 border-2 border-dashed border-white/5 rounded-xl">
                                                    Keine Bausteine definiert.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'settings' && (
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2"><FiSettings className="text-[#ff9900]" /> Einstellungen</h2>

                                        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6">
                                            <h3 className="text-sm font-bold text-white mb-4">AI Konfiguration</h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Textlänge</label>
                                                    <select
                                                        value={currentTemplate.aiSettings?.textLength || "standard"}
                                                        onChange={e => setCurrentTemplate({ ...currentTemplate, aiSettings: { ...currentTemplate.aiSettings, textLength: e.target.value } })}
                                                        className="w-full bg-black/30 rounded-lg border-white/10 text-white text-sm p-2.5 focus:border-[#ff9900] focus:ring-0"
                                                    >
                                                        <option value="ultra-short">Ultra-Kurz</option>
                                                        <option value="short">Kurz</option>
                                                        <option value="standard">Standard</option>
                                                        <option value="detailed">Detailliert</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Forensik-Level</label>
                                                    <select
                                                        value={currentTemplate.aiSettings?.forensicLevel || "standard"}
                                                        onChange={e => setCurrentTemplate({ ...currentTemplate, aiSettings: { ...currentTemplate.aiSettings, forensicLevel: e.target.value } })}
                                                        className="w-full bg-black/30 rounded-lg border-white/10 text-white text-sm p-2.5 focus:border-[#ff9900] focus:ring-0"
                                                    >
                                                        <option value="minimal">Minimal</option>
                                                        <option value="standard">Standard</option>
                                                        <option value="max">Maximal</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6">
                                            <h3 className="text-sm font-bold text-white mb-4">Smart Standards (Chips)</h3>
                                            <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Standard-Leistungen (Kommagetrennt)</label>
                                            <textarea
                                                value={currentTemplate.practiceDefaults?.standardLeistungen || ""}
                                                onChange={e => setCurrentTemplate({ ...currentTemplate, practiceDefaults: { ...currentTemplate.practiceDefaults, standardLeistungen: e.target.value } })}
                                                className="w-full h-24 bg-black/30 rounded-lg border-white/10 text-white text-sm focus:border-[#ff9900] focus:ring-0 p-3"
                                                placeholder="Oberflächenanästhesie, Trockenlegung..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PREVIEW PANEL */}
                            <div className="w-[400px] border-l border-white/5 bg-[#111] flex flex-col">
                                <div className="p-6 border-b border-white/5">
                                    <h3 className="text-xs font-bold text-[#ff9900] uppercase tracking-widest mb-1">Live Vorschau</h3>
                                    <p className="text-[10px] text-white/40">Simuliertes Ergebnis basierend auf Text-Bausteinen.</p>
                                </div>
                                <div className="flex-1 p-8 overflow-y-auto">
                                    <div className="font-mono text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                                        {previewText}
                                    </div>
                                </div>
                                <div className="p-6 border-t border-white/5 bg-black/20">
                                    <h4 className="text-[10px] font-bold text-white/30 uppercase mb-3">Verwendete Beispieldaten</h4>
                                    <div className="space-y-1.5">
                                        {Object.entries(dummyData).map(([k, v]) => (
                                            <div key={k} className="flex justify-between text-[10px]">
                                                <span className="text-white/40 font-mono">{k}:</span>
                                                <span className="text-white/60 truncate max-w-[200px]">{String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                        <FiCpu className="text-6xl mb-4 opacity-20" />
                        <p>Wähle ein Template oder erstelle ein neues.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
