/**
 * RAG Module Tests
 * 
 * Tests für searchableTextGenerator und regelLinker
 */

import { describe, it, expect } from 'vitest';
import {
    normalizeText,
    extractKeywords,
    findSynonyme,
    generateSearchableText,
    fuzzySearch,
    processCodeCatalog,
    levenshteinDistance,
    BillingCode
} from '../sonia/billing/knowledgeBase/logic/searchableTextGenerator';
import {
    buildRegelIndex,
    getRegelnFuerCode,
    pruefeKonflikte,
    generiereEmpfehlungen,
    BillingRule
} from '../sonia/billing/knowledgeBase/logic/regelLinker';

describe('Searchable Text Generator', () => {

    describe('normalizeText', () => {
        it('sollte Umlaute ersetzen', () => {
            expect(normalizeText('Füllüng')).toBe('fuellueng');  // ü → ue
            expect(normalizeText('Anästhesie')).toBe('anaesthesie');
            expect(normalizeText('Größe')).toBe('groesse');
        });


        it('sollte Sonderzeichen entfernen', () => {
            expect(normalizeText('BEMA-13a')).toBe('bema 13a');
            expect(normalizeText('GOZ (2197)')).toBe('goz 2197');
        });
    });

    describe('extractKeywords', () => {
        it('sollte Stopwörter entfernen', () => {
            const keywords = extractKeywords('Die Behandlung ist in der Praxis');
            expect(keywords).not.toContain('die');
            expect(keywords).not.toContain('ist');
            expect(keywords).not.toContain('der');
            expect(keywords).toContain('behandlung');
            expect(keywords).toContain('praxis');
        });

        it('sollte kurze Wörter entfernen', () => {
            const keywords = extractKeywords('Zahn am OK mit Krone');
            expect(keywords).not.toContain('am');
            expect(keywords).toContain('zahn');
            expect(keywords).toContain('krone');
        });
    });

    describe('findSynonyme', () => {
        it('sollte Synonyme für Füllung finden', () => {
            const synonyme = findSynonyme('Kompositfüllung');
            expect(synonyme).toContain('fuellung');
            expect(synonyme).toContain('amalgam');
        });

        it('sollte Synonyme für Wurzelbehandlung finden', () => {
            const synonyme = findSynonyme('Endodontie');
            expect(synonyme).toContain('endo');
            expect(synonyme).toContain('wurzelkanalbehandlung');
            expect(synonyme).toContain('wkb');
        });

        it('sollte Synonyme für Keramik finden', () => {
            const synonyme = findSynonyme('Vollkeramik Krone');
            expect(synonyme).toContain('zirkon');
            expect(synonyme).toContain('empress');
        });
    });

    describe('generateSearchableText', () => {
        it('sollte kompletten searchableText generieren', () => {
            const code: BillingCode = {
                id: 'BEMA_13a',
                system: 'BEMA',
                nummer: '13a',
                bezeichnung: 'Einflächige Füllung',
                kurzform: 'F1',
                leistungsinhalt: 'Kavitätenpräparation, Füllung einflächig',
                wichtig: 'Sitzungsbezogen'
            };

            const result = generateSearchableText(code);

            expect(result.id).toBe('BEMA_13a');
            expect(result.searchableText).toContain('bema');
            expect(result.searchableText).toContain('13a');
            expect(result.searchableText).toContain('fuellung');
            expect(result.keywords.length).toBeGreaterThan(0);
        });
    });

    describe('levenshteinDistance', () => {
        it('sollte Distanz korrekt berechnen', () => {
            expect(levenshteinDistance('krone', 'krone')).toBe(0);
            expect(levenshteinDistance('krone', 'kronen')).toBe(1);
            expect(levenshteinDistance('krone', 'fuellung')).toBeGreaterThan(3);
        });
    });

    describe('fuzzySearch', () => {
        it('sollte exakte Treffer finden', () => {
            const codes: BillingCode[] = [
                { id: 'BEMA_13a', system: 'BEMA', nummer: '13a', bezeichnung: 'Füllung' },
                { id: 'BEMA_20a', system: 'BEMA', nummer: '20a', bezeichnung: 'Krone' }
            ];

            const codeMap = processCodeCatalog(codes);
            const results = fuzzySearch('fuellung', codeMap);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].id).toBe('BEMA_13a');
        });

        it('sollte fuzzy Treffer finden', () => {
            const codes: BillingCode[] = [
                { id: 'BEMA_13a', system: 'BEMA', nummer: '13a', bezeichnung: 'Füllung' }
            ];

            const codeMap = processCodeCatalog(codes);
            const results = fuzzySearch('fullng', codeMap, 2);  // Tippfehler

            expect(results.length).toBeGreaterThan(0);
        });
    });
});

describe('Regel-Linker', () => {

    const testRegeln: BillingRule[] = [
        {
            id: 'R001',
            typ: 'ausschluss',
            titel: 'Amalgam/Komposit',
            betrifft: ['BEMA_13a', 'BEMA_13b'],
            schweregrad: 'regress',
            beschreibung: 'Nur eine Füllung pro Kavität'
        },
        {
            id: 'R002',
            typ: 'kombination',
            titel: 'Krone mit Abformung',
            betrifft: ['BEMA_20a', 'BEMA_98a'],
            schweregrad: 'warnung',
            beschreibung: 'Abformung bei Kronenversorgung'
        },
        {
            id: 'R003',
            typ: 'bedingung',
            titel: 'Stift nach Endo',
            betrifft: ['BEMA_18a'],
            regel: { bedingung: 'BEMA_32' },
            schweregrad: 'regress',
            beschreibung: 'Stiftaufbau nur nach Wurzelbehandlung'
        }
    ];

    describe('buildRegelIndex', () => {
        it('sollte bidirektionalen Index erstellen', () => {
            const index = buildRegelIndex(testRegeln);

            // Regel → Codes
            expect(index.regelZuCodes.get('R001')).toEqual(['BEMA_13a', 'BEMA_13b']);

            // Codes → Regel
            const linked13a = index.codeZuRegeln.get('BEMA_13a');
            expect(linked13a).toBeDefined();
            expect(linked13a!.regelIds).toContain('R001');
            expect(linked13a!.regressRegeln).toContain('R001');
        });

        it('sollte nach Schweregrad kategorisieren', () => {
            const index = buildRegelIndex(testRegeln);

            const linked20a = index.codeZuRegeln.get('BEMA_20a');
            expect(linked20a!.warnungRegeln).toContain('R002');
        });
    });

    describe('getRegelnFuerCode', () => {
        it('sollte Regeln für Code finden', () => {
            const index = buildRegelIndex(testRegeln);
            const result = getRegelnFuerCode('BEMA_13a', index);

            expect(result).toBeDefined();
            expect(result!.regelIds).toContain('R001');
        });

        it('sollte null für unbekannten Code zurückgeben', () => {
            const index = buildRegelIndex(testRegeln);
            const result = getRegelnFuerCode('BEMA_999', index);

            expect(result).toBeNull();
        });
    });

    describe('pruefeKonflikte', () => {
        it('sollte Ausschluss-Konflikt erkennen', () => {
            const index = buildRegelIndex(testRegeln);
            const result = pruefeKonflikte(['BEMA_13a', 'BEMA_13b'], testRegeln, index);

            expect(result.hatKonflikt).toBe(true);
            expect(result.konflikte[0].regelId).toBe('R001');
            expect(result.konflikte[0].typ).toBe('ausschluss');
            expect(result.konflikte[0].schweregrad).toBe('regress');
        });

        it('sollte keinen Konflikt bei gültiger Kombination erkennen', () => {
            const index = buildRegelIndex(testRegeln);
            const result = pruefeKonflikte(['BEMA_13a', 'BEMA_20a'], testRegeln, index);

            expect(result.hatKonflikt).toBe(false);
        });

        it('sollte fehlende Bedingung erkennen', () => {
            const index = buildRegelIndex(testRegeln);
            const result = pruefeKonflikte(['BEMA_18a'], testRegeln, index);

            expect(result.hatKonflikt).toBe(true);
            expect(result.konflikte[0].typ).toBe('bedingung_fehlt');
        });
    });

    describe('generiereEmpfehlungen', () => {
        it('sollte Kombinations-Empfehlung generieren', () => {
            const index = buildRegelIndex(testRegeln);
            const empfehlungen = generiereEmpfehlungen(['BEMA_20a'], testRegeln, index);

            expect(empfehlungen.length).toBeGreaterThan(0);
            expect(empfehlungen.some(e => e.codeId === 'BEMA_98a')).toBe(true);
        });

        it('sollte nach Priorität sortieren', () => {
            const index = buildRegelIndex(testRegeln);
            const empfehlungen = generiereEmpfehlungen(['BEMA_20a', 'BEMA_32'], testRegeln, index);

            // Empfehlungen sollten sortiert sein (höchste Priorität zuerst)
            if (empfehlungen.length > 1) {
                const priorities = { hoch: 3, mittel: 2, niedrig: 1 };
                for (let i = 0; i < empfehlungen.length - 1; i++) {
                    expect(priorities[empfehlungen[i].prioritaet])
                        .toBeGreaterThanOrEqual(priorities[empfehlungen[i + 1].prioritaet]);
                }
            }
        });
    });
});
