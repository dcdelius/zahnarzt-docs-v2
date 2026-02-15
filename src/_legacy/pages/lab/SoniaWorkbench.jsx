import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlayCircle,
  FiCpu,
  FiZap,
  FiShield,
  FiRefreshCw,
  FiClipboard,
  FiCheck,
  FiLoader,
  FiAlertTriangle,
  FiCheckCircle,
  FiSlash,
  FiCornerRightDown,
  FiCopy
} from "react-icons/fi";
import { toast } from "sonner";
import { extractStructuredData } from "../../engine/extractStructuredData";
import { validateData } from "../../engine/validate";

const SAMPLE_DICTATION = `Patient klagt über Schmerzen an 16. Leitungsanästhesie mit Ultracain. Präparation als Hohlkehle, Farbe A3 bestimmt. Provisorium eingegliedert.`;

const MATERIAL_LIBRARY = [
  "Tetric EvoCeram",
  "Filtek Supreme",
  "Admira Fusion",
  "OptiBond FL",
  "G-Premio Bond"
];

const SAMPLE_TEMPLATE_V3 = {
  id: "kons_fill_v4_lab",
  version: 1,
  title: "Füllungstherapie (Lab)",
  category: "Konservierend",
  fields: [
    { id: "tooth", label: "Zahn", type: "string", required: true, description: "FDI ohne Punkt (z.B. 16, 36)." },
    { id: "surfaces", label: "Flächen", type: "multiselect", description: "m/d/o etc." },
    { id: "anesthesiaType", label: "Anästhesie", type: "string", description: "z.B. Leitungsanästhesie, Infiltration." },
    { id: "dryField", label: "Trockenlegung", type: "enum", options: ["relativ", "Kofferdam"], description: "Art der Trockenlegung." },
    { id: "prepType", label: "Präparation", type: "enum", options: ["Hohlkehle", "Stufen", "Minimalinvasiv"], description: "Präparationsart." },
    { id: "shade", label: "Farbe", type: "string", description: "z.B. A3, BL2." },
    { id: "provisional", label: "Provisorium", type: "boolean", description: "Provisorium eingegliedert?" },
    { id: "materialUsed", label: "Material", type: "string", description: "Verwendetes Material (aus Liste)." },
    { id: "occlusionChecked", label: "Okklusion geprüft", type: "boolean" },
    { id: "consentDocumented", label: "Aufklärung dokumentiert", type: "boolean", required: true },
    { id: "riskDiscussed", label: "Risiken dokumentiert", type: "boolean" },
    { id: "radiograph", label: "Röntgen", type: "enum", options: ["ja", "nein"] },
    { id: "mkvSigned", label: "MKV unterschrieben", type: "boolean" },
    { id: "boosterReason", label: "Faktor-Begründung", type: "text" }
  ],
  rules: [
    {
      id: "consent-required",
      when: [{ fieldId: "riskDiscussed", operator: "exists" }],
      then: [{ type: "require", targetFieldId: "consentDocumented" }]
    },
    {
      id: "booster-needs-reason",
      when: [{ fieldId: "boosterReason", operator: "notExists" }],
      then: [
        {
          type: "warn",
          message: "Faktor-Begründung fehlt (falls Revenue Booster aktiv)."
        }
      ]
    }
  ],
  renderConfig: {
    blocks: []
  }
};

const ACTION_CHIPS = [
  {
    id: "chip-anesthesia",
    label: "Leitungsanästhesie",
    fieldId: "anesthesiaType",
    value: "Leitungsanästhesie",
    group: "dictation",
    description: "Im Diktat gehört",
    billingHint: "BEMA 40/41 oder GOZ 2020",
    matches: (value) => typeof value === "string" && value.toLowerCase().includes("leitungs")
  },
  {
    id: "chip-prep",
    label: "Hohlkehlpräparation",
    fieldId: "prepType",
    value: "Hohlkehle",
    group: "dictation",
    description: "Präparationsart",
    billingHint: "GOZ 5000",
    matches: (value) => value === "Hohlkehle"
  },
  {
    id: "chip-provi",
    label: "Provisorium",
    fieldId: "provisional",
    value: true,
    group: "dictation",
    description: "Provisorium eingegliedert",
    billingHint: "GOZ 2260",
    matches: (value) => value === true
  },
  {
    id: "chip-dry",
    label: "Trockenlegung (rel.)",
    fieldId: "dryField",
    value: "relativ",
    group: "standard",
    description: "Rel. Trockenlegung aktivieren",
    billingHint: "BEMA bMF / GOZ 2030"
  },
  {
    id: "chip-occlusion",
    label: "Okklusionskontrolle",
    fieldId: "occlusionChecked",
    value: true,
    group: "standard",
    description: "Okklusion geprüft",
    billingHint: "BEMA 13/4 (Kontrolle)"
  },
  {
    id: "chip-consent",
    label: "Aufklärung dokumentiert",
    fieldId: "consentDocumented",
    value: true,
    group: "critical",
    description: "Patient aufgeklärt & einverstanden",
    matches: (value) => value === true
  },
  {
    id: "chip-risks",
    label: "Risiken erklärt",
    fieldId: "riskDiscussed",
    value: true,
    group: "critical",
    description: "Spezifische Risiken dokumentiert",
    matches: (value) => value === true
  },
  {
    id: "chip-rx",
    label: "Röntgen dokumentiert",
    fieldId: "radiograph",
    value: "ja",
    group: "critical",
    description: "Röntgenaufnahme erwähnt",
    matches: (value) => value === "ja"
  },
  {
    id: "chip-mkv",
    label: "MKV unterschrieben",
    fieldId: "mkvSigned",
    value: true,
    group: "standard",
    description: "Mehrkostenvereinbarung liegt vor",
    matches: (value) => value === true
  }
];

const CHIP_GROUP_META = {
  dictation: { label: "Im Diktat erkannt", accent: "bg-emerald-50 text-emerald-700" },
  standard: { label: "Praxis-Standards", accent: "bg-sky-50 text-sky-700" },
  critical: { label: "Kritisch/Forensik", accent: "bg-amber-50 text-amber-700" }
};

const cycleChipState = (current) => {
  if (current === "active") return "inactive";
  if (current === "inactive") return "optional";
  return "active";
};

const deriveChipStateFromData = (data) => {
  const next = {};
  ACTION_CHIPS.forEach((chip) => {
    const value = data?.[chip.fieldId];
    const matches = chip.matches ? chip.matches(value) : Boolean(value);
    if (matches) {
      next[chip.id] = "active";
    } else if (chip.group === "dictation") {
      next[chip.id] = "inactive";
    } else {
      next[chip.id] = "optional";
    }
  });
  return next;
};

const applyChipToData = (data, chip, state) => {
  const next = { ...data };
  if (state === "active") {
    next[chip.fieldId] = chip.value ?? true;
  } else if (state === "inactive") {
    next[chip.fieldId] = null;
  } else {
    next[chip.fieldId] = null;
  }
  return next;
};

const deriveMaterialsFromData = (data) => {
  if (!data?.materialUsed) return [];
  return data.materialUsed
    .split(/[,;/]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const buildPreviewText = (data, { insurance, blueprint }) => {
  const tooth = data.tooth || "___";
  const prep = data.prepType ? `Präparation: ${data.prepType}.` : "";
  const la = data.anesthesiaType ? `Anästhesie: ${data.anesthesiaType}.` : "";
  const dry = data.dryField ? `Trockenlegung: ${data.dryField}.` : "";
  const material = data.materialUsed ? `Material: ${data.materialUsed}.` : "";
  const shade = data.shade ? `Farbe: ${data.shade}.` : "";
  const occlusion = data.occlusionChecked ? "Okklusion geprüft." : "";
  const provisional = data.provisional ? "Provisorium eingegliedert." : "";
  const consent = data.consentDocumented ? "Aufklärung + Einwilligung dokumentiert." : "[FEHLT: Aufklärung]";
  const risks = data.riskDiscussed ? "Risiken erläutert (Pulpa, Sensibilität, Alternative)." : "[FEHLT: Risikoaufklärung]";

  const abrechnungLines = [];
  if (data.anesthesiaType) abrechnungLines.push(`• LA: ${data.anesthesiaType} (${insurance === "PKV" ? "GOZ 2020" : "BEMA 40/41"})`);
  if (data.prepType) abrechnungLines.push(`• Hauptleistung: ${data.prepType} (GOZ 5000)`);
  if (data.mkvSigned) abrechnungLines.push("• MKV unterschrieben – Mehrkosten abrechenbar");
  if (data.boosterReason) abrechnungLines.push(`• Faktor >2.3: ${data.boosterReason}`);

  const course = [`Zahn ${tooth}.`, prep, la, dry, material, shade, provisional, occlusion, consent, risks]
    .filter(Boolean)
    .join(" ");

  if (blueprint === "classic") {
    return `${abrechnungLines.map((l) => l.replace("• ", "")).join(" | ")}\n\n${course}`;
  }

  return `<abrechnung>\n${abrechnungLines.length ? abrechnungLines.join("\n") : "• (noch keine Angaben)"}\n</abrechnung>\n\n<behandlung>\n${course || "Keine Angaben"}\n</behandlung>`;
};

const buildReviewWarnings = (data, materialCheck, selectedMaterials) => {
  const warnings = [];
  if (!data.consentDocumented) warnings.push("Aufklärung/Einwilligung fehlt");
  if (!data.riskDiscussed) warnings.push("Risiken nicht dokumentiert");
  if (!data.occlusionChecked) warnings.push("Okklusionskontrolle nicht bestätigt");
  if (materialCheck && selectedMaterials.length === 0) warnings.push("Kein Material bestätigt");
  if (!data.boosterReason && data.mkvSigned) warnings.push("Faktor-Begründung fehlt für MKV");
  return warnings;
};

const ActionChip = ({ chip, state, onToggle }) => {
  const stateStyles = {
    active: "border-emerald-500 bg-emerald-50 text-emerald-900",
    inactive: "border-red-400 bg-red-50 text-red-600",
    optional: "border-gray-200 bg-white text-gray-600"
  };
  const stateIcons = {
    active: <FiCheckCircle className="w-4 h-4" />,
    inactive: <FiSlash className="w-4 h-4" />,
    optional: <FiCornerRightDown className="w-4 h-4" />
  };

  return (
    <button
      onClick={() => onToggle(chip)}
      className={`w-full text-left rounded-2xl border px-4 py-3 flex flex-col gap-1 transition ${stateStyles[state]}`}
    >
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">
          {stateIcons[state]}
          {chip.label}
        </span>
        <span className="text-xs uppercase tracking-widest text-gray-400">{state}</span>
      </div>
      <p className="text-xs opacity-80">{chip.description}</p>
      {chip.billingHint && state === "active" && (
        <p className="text-[10px] text-emerald-700 font-semibold">Billing: {chip.billingHint}</p>
      )}
    </button>
  );
};

export default function SoniaWorkbench() {
  const [dictation, setDictation] = useState(SAMPLE_DICTATION);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMeta, setExtractionMeta] = useState(null);
  const [formData, setFormData] = useState({});
  const [chipStates, setChipStates] = useState(deriveChipStateFromData({}));
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [insurance, setInsurance] = useState("GKV");
  const [blueprint, setBlueprint] = useState("modern");
  const [textLength, setTextLength] = useState("standard");
  const [forensicLevel, setForensicLevel] = useState("standard");
  const [revenueBooster, setRevenueBooster] = useState("off");
  const [materialCheck, setMaterialCheck] = useState(true);
  const [previewText, setPreviewText] = useState("");
  const [reviewFlags, setReviewFlags] = useState([]);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    const enriched = {
      ...formData,
      materialUsed: selectedMaterials.join(", ") || formData.materialUsed || null
    };
    const preview = buildPreviewText(enriched, { insurance, blueprint });
    setPreviewText(preview);
    setReviewFlags(buildReviewWarnings(enriched, materialCheck, selectedMaterials));
    setValidationResult(validateData(SAMPLE_TEMPLATE_V3, enriched));
  }, [formData, selectedMaterials, insurance, blueprint, materialCheck]);

  const runExtraction = async () => {
    if (!dictation.trim()) {
      toast.error("Bitte Diktat eingeben.");
      return;
    }

    setIsExtracting(true);
    try {
      const extraction = await extractStructuredData(SAMPLE_TEMPLATE_V3, dictation);
      setExtractionMeta(extraction.meta);
      const normalizedData = { ...extraction.data };
      setFormData(normalizedData);
      setChipStates(deriveChipStateFromData(normalizedData));
      setSelectedMaterials(deriveMaterialsFromData(normalizedData));
      toast.success("Extraktion abgeschlossen");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Extraktion fehlgeschlagen");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleChipToggle = (chip) => {
    setChipStates((prev) => {
      const current = prev[chip.id] || "optional";
      const nextState = cycleChipState(current);
      setFormData((prevData) => applyChipToData(prevData, chip, nextState));
      return { ...prev, [chip.id]: nextState };
    });
  };

  const toggleMaterial = (item) => {
    setSelectedMaterials((prev) => {
      if (prev.includes(item)) {
        return prev.filter((mat) => mat !== item);
      }
      return [...prev, item];
    });
  };

  const addCustomMaterial = () => {
    const label = prompt("Custom Material");
    if (label && label.trim()) {
      setSelectedMaterials((prev) => [...prev, label.trim()]);
    }
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      toast.success("Preview kopiert!");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const dictationChips = ACTION_CHIPS.filter((c) => c.group === "dictation");
  const standardChips = ACTION_CHIPS.filter((c) => c.group === "standard");
  const criticalChips = ACTION_CHIPS.filter((c) => c.group === "critical");

  return (
    <div className="space-y-8">
      <section className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400 font-semibold">Prototype</p>
            <h2 className="text-2xl font-black text-gray-900 mt-1">Dictation → Extraction → Review</h2>
          </div>
          <button
            onClick={runExtraction}
            disabled={isExtracting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-semibold shadow-lg disabled:opacity-50"
          >
            {isExtracting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiCpu className="w-4 h-4" />}
            {isExtracting ? "Extrahiere..." : "Extraktion starten"}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
              <FiPlayCircle /> Diktat
            </div>
            <textarea
              value={dictation}
              onChange={(e) => setDictation(e.target.value)}
              className="w-full h-44 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#ff9900]"
            />
            {extractionMeta?.warnings?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 space-y-2">
                {extractionMeta.warnings.map((warn) => (
                  <p key={warn.message} className="flex items-center gap-2">
                    <FiAlertTriangle />
                    {warn.message}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
              <FiShield /> Settings
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs text-gray-500 font-semibold">Versicherung</label>
                <div className="mt-1 flex gap-2">
                  {["GKV", "PKV"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setInsurance(opt)}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm font-semibold ${
                        insurance === opt ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Blueprint</label>
                <div className="mt-1 flex gap-2">
                  {["modern", "forensic", "classic"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setBlueprint(opt)}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm font-semibold capitalize ${
                        blueprint === opt ? "border-[#ff9900] bg-[#ff9900]/10 text-[#ff9900]" : "border-gray-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Textlänge</label>
                <select
                  value={textLength}
                  onChange={(e) => setTextLength(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                >
                  <option value="ultra-short">Ultra kurz</option>
                  <option value="short">Kurz</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailliert</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Forensik-Level</label>
                <select
                  value={forensicLevel}
                  onChange={(e) => setForensicLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                >
                  <option value="minimal">Minimal</option>
                  <option value="standard">Standard</option>
                  <option value="max">Maximal</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Revenue Booster</label>
                <select
                  value={revenueBooster}
                  onChange={(e) => setRevenueBooster(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                >
                  <option value="off">Aus</option>
                  <option value="smart">Smart</option>
                  <option value="max">Max</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 font-semibold">Material Check</label>
                <button
                  onClick={() => setMaterialCheck((prev) => !prev)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                    materialCheck ? "border-emerald-500 text-emerald-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  {materialCheck ? "aktiv" : "aus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {[dictationChips, standardChips, criticalChips].map((chips, idx) => {
          const groupKey = chips[0]?.group || ["dictation", "standard", "critical"][idx];
          const meta = CHIP_GROUP_META[groupKey];
          return (
            <div key={groupKey} className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow p-4 space-y-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.3em] ${meta.accent}`}>
                {meta.label}
              </span>
              <div className="space-y-3">
                {chips.map((chip) => (
                  <ActionChip key={chip.id} chip={chip} state={chipStates[chip.id] || "optional"} onToggle={handleChipToggle} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <FiRefreshCw /> Kernfelder
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {["tooth", "shade", "boosterReason"].map((fieldId) => (
              <div key={fieldId} className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-semibold">{SAMPLE_TEMPLATE_V3.fields.find((f) => f.id === fieldId)?.label}</label>
                <input
                  value={formData[fieldId] || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-semibold">Flächen</label>
              <input
                value={(formData.surfaces || []).join(", ")}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    surfaces: e.target.value
                      .split(/[,;]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                  }))
                }
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
                placeholder="m, o, d..."
              />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <FiZap /> Materialien
          </div>
          <div className="flex flex-wrap gap-2">
            {MATERIAL_LIBRARY.map((mat) => (
              <button
                key={mat}
                onClick={() => toggleMaterial(mat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedMaterials.includes(mat) ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"
                }`}
              >
                {mat}
              </button>
            ))}
            <button
              onClick={addCustomMaterial}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-gray-300 text-gray-500"
            >
              + Custom
            </button>
          </div>
          {selectedMaterials.length > 0 && (
            <p className="text-xs text-gray-500">
              Bestätigt: <span className="font-semibold text-gray-900">{selectedMaterials.join(", ")}</span>
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur rounded-3xl border border-white/60 shadow p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
              <FiClipboard /> Preview
            </div>
            <button onClick={copyPreview} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 flex items-center gap-2">
              <FiCopy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-800 whitespace-pre-wrap max-h-[320px] overflow-y-auto">
            {previewText}
          </pre>
        </div>
        <div className="bg-white/90 backdrop-blur rounded-3xl border border-white/60 shadow p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <FiAlertTriangle /> Review
          </div>
          <div className="space-y-2 text-sm">
            {reviewFlags.length === 0 ? (
              <p className="flex items-center gap-2 text-emerald-600">
                <FiCheck /> Forensik-Check bestanden
              </p>
            ) : (
              reviewFlags.map((flag) => (
                <p key={flag} className="flex items-center gap-2 text-amber-600">
                  <FiAlertTriangle /> {flag}
                </p>
              ))
            )}
          </div>
          {validationResult?.issues?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-600 space-y-1">
              <p className="font-bold uppercase tracking-widest text-[11px]">Validation</p>
              {validationResult.issues.map((issue, idx) => (
                <p key={`${issue.message}-${idx}`}>{issue.message}</p>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


