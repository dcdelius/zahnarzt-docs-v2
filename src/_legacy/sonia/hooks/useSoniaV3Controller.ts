// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { resolveCaseState } from '../resolver/resolveCaseState';
import { validateData } from '../../engine/validate';
import { AudioRecorder } from '../../services/AudioRecorder';
import { WhisperService } from '../../services/WhisperService';
import { FEE_CATALOG, FeeDefinition } from '../behandlungen/_shared/feeCatalog';
import { SettingsManager } from '../settings/settingsManager';
import { TreatmentId } from '../knowledge/treatments/treatmentCatalog';
import { getTemplateOrThrow, getTemplatesForTreatment } from '../templates/catalog';
import { getTreatment, getDefaultActiveChips, processTreatment } from '../behandlungen';
import { toast } from 'sonner';

const STORAGE_KEY = 'sonia_v3_session';

function loadSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function normalizeSuggestion(s) {
    const id = s.id ?? s.itemId ?? s.ruleId ?? s.code ?? crypto?.randomUUID?.() ?? String(Math.random());
    return {
        ...s,
        id,
        // unify code field used in UI
        code: s.code ?? s.billingCode ?? s.codes?.gkv ?? s.codes?.pkv,
        // default status
        status: s.status ?? 'suggested',
    };
}

function applyRulePatch(target: Record<string, any>, patch?: { path?: string; value?: any }) {
    if (!patch?.path) return;
    const parts = patch.path.split('.');
    let current = target;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (typeof current[key] !== 'object' || current[key] === null) {
            current[key] = {};
        }
        current = current[key];
    }
    current[parts[parts.length - 1]] = patch.value;
}

export function useSoniaV3Controller() {
    const saved = loadSession();

    // --- Settings & Treatment State ---
    const [settings, setSettings] = useState(() => SettingsManager.load());
    const [treatmentType, setTreatmentType] = useState<string | ''>(saved.treatmentType || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Reload settings on mount
    useEffect(() => {
        setSettings(SettingsManager.load());
    }, []);

    // Handle Treatment Change
    const handleSetTreatmentType = (type: string) => {
        setTreatmentType(type);

        // Resolve Default Template
        const savedDefault = SettingsManager.getSelectedTemplateId(type);
        const registryTemplates = getTemplatesForTreatment(type);
        const resolvedTemplateId = savedDefault || registryTemplates[0]?.id || '';

        setSelectedTemplateId(resolvedTemplateId);

        // Persist selection if it wasn't already
        if (resolvedTemplateId && resolvedTemplateId !== savedDefault) {
            SettingsManager.setSelectedTemplateId(type, resolvedTemplateId);
        }
    };

    // Initialize template if treatment is already set (e.g. from session)
    useEffect(() => {
        if (treatmentType && !selectedTemplateId) {
            handleSetTreatmentType(treatmentType);
        }
    }, [treatmentType]);

    // Resolve Active Template Object
    const activeTemplate = useMemo(() => {
        if (!selectedTemplateId) return null;
        try {
            return getTemplateOrThrow(selectedTemplateId);
        } catch (e) {
            console.error(e);
            return null;
        }
    }, [selectedTemplateId]);

    // Get chips from new treatment system (falling back to old system)
    const availableChips = useMemo(() => {
        if (!treatmentType) return [];

        // Try new treatment system first
        const treatment = getTreatment(treatmentType);
        if (treatment) {
            // Convert new chip format to old format for compatibility
            return treatment.chips.map(chip => ({
                id: chip.id,
                category: chip.category || 'conservative',
                mode: 'chip' as const,
                when: {},
                showInQuickView: chip.showInQuickView || false,  // For UI filtering
                defaultActive: chip.defaultActive || false,
                then: {
                    label: chip.label,
                    description: chip.description,
                    priority: 5,
                    billingRefs: [
                        chip.billingRefs.GKV,
                        chip.billingRefs.PKV
                    ].filter(Boolean) as string[],
                    textSnippet: chip.textSnippet,
                    patches: chip.dataPatches?.map(p => ({
                        op: 'replace' as const,
                        path: p.field,
                        value: p.value
                    })) || []
                }
            }));
        }

        // No treatment definition found - return empty
        console.warn(`[Sonia] No treatment definition for: ${treatmentType}`);
        return [];
    }, [treatmentType]);

    // Get default active chips from new treatment system
    const treatmentDefaultChips = useMemo(() => {
        if (!treatmentType) return [];
        const treatment = getTreatment(treatmentType);
        if (!treatment) return [];
        return getDefaultActiveChips(treatment);
    }, [treatmentType]);

    // --- Core UI state ---
    const [dictation, setDictation] = useState(saved.dictation || '');
    const [insuranceType, setInsuranceType] = useState(saved.insuranceType || 'GKV');

    // --- Chip Toggle State (Persistent via SettingsManager) ---
    // inactiveStandards is loaded from SettingsManager based on treatmentType
    const [inactiveStandards, setInactiveStandards] = useState<string[]>(() => {
        return treatmentType ? SettingsManager.getInactiveChips(treatmentType) : [];
    });

    // Sync inactiveStandards when treatmentType changes
    useEffect(() => {
        if (treatmentType) {
            setInactiveStandards(SettingsManager.getInactiveChips(treatmentType));
        }
    }, [treatmentType]);

    // Derive activeStandards from availableChips minus inactiveStandards
    const activeStandards = useMemo(() => {
        return availableChips
            .map(chip => chip.id)
            .filter(chipId => !inactiveStandards.includes(chipId));
    }, [availableChips, inactiveStandards]);

    // QuickView chips: only chips with visibility 'visible' in Settings
    const quickViewChips = useMemo(() => {
        const chipVisibility = SettingsManager.getAllChipVisibility(treatmentType);
        return availableChips.filter((chip: any) => {
            const visibility = chipVisibility[chip.id];
            return visibility === 'visible';
        });
    }, [availableChips, treatmentType]);

    const [manualMaterial, setManualMaterial] = useState(saved.manualMaterial || '');
    const [showBillingCodes, setShowBillingCodes] = useState(saved.showBillingCodes !== false);
    const [includeRisks, setIncludeRisks] = useState(saved.includeRisks === true);
    const [debugMode, setDebugMode] = useState(saved.debugMode === true);

    // --- Audio / Whisper instances ---
    const [audioRecorder] = useState(() => new AudioRecorder());
    const [whisperService] = useState(() => new WhisperService(import.meta.env.VITE_OPENAI_API_KEY));
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [extracting, setExtracting] = useState(false);

    // --- Extraction / Suggestions / Preview ---
    const [dictationExtracted, setDictationExtracted] = useState({});
    const [smartSuggestions, setSmartSuggestions] = useState([]);
    const [acceptedSuggestions, setAcceptedSuggestions] = useState([]);
    const [previewResult, setPreviewResult] = useState('');
    const [loading, setLoading] = useState(false);

    // --- Confirmation Cards State ---
    const [userConfirmations, setUserConfirmations] = useState<Map<string, any>>(new Map());


    // --- persist session (excluding chip toggles, which use SettingsManager) ---
    useEffect(() => {
        const session = {
            dictation,
            insuranceType,
            manualMaterial,
            showBillingCodes,
            includeRisks,
            debugMode,
            treatmentType,
            selectedTemplateId,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }, [
        dictation,
        insuranceType,
        manualMaterial,
        showBillingCodes,
        includeRisks,
        debugMode,
        treatmentType,
        selectedTemplateId,
    ]);

    // --- Derived caseState (truth) ---
    const caseState = useMemo(() => {
        return resolveCaseState({
            template: activeTemplate,
            dictationExtracted,
            activeStandards,
            inactiveStandards,
            manualMaterial,
            insuranceType,
            rawDictation: dictation,
            acceptedSuggestions,
            smartSuggestions: [],
        });
    }, [
        activeTemplate,
        dictationExtracted,
        dictation,
        activeStandards,
        inactiveStandards,
        manualMaterial,
        insuranceType,
        acceptedSuggestions,
    ]);

    const validation = useMemo(() => {
        return validateData(activeTemplate, caseState.data);
    }, [activeTemplate, caseState]);

    // --- Behaviors ---
    const handleToggleStandard = (chipId: string) => {
        if (!treatmentType) return;

        // Toggle in SettingsManager (persistent)
        SettingsManager.toggleChip(treatmentType, chipId);

        // Update local state to trigger re-render
        setInactiveStandards(SettingsManager.getInactiveChips(treatmentType));
    };

    // Handle confirmation of uncertain findings
    const handleConfirmation = (itemId: string, option: { id: string; chipId?: string; value?: any }) => {
        // Store the confirmation
        setUserConfirmations(prev => {
            const next = new Map(prev);
            next.set(itemId, option);
            return next;
        });

        // If option has a chipId, activate it (user override)
        if (option.chipId) {
            // Find mutually exclusive chips and deactivate them
            const treatment = getTreatment(treatmentType);
            if (treatment) {
                const chip = treatment.chips.find(c => c.id === option.chipId);
                if (chip?.mutuallyExclusiveWith) {
                    chip.mutuallyExclusiveWith.forEach(exId => {
                        if (!inactiveStandards.includes(exId)) {
                            SettingsManager.toggleChip(treatmentType, exId);
                        }
                    });
                }
            }
            // Ensure the selected chip is active
            if (inactiveStandards.includes(option.chipId)) {
                SettingsManager.toggleChip(treatmentType, option.chipId);
            }
            setInactiveStandards(SettingsManager.getInactiveChips(treatmentType));
        }

        // Handle costs confirmation - save to dictationExtracted
        if (itemId === 'confirm_costs' && option.value) {
            setDictationExtracted(prev => ({
                ...prev,
                costs: option.value
            }));
        }
    };

    const handleStartRecording = async () => {
        await audioRecorder.startRecording();
        setIsRecording(true);
    };

    const handleStopRecording = async () => {
        try {
            if (!activeTemplate) {
                throw new Error('Kein Template für die Vorschau verfügbar.');
            }
            const audioBlob = await audioRecorder.stopRecording();
            setIsRecording(false);
            setIsTranscribing(true);

            const transcribedText = await whisperService.transcribe(audioBlob);
            setDictation(prev => (prev ? `${prev}\n\n${transcribedText}` : transcribedText));
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleExtract = async () => {
        if (!dictation.trim()) return { ok: false, suggestionsCount: 0 };

        setExtracting(true);
        try {
            const { extractDictationV3 } = await import('../extraction/extractDictationV3');
            const { getActiveUpsells } = await import('../behandlungen/_shared/engine');
            const { inferBilling } = await import('../billing/knowledgeBase/logic/billingInference');

            const { extracted, meta } = await extractDictationV3({
                template: activeTemplate,
                rawText: dictation,
                model: 'gpt-4o'
            });

            setDictationExtracted(extracted);
            setAcceptedSuggestions([]);

            // generate suggestions on fresh extracted data
            const tempCaseState = resolveCaseState({
                template: activeTemplate,
                dictationExtracted: extracted,
                activeStandards,
                inactiveStandards,
                manualMaterial,
                insuranceType,
                rawDictation: dictation,
                acceptedSuggestions: [],
                smartSuggestions: [],
            });

            // Get treatment from new engine
            const treatment = getTreatment(treatmentType);
            if (!treatment) {
                console.warn(`[Sonia] No treatment definition for suggestions: ${treatmentType}`);
                setSmartSuggestions([]);
                return { ok: true, suggestionsCount: 0 };
            }

            // Get chip visibility for filtering upsells
            const chipVisibility = SettingsManager.getAllChipVisibility(treatmentType);

            let treatmentUpsells: any[] = [];
            if (treatment) {
                // Pass visibility to filter out locked_on/hidden/active visible chips
                const upsells = getActiveUpsells(treatment, extracted, chipVisibility, inactiveStandards);
                treatmentUpsells = upsells.map(u => ({
                    id: u.id,
                    label: u.label,
                    description: u.description,
                    reasoning: u.reasoning,
                    billingCode: u.billingRefs?.GKV || u.billingRefs?.PKV || '',
                    textSnippet: u.textSnippet,
                    relatedChipId: u.relatedChipId,
                    priority: 5,
                    source: 'treatment_engine'
                }));
            }

            // ═══════════════════════════════════════════════════════════
            // NEW: Billing Inference Integration
            // ═══════════════════════════════════════════════════════════
            let billingSuggestions: any[] = [];
            try {
                const billingResult = inferBilling(
                    {
                        tooth: extracted.tooth,
                        surfaces: extracted.surfaces,
                        diagnosis: extracted.diagnosis,
                        material: extracted.material || manualMaterial,
                        stiftart: extracted.stiftart,
                        nachEndo: extracted.nachEndo,
                        pfeiler: extracted.pfeiler,
                        fehlend: extracted.fehlend,
                        versorgungsart: treatmentType === 'filling' || treatmentType === 'fuellung' ? 'fuellung' :
                            treatmentType === 'krone' ? 'krone' :
                                treatmentType === 'bruecke' ? 'bruecke' : undefined
                    },
                    insuranceType as 'GKV' | 'PKV',
                    'ohne'  // TODO: Get bonus status from patient data
                );

                // Convert billing suggestions to unified format
                billingSuggestions = billingResult.suggestions.map((s, idx) => ({
                    id: `billing_${s.id || idx}`,
                    label: s.label,
                    description: s.description,
                    billingCode: s.code || '',
                    betrag: s.betrag,
                    priority: s.priority === 'hoch' ? 8 : s.priority === 'mittel' ? 5 : 3,
                    textSnippet: s.textSnippet,
                    autoAccept: s.autoAccept,
                    source: 'billing_inference',
                    type: s.type  // festzuschuss, bema, goz, warnung, optimierung
                }));

                // Log billing result for debugging
                if (billingResult.festzuschuss) {
                    console.log(`[Sonia Billing] Festzuschuss: ${billingResult.festzuschuss.gesamtbetrag}€`);
                }
            } catch (billingError) {
                console.warn('[Sonia] Billing inference failed:', billingError);
                // Don't block on billing errors - continue with other suggestions
            }

            // Process upsells (already filtered by getActiveUpsells)
            const seenIds = new Set<string>();

            // Combine treatment upsells + billing suggestions
            const allSuggestions = [...treatmentUpsells, ...billingSuggestions];

            // Dedupe by ID
            const deduped = allSuggestions.filter(s => {
                if (seenIds.has(s.id)) return false;
                seenIds.add(s.id);
                return true;
            });

            // Sort by priority (higher first)
            deduped.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            const normalized = deduped.map(normalizeSuggestion);
            setSmartSuggestions(normalized);

            return { ok: true, suggestionsCount: normalized.length };

        } catch (e) {
            console.error('Extract failed:', e);
            toast.error('Extraktion fehlgeschlagen: ' + e.message);
            return { ok: false, suggestionsCount: 0 };
        } finally {
            setExtracting(false);
        }
    };

    const toggleSuggestion = (id: string) => {
        const isAccepting = !acceptedSuggestions.includes(id);

        // Record click for learning (only when accepting)
        if (isAccepting && treatmentType) {
            const result = SettingsManager.recordChipClick(treatmentType, id);
            if (result.promoted) {
                toast.success(`"${id}" wird jetzt automatisch aktiviert!`, {
                    icon: '🧠',
                    duration: 3000
                });
            }
        }

        setAcceptedSuggestions(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const handleAcceptAllSuggestions = () => {
        const ids = smartSuggestions.filter(s => s.status !== 'blocked').map(s => s.id);
        setAcceptedSuggestions(ids);
    };

    const handlePreview = async () => {
        setLoading(true);
        try {
            // ========================================
            // NEW TREATMENT ENGINE INTEGRATION
            // ========================================

            // 1. Get treatment definition
            const treatment = getTreatment(treatmentType);
            if (!treatment) {
                // Fallback to old renderer if no treatment definition
                const { renderTemplateV3 } = await import('../render/renderTemplateV3');
                const patchedData = { ...caseState.data };
                const validation = validateData(activeTemplate, patchedData);
                const rendered = renderTemplateV3({
                    template: activeTemplate,
                    caseState: patchedData,
                    validation,
                    acceptedSuggestions: [],
                    injectedText: [],
                    dictationRaw: dictation,
                    dictationExtras: dictationExtracted.dictationExtras || []
                });
                setPreviewResult(rendered.fullText);
                return;
            }

            // 2. Import anesthesia inference
            const { resolveAnesthesiaFromDictation } = await import('../behandlungen/_shared/anesthesiaInference');
            const { resolveChipStates, getActiveChipIds, generateFinalDocumentation } = await import('../behandlungen/_shared/engine');

            // 3. Extract data from current case state
            const extractedData = {
                tooth: dictationExtracted.tooth || caseState.data?.tooth,
                surfaces: dictationExtracted.surfaces || caseState.data?.surfaces || [],
                diagnosis: dictationExtracted.diagnosis || caseState.data?.diagnosis,
                material: dictationExtracted.material || manualMaterial || caseState.data?.material,
                shade: dictationExtracted.shade || caseState.data?.shade,
                costs: dictationExtracted.costs || dictationExtracted.kosten,  // Kosten für Kostenaufklärung
            };

            // 4. Determine anesthesia chip based on tooth + dictation
            const anesthesiaResult = resolveAnesthesiaFromDictation(dictation, extractedData.tooth);

            // 5. Build list of chips EXPLICITLY detected in dictation
            // NOTE: Do NOT start with activeStandards - that causes hallucination!
            // Defaults and settings are handled by resolveChipStates() separately.
            const extractedChips: string[] = [];
            const lowerDictation = dictation.toLowerCase();

            // Add anesthesia chip only if LA was mentioned
            if (lowerDictation.includes('anästh') || lowerDictation.includes('betäub') ||
                lowerDictation.includes('la ') || lowerDictation.includes('infiltration') ||
                lowerDictation.includes('leitung')) {
                extractedChips.push(anesthesiaResult.chipId);
            }

            // Kofferdam / Trockenlegung - mutually exclusive
            if (lowerDictation.includes('kofferdam') || lowerDictation.includes('absolut')) {
                extractedChips.push('kofferdam');
            } else if (lowerDictation.includes('relativ') || lowerDictation.includes('watteroll')) {
                extractedChips.push('rel_trocken');
            }

            // Exkavation
            if (lowerDictation.includes('exkav') || lowerDictation.includes('sondenhart')) {
                extractedChips.push('exkavation');
            }

            // Cp/P - mutually exclusive, only if explicitly mentioned
            if (lowerDictation.includes('calxyl') || lowerDictation.includes('calcium') ||
                (lowerDictation.includes('cp') && !lowerDictation.includes('cp nicht'))) {
                extractedChips.push('cp');
            } else if (lowerDictation.includes('direkte überkapp') || lowerDictation.includes('mta') ||
                lowerDictation.includes('pulpa')) {
                extractedChips.push('p');
            }

            // Matrize - only if mentioned
            if (lowerDictation.includes('matri') || lowerDictation.includes('keil') ||
                lowerDictation.includes('teilmatri')) {
                extractedChips.push('matrize');
            }

            // Schichttechnik / Adhäsiv - only if mentioned
            if (lowerDictation.includes('schicht') || lowerDictation.includes('bulk')) {
                extractedChips.push('schicht');
            }
            if (lowerDictation.includes('ätz') || lowerDictation.includes('adhäs') || lowerDictation.includes('bond')) {
                extractedChips.push('adhesive');
            }

            // Fluoridierung - only if mentioned
            if (lowerDictation.includes('fluor')) {
                extractedChips.push('fluoridierung');
            }

            // Rö-Kontrolle - only if mentioned
            if (lowerDictation.includes('rö') || lowerDictation.includes('röntgen') || lowerDictation.includes('kontrolle')) {
                extractedChips.push('ro_kontrolle');
            }

            // Befunde - nur wenn explizit erwähnt
            if (lowerDictation.includes('vital') || lowerDictation.includes('vipr +') || lowerDictation.includes('vipr+')) {
                extractedChips.push('vipr_pos');
            } else if (lowerDictation.includes('devital') || lowerDictation.includes('vipr -') || lowerDictation.includes('vipr-')) {
                extractedChips.push('vipr_neg');
            }

            if (lowerDictation.includes('perk -') || lowerDictation.includes('perk-') || lowerDictation.includes('perkussion negativ')) {
                extractedChips.push('perk_neg');
            } else if (lowerDictation.includes('perk +') || lowerDictation.includes('perk+')) {
                extractedChips.push('perk_pos');
            }

            // 6. Build user overrides from inactiveStandards AND detect active overrides
            const userOverrides = new Map<string, boolean>();

            // Deactivated chips (user clicked to turn off)
            for (const chipId of inactiveStandards) {
                userOverrides.set(chipId, false);  // User has deactivated this
            }

            // Activated chips: chips without defaultActive that are NOT in inactiveStandards
            // These are chips the user explicitly activated
            for (const chip of treatment.chips) {
                const visibility = SettingsManager.getChipVisibility(treatmentType, chip.id);
                // Only consider visible chips
                if (visibility !== 'visible') continue;

                // If chip doesn't have defaultActive but is NOT in inactiveStandards,
                // then user has explicitly activated it
                if (!chip.defaultActive && !inactiveStandards.includes(chip.id)) {
                    userOverrides.set(chip.id, true);  // User has activated this
                }
            }

            // 7. Get chip visibility settings
            const chipVisibility = SettingsManager.getAllChipVisibility(treatmentType);

            // 8. Resolve chip states with priority: user > dictation > settings > default
            const chipStates = resolveChipStates(treatment, extractedChips, userOverrides, chipVisibility);
            const activeChipIds = getActiveChipIds(chipStates);

            // 8. Generate final documentation using new engine
            const doc = generateFinalDocumentation(
                treatment,
                insuranceType,
                activeChipIds,
                extractedData,
                acceptedSuggestions,  // Passed as accepted upsell IDs
                'mittel'  // TODO: Make configurable
            );

            // 9. Format output for display - NEW IMPROVED STRUCTURE
            const surfacesStr = (extractedData.surfaces || []).map((s: string) => s.toUpperCase()).join('/');
            const surfaceCount = extractedData.surfaces?.length || 0;
            const surfaceLabel = surfaceCount === 1 ? '1-flächig' : surfaceCount === 2 ? '2-flächig' : surfaceCount >= 3 ? '3-flächig' : '';

            // Derive diagnosis from context
            let diagnose = extractedData.diagnosis || 'Caries';
            const isDeep = activeChipIds.includes('cp') || activeChipIds.includes('unterfuellung') || diagnose.toLowerCase().includes('profunda');
            const hasPulpExposure = activeChipIds.includes('p');

            if (isDeep && !hasPulpExposure) {
                diagnose = `tiefe Dentinkaries („Caries profunda"), pulpanah (keine sichtbare Pulpaeröffnung)`;
            } else if (hasPulpExposure) {
                diagnose = `tiefe Dentinkaries mit Pulpaeröffnung, direkte Überkappung (P)`;
            }

            // Build ÜBERSICHT/BEFUND
            const output: string[] = [
                '=== ÜBERSICHT / BEFUND ===',
                `Zahn: ${extractedData.tooth || '?'}`,
                `Flächen/Kavität: ${surfacesStr || '?'} (${surfaceLabel}, Seitenzahn)`,
                `Diagnose: ${diagnose}`,
            ];

            // Befund only if there are befund chips active
            if (doc.uebersicht.befund) {
                output.push(`Befund: ${doc.uebersicht.befund}`);
            }
            output.push('');

            // Build LEISTUNGEN - only billing-relevant items
            // Filter active chips to those with billingRefs
            const billingRelevantLeistungen: string[] = [];
            for (const chipId of activeChipIds) {
                const chip = treatment.chips.find(c => c.id === chipId);
                if (!chip) continue;

                // Only include if chip has billing refs for current insurance type
                const hasBilling = chip.billingRefs && (
                    (insuranceType === 'GKV' && chip.billingRefs.GKV) ||
                    (insuranceType === 'PKV' && chip.billingRefs.PKV) ||
                    chip.billingRefs.MKV
                );

                if (hasBilling && chip.textLine) {
                    billingRelevantLeistungen.push(chip.textLine);
                }
            }

            if (billingRelevantLeistungen.length > 0) {
                output.push('=== LEISTUNGEN (abrechnungsrelevant) ===');
                billingRelevantLeistungen.forEach(l => output.push(`- ${l}`));
                output.push('');
            }

            // Build ABRECHNUNG with proper labels
            const insuranceLabel = insuranceType === 'GKV' ? 'GKV / BEMA' : 'PKV / GOZ';
            output.push(`=== ABRECHNUNG (${insuranceLabel}) ===`);
            doc.uebersicht.codes.forEach(code => {
                // Add descriptive labels for common codes
                let label = '';
                if (code.includes('13d')) label = '(plastische Füllung, 4+ flächig)';
                else if (code.includes('13c')) label = '(plastische Füllung, 3-flächig)';
                else if (code.includes('13b')) label = '(plastische Füllung, 2-flächig)';
                else if (code.includes('13a') || code.includes('13 ') || code === 'BEMA 13') label = '(plastische Füllung, 1-flächig)';
                else if (code.includes('41')) label = '(Leitungsanästhesie intraoral)';
                else if (code.includes('40')) label = '(Infiltrationsanästhesie)';
                else if (code.includes('12')) label = '(bMF – Spanngummi/Blutstillung)';
                else if (code.includes('Ä925') || code.includes('925')) label = '(Röntgenaufnahme)';
                else if (code.includes('IP4')) label = '(Fluoridierung)';
                else if (code.includes('25') && !code.includes('925')) label = '(Cp – indirekte Überkappung)';
                else if (code.includes('26')) label = '(P – direkte Überkappung)';
                output.push(`- ${code}  ${label}`);
            });
            output.push('');

            // BEHANDLUNGSABLAUF
            output.push('=== BEHANDLUNGSABLAUF ===');
            output.push(doc.fliesstext);

            // MEHRKOSTEN - only if costs present and GKV
            const costs = extractedData.costs || extractedData.kosten;
            if (costs && insuranceType === 'GKV') {
                output.push('');
                output.push('=== MEHRKOSTEN (§ 28 Abs. 2 SGB V) ===');
                output.push('Mehrkostenvereinbarung vor Behandlungsbeginn schriftlich geschlossen; Patient über Sachleistung/Alternativen/Kosten aufgeklärt.');

                // Determine GOZ equivalent
                let gozCode = 'GOZ 2100';
                if (surfaceCount === 1) gozCode = 'GOZ 2080';
                else if (surfaceCount === 2) gozCode = 'GOZ 2100';
                else if (surfaceCount >= 3) gozCode = 'GOZ 2120';

                const bemaCode = surfaceCount === 1 ? 'BEMA 13a' : surfaceCount === 2 ? 'BEMA 13b' : 'BEMA 13c';
                output.push(`Privatanteil: ${gozCode} (Kompositrestauration in Adhäsivtechnik) – abzüglich Kassenanteil (${bemaCode}) = Mehrkosten ${costs} €`);
            }

            // Add zusatzinfos if present
            if (doc.zusatzinfos && doc.zusatzinfos.length > 0) {
                output.push('', '=== HINWEISE ===');
                doc.zusatzinfos.forEach(info => output.push(`- ${info}`));
            }

            setPreviewResult(output.join('\n'));

        } catch (e) {
            console.error(e);
            setPreviewResult('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const resetSession = () => {
        localStorage.removeItem(STORAGE_KEY);
        setDictation('');
        setDictationExtracted({});
        setSmartSuggestions([]);
        setAcceptedSuggestions([]);
        setPreviewResult('');
        setLoading(false);
        setExtracting(false);
        setIsRecording(false);
        setIsTranscribing(false);
        setTreatmentType('');
        setSelectedTemplateId('');
    };

    return {
        // templates
        templates: getTemplatesForTreatment(treatmentType), // Only show relevant templates
        selectedTemplateId,
        setSelectedTemplateId,

        // dictation
        dictation,
        setDictation,

        // audio/extract
        isRecording,
        isTranscribing,
        extracting,
        handleStartRecording,
        handleStopRecording,
        handleExtract,

        // config
        availableChips,
        quickViewChips,  // Only the 5 most important chips for quick toggle
        insuranceType,
        setInsuranceType,
        activeStandards,
        inactiveStandards,
        handleToggleStandard,
        manualMaterial,
        setManualMaterial,
        showBillingCodes,
        setShowBillingCodes,
        includeRisks,
        setIncludeRisks,
        debugMode,
        setDebugMode,
        treatmentType,
        setTreatmentType: handleSetTreatmentType,
        enabledTreatmentIds: SettingsManager.getEnabledTreatmentTypes(),

        // suggestions
        smartSuggestions,
        acceptedSuggestions,
        toggleSuggestion,
        handleAcceptAllSuggestions,

        // validation / preview
        validation,
        loading,
        previewResult,
        handlePreview,

        // confirmations
        userConfirmations,
        handleConfirmation,

        // reset
        resetSession,
    };
}
