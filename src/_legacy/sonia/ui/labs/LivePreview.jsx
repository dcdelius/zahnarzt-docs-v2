import React, { useMemo } from 'react';
import { buildGPTPromptsV3 } from '../../prompts/buildGPTPromptsV3';
import { getBlockLabel } from '../../knowledge/blocks/blockRegistry';

export const LivePreview = ({ template, settings }) => {
    // Mock Case State for Preview
    const mockCaseState = useMemo(() => ({
        data: {
            _rawDictation: "Füllung an 16, 3-flächig.",
            _injectedText: [],
            // Mock data for fields
            tooth: "16",
            surfaces: "mod",
            material: "Tetric EvoCeram",
            anesthesia: "Infiltration",
            caries_depth: "Caries profunda",
            isolation: "Watterollen",
            conditioning: "Total-Etch",
            technique: "Schichttechnik",
            matrix_system: "Teilmatrize"
        },
        meta: {
            insuranceType: settings.global.defaultInsurance,
            acceptedSuggestions: [
                {
                    billingItems: [
                        { code: '2060', label: 'Präp. einer Kavität' },
                        { code: '2080', label: 'Füllung mehrflächig' }
                    ]
                }
            ]
        },
        conflicts: [],
        sources: {}
    }), [settings]);

    const mockValidation = { issues: [] };

    const previewText = useMemo(() => {
        const parts = [];
        const billingItems = [];

        // --- DYNAMIC BILLING LOGIC ---
        billingItems.push({ code: '5000/5004', label: 'Intraorales Röntgen (AUTO nach Aufnahmeart)', condition: template.groups.includes('xray') });
        billingItems.push({ code: '2060/2080/2100/2120', label: 'Kompositfüllung mehrflächig (AUTO nach Flächen) / BEMA F2–F4 (AUTO)', condition: true });

        if (template.groups.includes('isolation')) {
            billingItems.push({ code: '2040', label: 'Kofferdam (wenn abgerechnet werden soll/zulässig)', condition: true });
        }
        if (template.groups.includes('conditioning')) {
            billingItems.push({ code: '2197', label: 'Adhäsive Befestigung/Adhäsivtechnik (falls nach Regelwerk vorgesehen)', condition: true });
        }

        // Helper for headers
        const formatHeader = (text) => {
            if (structure?.headerStyle === 'caps_equals') return `=== ${text.toUpperCase()} ===`;
            if (structure?.headerStyle === 'simple') return `${text}:`;
            return `=== ${text.toUpperCase()} ===`; // Default
        };

        // --- SECTION: OVERVIEW ---
        const renderOverview = () => {
            const lines = [];
            lines.push(formatHeader(structure?.customHeaders?.overview || "ÜBERSICHT & ABRECHNUNG"));
            lines.push("");
            lines.push(`Behandlung: Kompositfüllung Zahn ${mockCaseState.data.tooth} (${mockCaseState.data.caries_depth})`);
            lines.push(`Material: ${mockCaseState.data.material}`);
            lines.push("Befund/Tests präop: ViPr (Kälte) + (kurz), Perkussion –, Palpation –");

            if (settings.global.showBillingCodes) {
                lines.push("");
                lines.push("Durchgeführte Leistungen (abrechnungsrelevant):");
                billingItems.filter(item => item.condition).forEach(item => {
                    if (structure?.billingStyle === 'list') {
                        lines.push(`\t•\t${item.label} — GOZ ${item.code}`);
                    } else {
                        lines.push(`${item.label} (${item.code})`);
                    }
                });
            }
            lines.push("");
            lines.push("⸻");
            lines.push("");
            return lines;
        };

        // --- SECTION: COURSE ---
        const renderCourse = () => {
            const lines = [];
            lines.push(formatHeader(structure?.customHeaders?.course || "BEHANDLUNGSABLAUF (KURZ & FORENSISCH)"));
            lines.push("");

            // Integrated Forensics Header
            if (structure?.forensicPosition === 'integrated_in_course') {
                lines.push("Pat. aufgeklärt (u.a. Sensibilität/Pulpitis-Risiko bei tiefer Karies, Füllungsverlust/Fraktur, Kariesrezidiv); Fragen beantwortet, Einwilligung erteilt.");
            }

            const courseSteps = [];
            template.groups.forEach(groupId => {
                switch (groupId) {
                    case 'anesthesia': courseSteps.push("LA: Infiltration (Ultracain D-S 1:200.000), Wirkung abgewartet."); break;
                    case 'isolation': courseSteps.push("Isolation: Kofferdam angelegt."); break;
                    case 'caries_depth': courseSteps.push("Kariesexkavation: tiefe Karies entfernt; peripher sondenhart, pulpanah selektiv; keine Pulpaeröffnung, CP/Überkappung nicht erforderlich."); break;
                    case 'matrix_system': courseSteps.push("Matrize: Teilmatrize + Keil."); break;
                    case 'conditioning': courseSteps.push("Adhäsivtechnik: Ätzen (SÄ 30 s / Dentin 15 s), Bonding appliziert, lichthärtend."); break;
                    case 'technique': courseSteps.push("Füllung: Komposit schichtweise (≤2 mm), jeweils lichthärtend; Kontakt-/Randkontrolle."); break;
                    case 'pulp_capping': courseSteps.push("CP: Kalziumhydroxid-Überkappung appliziert."); break;
                    case 'bmf': courseSteps.push("bMF: Spanngummi, Mundsperrer."); break;
                    case 'fluoridation': courseSteps.push("Abschluss: Fluoridierung."); break;
                    case 'xray': courseSteps.push("Rö: Bissflügel re., unauffällig."); break;
                }
            });

            // Always add finishing
            if (!courseSteps.some(s => s.startsWith('Finishing'))) {
                courseSteps.push("Finishing: Okklusionskontrolle (Zentrik/Exkursion), Korrektur, Politur.");
            }
            courseSteps.push("Hinweise: postoperativ Sensibilität möglich; Wiedervorstellung bei anhaltenden Beschwerden.");

            if (structure?.courseStyle === 'bullets') {
                courseSteps.forEach(step => lines.push(`• ${step}`));
            } else {
                lines.push(courseSteps.join(" "));
            }

            lines.push("");
            lines.push("⸻");
            return lines;
        };

        // --- ASSEMBLE ---
        if (structure?.overviewPosition === 'top') {
            parts.push(...renderOverview());
            parts.push(...renderCourse());
        } else {
            parts.push(...renderCourse());
            parts.push(...renderOverview());
        }

        // Separate Forensic Footer
        if (structure?.forensicPosition === 'footer' || !structure) {
            if (settings.global.forensicLevel === 'detailed') {
                parts.push("");
                parts.push("FORENSIK (kurz): Aufklärung (Risiken/Alternativen) erfolgt, Einwilligung liegt vor. ViPr präop s. o.");
            } else if (settings.global.forensicLevel === 'standard') {
                parts.push("");
                parts.push("Aufklärung erfolgt, Einwilligung liegt vor.");
            }
        }

        return parts.join("\n");
    }, [template, mockCaseState, settings, structure]);

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">Live Vorschau</h3>
                        <p className="text-xs text-gray-600">Beispiel einer Füllung an Zahn 16</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8 font-sans text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white">
                {previewText}
            </div>
        </div>
    );
};
