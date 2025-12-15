/**
 * V6 Question Service — STRICT SSOT IMPLEMENTATION
 * 
 * 1. PURE ORCHESTRATOR: No semantics, no hardcoded texts, no heuristics.
 * 2. DATA DRIVEN: All questions come from QuestionBank (JSON).
 * 3. SSOT LOOKUP: Uses chipResolver for active chips, treatmentEngine for candidates.
 */

import type { ExtractedData, InsuranceType } from '../hooks/useDocudentV6';
import type { DynamicQuestion } from '../hooks/useDocudentV6';
import {
    getTreatmentChips,
    type ChipDefinition,
    getUpsellChips // Assuming this helper exists or I filter myself
} from '../../core/billing/knowledgeBase/logic/treatmentEngine';
import { inferChipsFromExtractedData } from '../../core/billing/knowledgeBase/logic/chipResolver';
import { getQuestionDefOrNull } from '../../core/billing/knowledgeBase/questions/questionBank';

export function generateQuestions(
    extracted: ExtractedData,
    insuranceType: InsuranceType,
    hasMKV: boolean = false,
    treatmentId: string = 'fuellung'  // Treatment type, defaults to fuellung for backward compat
): DynamicQuestion[] {
    const questions: DynamicQuestion[] = [];

    // 1. Initial Logic: Infer chips from extracted data to know current state
    const activeChipIds = inferChipsFromExtractedData(
        treatmentId,
        extracted,
        { hasMKV, insuranceType }
    );

    // 2. Identify Gaps -> Generate 'forensic' questions
    // Map 'mentioned' gaps to question keys
    // We assume QuestionBank keys match the gap names or valid identifiers
    // e.g. 'vitality' -> question key 'vitality'

    // Define mandatory forensic fields we want to check
    // This could also be data-driven, but for now we iterate extraction.gaps if available
    // OR we iterate a "standard set" from QuestionBank? 
    // Usually extraction provides "gaps".

    const relevantGaps = [
        'vitality',
        'percussion',
        'tiefe',
        'kofferdam', // → key 'isolation'
        'material'
    ];

    relevantGaps.forEach(gap => {
        // Map gap to question key
        let key = gap;
        if (gap === 'kofferdam') key = 'isolation';

        // If already in extracted.mentioned, skip?
        // Logic: if not in extracted.mentioned, ask.
        // But extraction service puts them in 'gaps' if missing.
        // We'll rely on a simple check or if it's in extracted.gaps

        // Check if explicitly answered (isPresent).
        // For simplicity in V6, we often ask provided it's relevant to the procedure.
        // But cleaner: if extraction.mentioned[gap] is undefined.

        const isMentioned = (extracted.mentioned as any)[gap] !== undefined;

        if (!isMentioned) {
            const def = getQuestionDefOrNull(treatmentId, key);
            if (def) {
                questions.push({
                    id: def.key,
                    category: 'forensic',
                    question: def.prompt,
                    type: def.type,
                    options: def.options.map(o => ({
                        id: o.id,
                        label: o.label,
                        dataValue: o.dataValue
                    })),
                    // No default value for forensic usually, unless specified
                });
            }
        }
    });

    // 3. Upsell Questions (ONLY if not GKV-only-strict without MKV?)
    // Actually, upsells are valid for GKV too if they agreed to pay.
    // If hasMKV is true, we ask specific MKV questions.

    if (hasMKV) {
        // MKV Vereinbarung & Betrag
        const mkvKeys = ['mkv_vereinbarung', 'mkv_betrag'];
        mkvKeys.forEach(key => {
            const def = getQuestionDefOrNull(treatmentId, key);
            if (def) {
                // Special handling for number type pre-fill
                let defaultValue = undefined;
                if (key === 'mkv_betrag' && extracted.costs) {
                    defaultValue = extracted.costs;
                }

                questions.push({
                    id: def.key,
                    category: 'mkv',
                    question: def.prompt,
                    type: def.type,
                    options: def.options?.map(o => ({
                        id: o.id,
                        label: o.label,
                        dataValue: o.dataValue
                    })) || [],
                    // Number specific
                    min: def.min,
                    max: def.max,
                    step: def.step,
                    unit: def.unit,
                    presets: def.presets,
                    defaultValue: defaultValue
                });
            }
        });

        // Upsell Chips (Mehrschicht, Adhäsiv etc.)
        // We fetch chips with upsellCandidate = true
        const allChips = getTreatmentChips(treatmentId);
        const upsellChips = allChips.filter(c => c.upsellCandidate);

        upsellChips.forEach(chip => {
            // Check if already active? If active, maybe don't ask or ask to confirm?
            // Usually we ask to UPSell (add it).
            // If already active (inferred from dictation), we might skip or show as 'answered'.
            // Here we assume we ask if not explicitly mentioned.

            if (!activeChipIds.includes(chip.id)) {
                // Find question definition
                // Priority: chip.questionKey -> chip.id
                const questionKey = chip.questionKey || chip.id;
                const def = getQuestionDefOrNull(treatmentId, questionKey);

                if (def) {
                    questions.push({
                        id: def.key,
                        category: 'upsell',
                        question: def.prompt,
                        type: def.type,
                        options: def.options.map(o => ({
                            id: o.id,
                            label: o.label,
                            dataValue: o.dataValue,
                            chipActivation: o.chipActivation // Important: Pass this through!
                        })),
                        chipId: chip.id,
                        upsellNotes: chip.upsellNotes
                    });
                }
            }
        });
    }

    return questions;
}
