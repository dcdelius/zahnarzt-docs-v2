/**
 * Quick E2E Smoke Test for Extraction Port
 * Run: npx tsx src/docudent/__tests__/manual/extraction-e2e-smoke.ts
 */

import { extractFromDictation } from '../../core/extraction/extractionService';

const DICTATIONS = {
    A: {
        label: 'FÜLLUNG (simple)',
        text: 'Zahn 36 okklusal-distal kariös, tiefe Karies pulpanah. Lokalanästhesie Leitungsanästhesie. Kofferdam. Exkavation, adhäsiv, Komposit mehrschichtig, Finieren und Polieren. Vitalität negativ, Perkussion negativ.'
    },
    B: {
        label: 'ENDO (complete)',
        text: 'Zahn 36, Wurzelkanalbehandlung abgeschlossen. 3 Kanäle. Kofferdam. Längenbestimmung mit EAL. Spülprotokoll NaOCl plus EDTA, Aktivierung ultraschall. Obturation thermoplastisch, Röntgenkontrolle.'
    },
    C: {
        label: 'ENDO (interim)',
        text: 'Zahn 11, Zwischensitzung Endo. Zugang und Aufbereitung, Spülung NaOCl. CaOH2 Einlage, provisorischer Verschluss. Kontrolle in 2 Wochen.'
    }
};

async function runSmoke() {
    console.log('\\n═══════════════════════════════════════════════════════════════');
    console.log('EXTRACTION E2E SMOKE TEST');
    console.log('═══════════════════════════════════════════════════════════════\\n');

    for (const [caseId, dictation] of Object.entries(DICTATIONS)) {
        console.log(`\\n--- Case ${caseId}: ${dictation.label} ---`);

        try {
            const result = await extractFromDictation(dictation.text);

            const summary = {
                case: caseId,
                extractionVersion: result.extractionVersion,
                keys: Object.keys(result).slice(0, 10),
                tooth: result.tooth,
                diagnosis: result.diagnosis,
                surfaces: result.surfaces,
                mentionedKeys: Object.keys(result.mentioned || {}),
                gaps: result.gaps?.length || 0,
                notes: result.extractionVersion === 'v6' ? 'OK' : 'VERSION MISMATCH!'
            };

            console.log(JSON.stringify(summary));
        } catch (error) {
            console.log(JSON.stringify({
                case: caseId,
                error: String(error),
                notes: 'EXCEPTION!'
            }));
        }
    }

    console.log('\\n═══════════════════════════════════════════════════════════════');
    console.log('SMOKE TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\\n');
}

runSmoke().catch(console.error);
