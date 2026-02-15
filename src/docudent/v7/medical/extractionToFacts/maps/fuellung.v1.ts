/**
 * Füllung Treatment → Facts Mapping
 *
 * Maps extracted data from Füllung dictations into TreatmentFacts.
 * This is the SINGLE source of truth for Füllung extraction interpretation.
 */

import type { TreatmentFacts, BleedingFact, SensitivityFact } from '../../types';
import type { ExtractedDataLike } from '../index';
import {
    detectCariesDepth,
    detectBleeding,
    detectSensitivity,
    normalizeToken,
} from './shared.v1';

/**
 * Build TreatmentFacts from extracted data for Füllung treatment
 */
export function buildFuellungFacts(
    extracted: ExtractedDataLike,
    instanceScope?: { tooth?: string }
): TreatmentFacts {
    // Collect all text sources for analysis
    const textSources: string[] = [];

    // Add diagnosis if present
    if (extracted.diagnosis) {
        textSources.push(extracted.diagnosis);
    }

    // Add raw dictation if present
    if (extracted.rawDictation) {
        textSources.push(extracted.rawDictation);
    }

    // Add tooth-specific notes if scoped
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
        if (toothData?.depth) {
            textSources.push(toothData.depth);
        }
    }

    // Combine all text for analysis
    const combinedText = textSources.join(' ');

    // ═══════════════════════════════════════════════════════════════
    // CARIES DEPTH DETECTION
    // ═══════════════════════════════════════════════════════════════

    let cariesDepth = detectCariesDepth(combinedText);

    // Also check mentioned.tiefe if present
    if (cariesDepth === 'unknown' && extracted.mentioned?.tiefe) {
        const tiefe = normalizeToken(String(extracted.mentioned.tiefe));
        if (tiefe === 'tief' || tiefe === 'profunda' || tiefe === 'pulpanah') {
            cariesDepth = 'profunda';
        } else if (tiefe === 'normal' || tiefe === 'media') {
            cariesDepth = 'normal';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CAPPING DETECTION (from extraction, not askback)
    // ═══════════════════════════════════════════════════════════════

    let cappingPerformed: 'yes' | 'no' | 'unknown' = 'unknown';

    if (extracted.mentioned?.ueberkappung !== undefined) {
        const val = extracted.mentioned.ueberkappung;
        if (val === true || val === 'ja' || val === 'yes') {
            cappingPerformed = 'yes';
        } else if (val === false || val === 'nein' || val === 'no') {
            cappingPerformed = 'no';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BLEEDING DETECTION
    // ═══════════════════════════════════════════════════════════════

    let bleeding: BleedingFact | undefined;

    // Check mentioned flags first (from stub extractor)
    if (extracted.mentioned?.bleeding === true) {
        bleeding = {
            detected: 'yes',
            heavy: extracted.mentioned?.bleedingHeavy === true,
            hemostasisPerformed: extracted.mentioned?.hemostasis === true ? 'yes' : 'unknown',
        };
    } else {
        // Fall back to text analysis
        const bleedingResult = detectBleeding(combinedText);
        if (bleedingResult.detected) {
            bleeding = {
                detected: 'yes',
                heavy: bleedingResult.heavy,
                hemostasisPerformed: bleedingResult.hemostasisMentioned ? 'yes' : 'unknown',
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SENSITIVITY DETECTION
    // ═══════════════════════════════════════════════════════════════

    let sensitivity: SensitivityFact | undefined;

    // Check mentioned flags first
    if (extracted.mentioned?.sensitivity === true) {
        sensitivity = {
            reported: 'yes',
            level: extracted.mentioned?.sensitivityHigh === true ? 'high' : 'medium',
            desensitizerApplied: extracted.mentioned?.desensitizer === true ? 'yes' : 'unknown',
        };
    } else {
        // Fall back to text analysis
        const sensitivityResult = detectSensitivity(combinedText);
        if (sensitivityResult.detected) {
            sensitivity = {
                reported: 'yes',
                level: sensitivityResult.level,
                desensitizerApplied: sensitivityResult.desensitizerMentioned ? 'yes' : 'unknown',
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // M24: FUELLUNG-SPECIFIC DETECTION
    // ═══════════════════════════════════════════════════════════════

    const normalizedText = normalizeToken(combinedText);

    // LA type detection
    let anesthesiaType: 'leitung' | 'infiltration' | undefined;
    if (normalizedText.includes('leitungsanasthesie') || normalizedText.includes('leitung') ||
        normalizedText.includes('n. alv. inf') || normalizedText.includes('mandibular')) {
        anesthesiaType = 'leitung';
    } else if (normalizedText.includes('infiltrationsanasthesie') || normalizedText.includes('infiltration') ||
        normalizedText.includes('la infiltr')) {
        anesthesiaType = 'infiltration';
    }

    // Surface anesthesia detection
    const surfaceAnesthesia = normalizedText.includes('oberflachenanasthesie') ||
        normalizedText.includes('oberflache') ||
        normalizedText.includes('lidocain spray') ||
        normalizedText.includes('oa vor');

    // Isolation type detection
    let isolation: 'kofferdam' | 'relativ' | 'none' | undefined;

    // Check mentioned flags first
    if (extracted.mentioned?.kofferdam === true || extracted.mentioned?.isolation === 'kofferdam') {
        isolation = 'kofferdam';
    } else if (extracted.mentioned?.isolation === 'relativ') {
        isolation = 'relativ';
    } else if (normalizedText.includes('kofferdam') || normalizedText.includes('cofferdam') ||
        normalizedText.includes('absolute trockenlegung') || normalizedText.includes('rubber dam')) {
        isolation = 'kofferdam';
    } else if (normalizedText.includes('watterollen') || normalizedText.includes('relative trockenlegung')) {
        isolation = 'relativ';
    }

    // Fluoridation detection
    const fluoridation = normalizedText.includes('fluoridierung') ||
        normalizedText.includes('fluoridlack') ||
        normalizedText.includes('fluor') ||
        normalizedText.includes('duraphat');

    // Direct capping (P) detection - pulp exposure
    let cappingType: 'direct' | 'indirect' | undefined;
    if (normalizedText.includes('pulpaeröffnung') || normalizedText.includes('pulpaeroffnung') ||
        normalizedText.includes('direkte uberkappung') || normalizedText.includes('direkte ueberkappung') ||
        normalizedText.includes('punktformige eroffnung')) {
        cappingType = 'direct';
    } else if (cappingPerformed === 'yes') {
        cappingType = 'indirect'; // Default to indirect (Cp) when capping confirmed but type unknown
    }

    // ═══════════════════════════════════════════════════════════════
    // BUILD FACTS
    // ═══════════════════════════════════════════════════════════════

    const facts: TreatmentFacts = {
        treatmentId: 'fuellung',
        cariesDepth,
        capping: {
            performed: cappingPerformed,
            type: cappingType,
        },
        counseling: {
            // Default: pulpitis risk if deep caries
            pulpitisRisk: (cariesDepth === 'profunda' || cariesDepth === 'pulp_near') ? 'yes' : 'unknown',
        },
        // M24: Fuellung-specific facts
        fuellung: {
            anesthesiaType,
            surfaceAnesthesia: surfaceAnesthesia || undefined,
            isolation,
            fluoridation: fluoridation || undefined,
        },
    };

    // Only add bleeding/sensitivity if detected
    if (bleeding) {
        facts.bleeding = bleeding;
    }
    if (sensitivity) {
        facts.sensitivity = sensitivity;
    }

    return facts;
}
