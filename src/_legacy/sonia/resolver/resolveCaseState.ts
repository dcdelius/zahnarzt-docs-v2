import type { CaseState, Conflict, Source } from "../types";
import { hasExplicitNegation } from "./negation";
import { applyStandards } from "../standards/applyStandards";

// Helper to flatten keys for source map
function flattenKeys(obj: any, prefix = ''): Record<string, any> {
    let result: Record<string, any> = {};
    for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenKeys(value, newKey));
        } else {
            result[newKey] = value;
        }
    }
    return result;
}

// Helper to set value at path
function setPath(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

// Helper to get value at path
function getPath(obj: any, path: string) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
        if (current === undefined || current === null) return undefined;
        current = current[parts[i]];
    }
    return current;
}

export function resolveCaseState({
    template,
    dictationExtracted = {},
    activeStandards = [],
    inactiveStandards = [],
    manualMaterial,
    insuranceType = "GKV",
    rawDictation = "", // Added rawDictation support
    acceptedSuggestions = [],
    smartSuggestions = [],
    patches = [] // Added patches support
}: any): CaseState {
    const data: Record<string, any> = {};
    const sources: Record<string, Source> = {};
    const conflicts: Conflict[] = [];

    // Helper to merge and track sources
    const mergeData = (newData: any, sourceName: Source) => {
        const flatNew = flattenKeys(newData);
        for (const [path, value] of Object.entries(flatNew)) {
            // Check for parent conflicts (primitive overwrite)
            const parts = path.split('.');
            for (let i = 1; i <= parts.length; i++) {
                const subPath = parts.slice(0, i).join('.');
                const oldSource = sources[subPath];
                const oldValue = getPath(data, subPath);

                if (oldSource && oldSource !== sourceName) {
                    if (i < parts.length) {
                        // Parent path: Check if we are overwriting a primitive
                        if (oldValue !== null && typeof oldValue !== 'object') {
                            conflicts.push({
                                path: subPath,
                                a: { source: oldSource, value: oldValue },
                                b: { source: sourceName, value: "object-overwrite" },
                                resolution: { source: sourceName, value: "overwritten" }
                            });
                        }
                    } else {
                        // Leaf path: Direct value conflict
                        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
                            conflicts.push({
                                path,
                                a: { source: oldSource, value: oldValue },
                                b: { source: sourceName, value },
                                resolution: { source: sourceName, value }
                            });
                        }
                    }
                }
            }

            // Set value
            setPath(data, path, value);
            sources[path] = sourceName;
        }
    };

    // 0. Raw Dictation
    if (rawDictation) {
        data._rawDictation = rawDictation;
    } else if (dictationExtracted?._rawDictation) {
        data._rawDictation = dictationExtracted._rawDictation;
    }

    // 1. Defaults (from Template)
    if (template?.fields) {
        const defaults: any = {};
        template.fields.forEach((f: any) => {
            if (f.defaultValue !== undefined) {
                defaults[f.id] = f.defaultValue;
            }
        });
        mergeData(defaults, "default");
    }

    // 2. Chips (Standards)
    const active = activeStandards.filter((s: string) => !inactiveStandards.includes(s));

    // Use the new deterministic Chip Applicator
    const standardsResult = applyStandards({
        activeStandards: active,
        treatmentType: template?.treatmentType || 'filling', // Default to filling if unknown
        insuranceType: insuranceType
    });

    // Merge Data Patches
    if (standardsResult.dataPatches) {
        mergeData(standardsResult.dataPatches, "chip");
    }

    // Store Billing Items in Data (special field) so they persist
    // The renderer or billing engine can pick them up later
    if (standardsResult.billingItems && standardsResult.billingItems.length > 0) {
        // We merge them as a special object to avoid conflicts with normal fields
        // Or better: we append them to a list?
        // For now, let's put them in _standardBillingItems
        mergeData({ _standardBillingItems: standardsResult.billingItems }, "chip");
    }

    // 3. Dictation (Extracted Data)
    if (dictationExtracted) {
        // Remove _rawDictation from extracted to avoid merging it as 'dictation' source (it's meta)
        const { _rawDictation, ...extracted } = dictationExtracted;
        mergeData(extracted, "dictation");
    }

    // 4. Manual Overrides
    if (manualMaterial?.trim()) {
        const key = "material";
        // Check if material is an object in data
        const currentMaterial = data[key];

        let overrideData: any = {};
        if (currentMaterial && typeof currentMaterial === 'object' && !Array.isArray(currentMaterial)) {
            // If it's an object, override 'primary' property (heuristic for test)
            overrideData = { material: { ...currentMaterial, primary: manualMaterial } };
        } else {
            // Otherwise just override the field
            overrideData = { material: manualMaterial };
        }

        mergeData(overrideData, "manual");
    }

    // 5. Smart Suggestions (Accepted)
    if (acceptedSuggestions && acceptedSuggestions.length > 0 && smartSuggestions && smartSuggestions.length > 0) {
        const injectedTexts: string[] = [];

        acceptedSuggestions.forEach((id: string) => {
            const suggestion = smartSuggestions.find((s: any) => s.id === id);
            if (suggestion) {
                // 1. Apply the structured data update (e.g. set field "anesthesia" to "ILA")
                if (suggestion.fieldId && suggestion.value) {
                    const suggestionData: any = {};
                    setPath(suggestionData, suggestion.fieldId, suggestion.value);
                    mergeData(suggestionData, "suggestion");
                }

                // 2. Collect the text snippet (e.g. "Lokalanästhesie mittels Infiltration...")
                if (suggestion.textSnippet) {
                    injectedTexts.push(suggestion.textSnippet);
                }
            }
        });

        // Store injected texts in a special meta-field in data
        if (injectedTexts.length > 0) {
            mergeData({ _injectedText: injectedTexts }, "suggestion");
        }
    }

    // 6. Patches (Explicit Overrides)
    if (patches && patches.length > 0) {
        patches.forEach((patch: any) => {
            if (patch.set) {
                mergeData(patch.set, patch.source || 'patch');
            }
        });
    }

    return {
        data,
        sources,
        conflicts,
        meta: {
            insuranceType,
            templateId: template?.id || "unknown",
            createdAt: new Date().toISOString()
        },
    };
}
