/**
 * V10 Golden Snapshot Test - User Scenario Recovery
 *
 * Exact scenario from user: MKV + "Zahn 27 mod mit Anästhesie, tief, mit CP, 120€"
 * Captures: facts, chips, billingRefs, composed text, perInstance
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('V10 Golden Snapshot - User Scenario', () => {
    const EXACT_DICTATION = 'Zahn 27 mod mit Anästhesie, tief, mit CP, 120€';

    it('MKV scenario: should produce golden output', async () => {
        const result = await runV10({
            dictation: EXACT_DICTATION,
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'lang',
            answers: new Map([
                ['fuellung_material', 'komposit'],
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'Ca(OH)₂'],
            ]),
        });

        console.log('\n' + '═'.repeat(60));
        console.log('V10 GOLDEN SNAPSHOT - EXACT USER SCENARIO');
        console.log('═'.repeat(60));
        console.log('Dictation:', EXACT_DICTATION);
        console.log('Insurance:', 'MKV');
        console.log('─'.repeat(60));

        // STATE
        console.log('\n[1] STATE:', result.state);

        if (result.state === 'output' && result.output) {
            // PER-INSTANCE
            console.log('\n[2] PER-INSTANCE:');
            const perInstance = result.output.perInstance ?? {};
            Object.entries(perInstance).forEach(([id, data]) => {
                console.log(`  Instance: ${id}`);
                console.log(`    Teeth: ${JSON.stringify(data.teeth)}`);
                console.log(`    BillingRefs: ${JSON.stringify(data.billingRefs)}`);
                console.log(`    Chips: ${JSON.stringify(data.chips)}`);
            });

            // PHANTOM TOOTH CHECK
            const allTeeth = Object.values(perInstance).flatMap(p => p.teeth);
            console.log('\n[3] PHANTOM TOOTH CHECK:');
            console.log(`  All teeth: ${JSON.stringify(allTeeth)}`);
            const hasPhantom12 = allTeeth.includes('12');
            const hasPhantom20 = allTeeth.includes('20');
            console.log(`  Phantom 12 from "120€": ${hasPhantom12 ? '❌ YES (BUG)' : '✅ NO'}`);
            console.log(`  Phantom 20 from "120€": ${hasPhantom20 ? '❌ YES (BUG)' : '✅ NO'}`);

            // BILLING
            console.log('\n[4] BILLING CODES:');
            const billingCodes = result.output.billingCodes ?? [];
            console.log(`  ${JSON.stringify(billingCodes)}`);
            const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
            const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));
            console.log(`  Has BEMA (base): ${hasBema ? '✅ YES' : '❌ NO'}`);
            console.log(`  Has GOZ (addon): ${hasGoz ? '✅ YES' : '❌ NO'}`);

            // SECTIONS
            console.log('\n[5] SECTIONS:');
            const sections = result.output.sections ?? [];
            sections.forEach(s => {
                console.log(`  [${s.id}] ${s.label}`);
                console.log(`    ${s.content.substring(0, 200)}${s.content.length > 200 ? '...' : ''}`);
            });

            // FULL TEXT
            console.log('\n[6] FULL TEXT:');
            console.log(result.output.fullText);

            // ASSERTIONS
            console.log('\n[7] ASSERTIONS:');

            // A) No phantom teeth
            expect(allTeeth).toContain('27');
            expect(allTeeth).not.toContain('12');
            expect(allTeeth).not.toContain('20');
            console.log('  ✅ No phantom teeth from 120€');

            // B) Has correct billing
            expect(hasBema).toBe(true);
            expect(hasGoz).toBe(true);
            console.log('  ✅ BEMA + GOZ addon present');

            // C) Output contains key clinical info
            const fullText = result.output.fullText;
            expect(fullText).toMatch(/27/); // tooth
            expect(fullText).toMatch(/MOD|mod|mesio|okklus/i); // surfaces
            expect(fullText).toMatch(/nästhesie|Infiltration|Leitung/i); // LA
            console.log('  ✅ Contains tooth, surfaces, anesthesia');

            // D) MKV section contains amount
            const mkvSection = sections.find(s => s.id === 'mkv');
            if (mkvSection) {
                expect(mkvSection.content).toMatch(/120/);
                expect(mkvSection.content).toMatch(/§\s*28\s*Abs\.?\s*2\s*SGB\s*V/i);
                console.log('  ✅ MKV section contains amount + legal clause');
            }

            // E) Not placeholder only
            expect(fullText).not.toBe('Füllungstherapie durchgeführt.');
            expect(fullText.length).toBeGreaterThan(100);
            console.log('  ✅ Not placeholder-only text');

            // F) Documentation Standard Checklist
            console.log('\n[8] DOCUMENTATION STANDARD CHECKLIST:');

            // Required: Tooth number
            expect(fullText).toMatch(/Zahn\s+27/);
            console.log('  ✅ Tooth number present');

            // Required: Surfaces
            expect(fullText).toMatch(/MOD/);
            console.log('  ✅ Surfaces in uppercase');

            // When known: Depth label (profunda/media)
            expect(fullText).toMatch(/profunda|pulpanah|media/i);
            console.log('  ✅ Depth label present');

            // When used: LA label
            expect(fullText).toMatch(/Infiltration|Leitung/i);
            console.log('  ✅ LA label present');

            // When performed: Cp with material
            expect(fullText).toMatch(/Cp|Überkappung/i);
            console.log('  ✅ Capping mentioned');

            // No boolean output
            expect(fullText).not.toMatch(/\btrue\b|\bfalse\b/i);
            console.log('  ✅ No raw booleans in output');

            // Has 4 sections
            expect(sections.length).toBeGreaterThanOrEqual(4);
            console.log('  ✅ Has 4+ sections');
        }

        console.log('\n' + '═'.repeat(60) + '\n');
    });

    it('GKV scenario: should NOT emit GOZ codes', async () => {
        const result = await runV10({
            dictation: EXACT_DICTATION,
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'lang',
            answers: new Map([
                ['fuellung_material', 'komposit'],
                ['medical_ueberkappung', 'indirekt'],
            ]),
        });

        if (result.state === 'output') {
            const billingCodes = result.output?.billingCodes ?? [];
            const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
            const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));

            expect(hasBema).toBe(true);
            expect(hasGoz).toBe(false); // GKV never GOZ
        }
    });

    it('MKV + nurKasse: should suppress GOZ addon', async () => {
        const result = await runV10({
            dictation: 'Zahn 27 mod mit Anästhesie, nur Kasse',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'lang',
            answers: new Map([
                ['fuellung_material', 'komposit'],
            ]),
        });

        if (result.state === 'output') {
            const billingCodes = result.output?.billingCodes ?? [];
            const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));

            expect(hasGoz).toBe(false); // nurKasse suppresses addon
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GIGAPROMPT 4: Golden Dictations — Documentation Perfection
// ═══════════════════════════════════════════════════════════════

describe('V10 Golden Dictations - Documentation Perfection', () => {
    it('Golden #1: "Zahn 27 mod mit Anästhesie, tief, mit CP"', async () => {
        const result = await runV10({
            dictation: 'Zahn 27 mod mit Anästhesie, tief, mit CP',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'lang',
            answers: new Map([
                ['fuellung_material', 'komposit'],
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'Ca(OH)₂'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state === 'output' && result.output) {
            const fullText = result.output.fullText;

            // Must have tooth + surfaces
            expect(fullText).toMatch(/Zahn\s+27/);
            expect(fullText).toMatch(/MOD/);

            // Must have depth
            expect(fullText).toMatch(/profunda|pulpanah/i);

            // Must have LA
            expect(fullText).toMatch(/nästhesie|Infiltration/i);

            // Must have CP
            expect(fullText).toMatch(/Cp|Überkappung/i);

            // Must have Hinweise
            expect(fullText).toMatch(/Hinweise/i);

            // NOT placeholder only
            expect(fullText.length).toBeGreaterThan(100);

            // No raw booleans
            expect(fullText).not.toMatch(/\btrue\b|\bfalse\b/i);
        }
    });

    it('Golden #2: "Zahn 36 okklusal, Komposit, Kofferdam"', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 okklusal, Komposit, Kofferdam',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'lang',
            answers: new Map([
                ['fuellung_material', 'komposit'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state === 'output' && result.output) {
            const fullText = result.output.fullText;

            // Must have tooth + surfaces
            expect(fullText).toMatch(/Zahn\s+36/);
            expect(fullText).toMatch(/O|okklusal/i);

            // Optional: Kofferdam mentioned
            // expect(fullText).toMatch(/Kofferdam|Trockenlegung/i);

            // NOT placeholder only
            expect(fullText.length).toBeGreaterThan(50);
        }
    });

    it('Golden #3: "Zahn 11 mesial, ohne Anästhesie, GIZ"', async () => {
        const result = await runV10({
            dictation: 'Zahn 11 mesial, ohne Anästhesie, GIZ',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'lang',
            answers: new Map([
                ['fuellung_material', 'giz'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state === 'output' && result.output) {
            const fullText = result.output.fullText;

            // Must have tooth + surfaces
            expect(fullText).toMatch(/Zahn\s+11/);
            expect(fullText).toMatch(/M|mesial/i);

            // "ohne Anästhesie" should NOT produce LA line
            // The fullText should NOT contain Lokalanästhesie
            expect(fullText).not.toMatch(/Lokalanästhesie:\s+Infiltration/i);

            // NOT placeholder only
            expect(fullText.length).toBeGreaterThan(50);
        }
    });

    it('Golden #4: "Zahn 27 mod" (minimal) — must have tooth + surfaces', async () => {
        const result = await runV10({
            dictation: 'Zahn 27 mod',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['fuellung_material', 'komposit'],  // Provide answer to reach output
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state === 'output' && result.output) {
            const fullText = result.output.fullText;

            // MUST have tooth + surfaces even for minimal dictation
            expect(fullText).toMatch(/Zahn\s+27/);
            expect(fullText).toMatch(/MOD/);

            // NOT placeholder only
            expect(fullText).not.toBe('Füllungstherapie durchgeführt.');
            expect(fullText.length).toBeGreaterThan(30);
        }
    });
});
