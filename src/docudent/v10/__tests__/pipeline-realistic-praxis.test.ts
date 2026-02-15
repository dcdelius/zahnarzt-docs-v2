/**
 * DEPRECATED: This test is not a canonical source of truth.
 * Use the scenario runner (scripts/v10/scenarios.v10.fuellung.json) instead.
 *
 * Realistischer Praxis-Test gegen die V10 Pipeline - KORRIGIERT
 * 
 * Testet einen typischen Praxis-Workflow direkt gegen runV10:
 * - Zahn 26 MOD (3flächig) mit Komposit
 * - Zahn 36 okklusal (1flächig) mit Bulk-Fill
 * - GKV mit Mehrkostenvereinbarung
 * 
 * KORREKTUR: Verwendet V10PipelineInput (nicht TreatmentInput)
 * und insuranceType auf Top-Level (nicht in settings)
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../pipeline/runV10';
import type { V10PipelineInput } from '../types';

describe('🦷 Realistischer Praxis-Test (Pipeline) - KORRIGIERT', () => {
    
    it('Doppelte Füllungstherapie: Zahn 26 MOD + Zahn 36', async () => {
        console.log('\n' + '='.repeat(70));
        console.log('🦷 DOCUDENT V10 - REALISTISCHER PRAXIS-TEST (KORRIGIERT)');
        console.log('='.repeat(70));
        
        const diktat = `Patientin hat an Zahn 26 MOD eine tiefe Karies. 
            Füllungstherapie mit Komposit in Mehrschichttechnik, 
            Kofferdam angelegt, Leitungsanästhesie. 
            An Zahn 36 okklusal eine kleine Karies, 
            mit Bulk-Fill in Einfülltechnik ohne Kofferdam, 
            Infiltrationsanästhesie. 
            Mehrkostenvereinbarung fuer Komposit liegt vor.`;
        
        console.log('\n📋 SZENARIO: Doppelte Füllungstherapie');
        console.log('   • Zahn 26: MOD (3-flächig), Komposit, Kofferdam, Leitungsanästhesie');
        console.log('   • Zahn 36: Okklusal (1-flächig), Bulk-Fill, ohne Kofferdam, Infiltrationsanästhesie');
        console.log('   • Versicherung: MKV (GKV mit Mehrkosten)');
        console.log('\n📝 DIKTAT:');
        console.log(diktat);
        console.log('\n' + '-'.repeat(70));
        
        // ═══════════════════════════════════════════════════════════════
        // 1. ERSTER PIPELINE-LAUF
        // WICHTIG: V10PipelineInput verwendet insuranceType auf Top-Level!
        // ═══════════════════════════════════════════════════════════════
        
        console.log('\n⏳ 1. Erster Pipeline-Lauf...');
        
        const input: V10PipelineInput = {
            dictation: diktat,
            treatmentId: 'fuellung',
            insuranceType: 'MKV',  // ← Top-Level, nicht in settings!
            textLength: 'mittel',
        };
        
        const result1 = await runV10(input);
        console.log(`✅ Pipeline Phase: ${result1.state.toUpperCase()}`);
        
        // ═══════════════════════════════════════════════════════════════
        // 2. RÜCKFRAGEN ANALYSIEREN
        // ═══════════════════════════════════════════════════════════════
        
        if (result1.state === 'questions' && result1.questions) {
            console.log('\n📋 RÜCKFRAGEN (Askbacks):\n');
            console.log(`   Anzahl Fragen: ${result1.questions.length}`);
            
            for (let i = 0; i < result1.questions.length; i++) {
                const q = result1.questions[i];
                console.log(`\n   ${i + 1}. ${q.text || q.questionKey || 'Unbekannte Frage'}`);
                console.log(`      ID: ${q.id}`);
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 3. ANTWORTEN SIMULIEREN
        // ═══════════════════════════════════════════════════════════════
        
        console.log('\n⏳ 2. Antworten werden simuliert...');
        
        const answers: Record<string, string> = {};
        
        if (result1.state === 'questions' && result1.questions) {
            for (const q of result1.questions) {
                const questionKey = q.questionKey?.toLowerCase() || '';
                
                if (questionKey.includes('perkussion')) {
                    answers[q.id] = 'perk_neg';
                    console.log(`   → ${q.questionKey}: negativ`);
                }
                else if (questionKey.includes('vitality') || questionKey.includes('sensibilit')) {
                    answers[q.id] = 'vitr_neg';
                    console.log(`   → ${q.questionKey}: negativ`);
                }
                else if (questionKey.includes('ueberkapp')) {
                    answers[q.id] = 'ueberkapp_nein';
                    console.log(`   → ${q.questionKey}: Nein`);
                }
                else if (questionKey.includes('material')) {
                    // Zahn 26 -> Komposit, Zahn 36 -> Bulk
                    if (q.id.includes('26')) {
                        answers[q.id] = 'material_komposit';
                        console.log(`   → ${q.questionKey}: Komposit (Zahn 26)`);
                    } else {
                        answers[q.id] = 'material_bulk';
                        console.log(`   → ${q.questionKey}: Bulk-Fill (Zahn 36)`);
                    }
                }
                else if (questionKey.includes('adhaesiv')) {
                    answers[q.id] = 'adhaesiv_ja';
                    console.log(`   → ${q.questionKey}: Ja`);
                }
                else if (questionKey.includes('isolation') || questionKey.includes('kofferdam')) {
                    // Zahn 26 -> Kofferdam, Zahn 36 -> keine
                    if (q.id.includes('26')) {
                        answers[q.id] = 'kofferdam';
                        console.log(`   → ${q.questionKey}: Kofferdam (Zahn 26)`);
                    } else {
                        answers[q.id] = 'relativ';
                        console.log(`   → ${q.questionKey}: Keine (Zahn 36)`);
                    }
                }
                else if (q.options && q.options.length > 0) {
                    answers[q.id] = q.options[0].value;
                    console.log(`   → ${q.questionKey}: ${q.options[0].label || q.options[0].value} (Default)`);
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 4. ZWEITER PIPELINE-LAUF
        // ═══════════════════════════════════════════════════════════════
        
        console.log('\n⏳ 3. Zweiter Pipeline-Lauf mit Antworten...');
        
        const input2: V10PipelineInput = {
            ...input,
            answers,  // Antworten werden mitgegeben
        };
        
        const result2 = await runV10(input2);
        console.log(`✅ Pipeline Phase: ${result2.state.toUpperCase()}`);
        
        if (result2.state === 'error') {
            console.log('\n❌ FEHLER:', result2.error);
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 5. ERGEBNIS ANALYSIEREN
        // ═══════════════════════════════════════════════════════════════
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 ERGEBNIS-ANALYSE');
        console.log('='.repeat(70));
        
        expect(result2.state).toBe('output');
        
        if (result2.state === 'output' && result2.output) {
            const output = result2.output;
            
            // Text
            console.log('\n📄 GENERIERTER TEXT:\n');
            console.log(output.fullText || output.copyText || '(Kein Text)');
            
            // Billing
            console.log('\n💶 ABRECHNUNGSCODES:\n');
            console.log(`   Codes: ${output.billingRefs?.join(', ') || output.billingCodes?.join(', ') || '(keine)'}`);
            
            // Per-Instance
            if (output.perInstance) {
                console.log(`\n   Instanzen:`);
                for (const [id, instance] of Object.entries(output.perInstance)) {
                    const inst = instance as any;
                    console.log(`\n   ${id}:`);
                    console.log(`      Zahn: ${inst.tooth || 'unbekannt'}`);
                    console.log(`      Codes: ${inst.billingRefs?.join(', ') || inst.billingCodes?.join(', ') || '(keine)'}`);
                }
            }
            
            // ═══════════════════════════════════════════════════════════════
            // 6. VALIDIERUNG
            // ═══════════════════════════════════════════════════════════════
            
            console.log('\n' + '='.repeat(70));
            console.log('✅ VALIDIERUNG');
            console.log('='.repeat(70));
            
            const text = (output.fullText || output.copyText || '').toLowerCase();
            const billingCodes = output.billingRefs || output.billingCodes || [];
            
            const checks = [
                { name: 'Zahn 26 erwähnt', pass: text.includes('26') },
                { name: 'Zahn 36 erwähnt', pass: text.includes('36') },
                { name: 'Komposit erwähnt', pass: text.includes('komposit') },
                { name: 'Bulk erwähnt', pass: text.includes('bulk') },
                { name: 'Kofferdam erwähnt', pass: text.includes('kofferdam') },
                { name: 'Mehrkosten erwähnt', pass: text.includes('mehrkosten') },
                { name: 'BEMA-Codes vorhanden', pass: billingCodes.some((c: string) => c.includes('BEMA')) },
                { name: 'GOZ-Codes vorhanden (MKV!)', pass: billingCodes.some((c: string) => c.includes('GOZ')) },
            ];
            
            let passed = 0;
            for (const check of checks) {
                const icon = check.pass ? '✅' : '❌';
                console.log(`   ${icon} ${check.name}`);
                if (check.pass) passed++;
            }
            
            const successRate = (passed / checks.length) * 100;
            console.log(`\n📋 ERGEBNIS: ${passed}/${checks.length} (${Math.round(successRate)}%)`);
            
            // Zusätzliche MKV-Validierung
            console.log('\n🔍 MKV-SPEZIFISCHE PRÜFUNG:');
            const hasBemaAndGoz = billingCodes.some((c: string) => c.includes('BEMA')) && 
                                  billingCodes.some((c: string) => c.includes('GOZ'));
            console.log(`   ${hasBemaAndGoz ? '✅' : '❌'} BEMA + GOZ kombiniert (MKV Two-Channel)`);
            
            const goz2060 = billingCodes.some((c: string) => c.includes('2060'));
            const goz2100 = billingCodes.some((c: string) => c.includes('2100'));
            console.log(`   ${goz2060 ? '✅' : '❌'} GOZ 2060 (1-flächig) für Zahn 36`);
            console.log(`   ${goz2100 ? '✅' : '❌'} GOZ 2100 (3-flächig) für Zahn 26`);
            
            // Assertions
            expect(passed).toBeGreaterThanOrEqual(6);  // Erwarte deutlich besseres Ergebnis
            expect(hasBemaAndGoz).toBe(true);  // MKV muss BEMA + GOZ haben
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('🏁 TEST ABGESCHLOSSEN');
        console.log('='.repeat(70) + '\n');
    });
});
