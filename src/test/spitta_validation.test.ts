/**
 * Spitta Fallbeispiel Validation Tests
 * 
 * Testet unsere Billing-Logik gegen echte Praxis-Beispiele
 * aus Spitta-Publikationen.
 */

import { describe, it, expect } from 'vitest';
import {
    getBefundeFuerZahn,
    getBefundeFuerBruecke,
    getBefundeFuerProthese,
    istImVerblendbereich,
    ZahnSituation,
    LueckenSituation
} from '../docudent/core/billing/knowledgeBase/logic/befundLogic';

import {
    berechneFestzuschuss,
    berechneFZFuerZahn
} from '../docudent/core/billing/knowledgeBase/logic/festzuschussMapper';
import {
    generiereBegruendung,
    berechneEmpfohlenenFaktor
} from '../docudent/core/billing/knowledgeBase/logic/begruendungsGenerator';

describe('Spitta Fallbeispiele - Validation', () => {

    /**
     * FALLBEISPIEL 1: Spitta
     * Zahn 25 mit Vollkeramikkrone + adhäsiv befestigter Glasfaserstift
     * Quelle: spitta.de
     */
    describe('Fall 1: Zahn 25 Vollkeramikkrone mit Stift (Spitta)', () => {
        const situation: ZahnSituation = {
            zahnNummer: 25,
            weitgehendZerstoert: true,
            nachEndo: true,
            stiftart: 'konfektioniert'
        };

        it('sollte korrekte Befunde ermitteln: FZ 1.1 + 1.3 + 1.4', () => {
            const result = getBefundeFuerZahn(situation);

            expect(result.befunde).toContain('FZ_1.1');  // Weitgehend zerstört
            expect(result.befunde).toContain('FZ_1.3');  // Verblendung (25 im VB!)
            expect(result.befunde).toContain('FZ_1.4');  // Konfektionierter Stift
        });

        it('Zahn 25 sollte im Verblendbereich sein', () => {
            expect(istImVerblendbereich(25)).toBe(true);  // OK 5er = im VB
        });

        it('sollte korrekten Festzuschuss berechnen (2025)', () => {
            const result = berechneFZFuerZahn(situation, 'ohne');

            // FZ 1.1: 229.25€ + FZ 1.3: 58.41€ + FZ 1.4: 55.31€ = 342.97€
            expect(result.gesamtbetrag).toBeCloseTo(342.97, 1);
        });

        it('sollte korrekten Festzuschuss mit 10J Bonus berechnen', () => {
            const result = berechneFZFuerZahn(situation, '10_jahre');

            // FZ 1.1: 286.57€ + FZ 1.3: 73.01€ + FZ 1.4: 69.14€ = 428.72€
            expect(result.gesamtbetrag).toBeCloseTo(428.72, 1);
        });
    });

    /**
     * FALLBEISPIEL 2: Spitta
     * Zahn 36 mit Metallkrone + adhäsiver Befestigung
     * WICHTIG: Zahn 36 ist NICHT im Verblendbereich!
     */
    describe('Fall 2: Zahn 36 Metallkrone adhäsiv (Spitta)', () => {
        const situation: ZahnSituation = {
            zahnNummer: 36,
            weitgehendZerstoert: true
        };

        it('sollte nur FZ 1.1 ermitteln (KEINE Verblendung!)', () => {
            const result = getBefundeFuerZahn(situation);

            expect(result.befunde).toContain('FZ_1.1');
            expect(result.befunde).not.toContain('FZ_1.3');  // 36 außerhalb VB!
        });

        it('Zahn 36 sollte NICHT im Verblendbereich sein', () => {
            expect(istImVerblendbereich(36)).toBe(false);  // UK 6er = außerhalb VB
        });

        it('sollte korrekten Festzuschuss 2025 berechnen', () => {
            const result = berechneFZFuerZahn(situation, 'ohne');

            // NUR FZ 1.1: 229.25€ (keine Verblendung!)
            expect(result.gesamtbetrag).toBeCloseTo(229.25, 1);
        });
    });

    /**
     * FALLBEISPIEL 3: Spitta
     * Brücke 14-X-16 (Zahn 15 fehlt)
     * Prüft gemischten VB: 14+15 im VB, 16 außerhalb
     */
    describe('Fall 3: Brücke 14-X-16 (Spitta)', () => {
        const luecke: LueckenSituation = {
            kiefer: 'OK',
            fehlendeMenge: 1,
            zahnbegrenzt: true,
            freiendsituation: false
        };

        it('sollte FZ 2.1 + korrekte Anzahl Verblendungen (FZ 2.7) ermitteln', () => {
            const result = getBefundeFuerBruecke(luecke, [14, 16], [15]);

            expect(result).toContain('FZ_2.1');  // 1 fehlender Zahn

            // Verblendungen: 14 (VB) + 15 (VB) + 16 (NICHT VB) = 2x FZ 2.7
            const verblendungen = result.filter(b => b === 'FZ_2.7');
            expect(verblendungen.length).toBe(2);  // 14 und 15 im VB
        });

        it('sollte korrekten Gesamt-Festzuschuss berechnen', () => {
            const befunde = ['FZ_2.1', 'FZ_2.7', 'FZ_2.7'];
            const result = berechneFestzuschuss(befunde, 'ohne');

            // FZ 2.1: 513.90€ + 2x FZ 2.7: 116.82€ = 630.72€
            expect(result.gesamtbetrag).toBeCloseTo(630.72, 1);
        });
    });

    /**
     * FALLBEISPIEL 4: Spitta
     * Frontzahnbrücke mit 4 fehlenden Zähnen (FZ 2.4)
     */
    describe('Fall 4: Frontzahnbrücke 13-X-X-X-X-23 (Spitta)', () => {
        it('sollte FZ 2.4 für 4 fehlende Frontzähne ermitteln', () => {
            const luecke: LueckenSituation = {
                kiefer: 'OK',
                fehlendeMenge: 4,
                zahnbegrenzt: true,
                freiendsituation: false
            };

            const result = getBefundeFuerBruecke(luecke, [13, 23], [12, 11, 21, 22]);

            expect(result).toContain('FZ_2.4');  // 4 fehlende Frontzähne

            // Alle 6 Glieder im VB = 6x FZ 2.7
            const verblendungen = result.filter(b => b === 'FZ_2.7');
            expect(verblendungen.length).toBe(6);
        });

        it('sollte korrekten Festzuschuss berechnen', () => {
            const befunde = ['FZ_2.4', 'FZ_2.7', 'FZ_2.7', 'FZ_2.7', 'FZ_2.7', 'FZ_2.7', 'FZ_2.7'];
            const result = berechneFestzuschuss(befunde, '10_jahre');

            // FZ 2.4: 945.10€ + 6x FZ 2.7: 438.06€ = 1383.16€
            expect(result.gesamtbetrag).toBeCloseTo(1383.16, 1);
        });
    });

    /**
     * FALLBEISPIEL 5: GOZ-Steigerungsfaktor
     * Molar mit starker Verkalkung bei Endorevision
     */
    describe('Fall 5: GOZ-Steigerung bei Endorevision (Spitta)', () => {
        it('sollte passende Begründung für Faktor 3.5 generieren', () => {
            const result = generiereBegruendung(
                'GOZ_2410',
                ['starke_verkalkung', 'revision', 'gekruemmte_wurzel'],
                3.5
            );

            expect(result.empfohleneFaktor).toBe(3.5);
            expect(result.begruendungsText).toContain('§ 5 Abs. 2 GOZ');
            expect(result.indikatoren.length).toBe(3);
        });

        it('sollte Faktor korrekt begrenzen bei zu vielen Indikatoren', () => {
            const empfohlen = berechneEmpfohlenenFaktor(
                ['starke_verkalkung', 'revision', 'gekruemmte_wurzel', 'lange_behandlungsdauer'],
                2.3
            );

            // Max 3.5-fach, auch wenn Indikatoren mehr ergeben würden
            expect(empfohlen).toBeLessThanOrEqual(3.5);
        });
    });

    /**
     * BONUS-VALIDIERUNG
     * Prüft die 60/70/75% Staffelung
     */
    describe('Bonus-Staffelung Validation (AOK/KZBV 2025)', () => {
        it('sollte korrekte Bonus-Prozentsätze berechnen', () => {
            const ohne = berechneFestzuschuss(['FZ_1.1'], 'ohne');
            const mit5j = berechneFestzuschuss(['FZ_1.1'], '5_jahre');
            const mit10j = berechneFestzuschuss(['FZ_1.1'], '10_jahre');

            // Verhältnis prüfen: 60% : 70% : 75% = 1 : 1.167 : 1.25
            const ratio5j = mit5j.gesamtbetrag / ohne.gesamtbetrag;
            const ratio10j = mit10j.gesamtbetrag / ohne.gesamtbetrag;

            expect(ratio5j).toBeCloseTo(1.167, 1);  // 70/60
            expect(ratio10j).toBeCloseTo(1.25, 1);   // 75/60
        });

        it('sollte Härtefall als 100% berechnen', () => {
            const haertefall = berechneFestzuschuss(['FZ_1.1'], 'haertefall');
            const ohne = berechneFestzuschuss(['FZ_1.1'], 'ohne');

            // Härtefall = 100%, Ohne = 60% → Verhältnis = 1.667
            const ratio = haertefall.gesamtbetrag / ohne.gesamtbetrag;
            expect(ratio).toBeCloseTo(1.667, 1);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // KOMPLEXE STRESS TESTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * STRESS TEST 1: Teleskopprothese UK (FZ 3.2a)
     * UK fehlende Zähne 35-38, 45-48
     * Teleskopanker auf 34 + 44 (beides 4er = im VB!)
     */
    describe('STRESS: Teleskopprothese UK FZ 3.2a (Spitta)', () => {
        it('sollte FZ 3.1 + 2x FZ 3.2a für Teleskopversorgung ermitteln', () => {
            const luecke: LueckenSituation = {
                kiefer: 'UK',
                fehlendeMenge: 8,  // 35-38 + 45-48
                zahnbegrenzt: false,
                freiendsituation: true,
                restzaehne: 6  // Mehr als 3 → Befundklasse 3
            };

            // Teleskop-Anker auf 34 und 44 (beide 4er = PM)
            const befunde = getBefundeFuerProthese(luecke, [34, 44]);

            expect(befunde).toContain('FZ_3.1');   // Modellgussprothese

            // 2x FZ 3.2a (nur für 3er/4er, max 2 pro Kiefer)
            const fz32a = befunde.filter(b => b === 'FZ_3.2a');
            expect(fz32a.length).toBe(2);

            // Verblendungen: 34 + 44 beide im UK-VB (bis 4er)
            const fz47 = befunde.filter(b => b === 'FZ_4.7');
            expect(fz47.length).toBe(2);
        });

        it('sollte korrekten Gesamtfestzuschuss berechnen', () => {
            const befunde = ['FZ_3.1', 'FZ_3.2a', 'FZ_3.2a', 'FZ_4.7', 'FZ_4.7'];
            const result = berechneFestzuschuss(befunde, 'ohne');

            // FZ 3.1: 634.49€ + 2x FZ 3.2a: 964.92€ + 2x FZ 4.7: 155.80€ = 1755.21€
            expect(result.gesamtbetrag).toBeCloseTo(1755.21, 0);
        });
    });

    /**
     * STRESS TEST 2: Mehrspannige Brücke mit FZ 2.5
     * 14-X-16 + angrenzende Lücke 17
     */
    describe('STRESS: Mehrspannige Brücke mit FZ 2.5 (Spitta)', () => {
        it('sollte FZ 2.1 + FZ 2.5 für angrenzende Lücke berechnen', () => {
            const luecke: LueckenSituation = {
                kiefer: 'OK',
                fehlendeMenge: 1,  // Hauptlücke
                zahnbegrenzt: true,
                freiendsituation: false,
                angrenzendeWeitersLuecken: 1  // Eine angrenzende Lücke
            };

            const befunde = getBefundeFuerBruecke(luecke, [14, 18], [15, 16, 17]);

            expect(befunde).toContain('FZ_2.1');  // Hauptlücke
            expect(befunde).toContain('FZ_2.5');  // Angrenzende Lücke
        });

        it('sollte VB nur für Zähne im Verblendbereich berechnen', () => {
            const luecke: LueckenSituation = {
                kiefer: 'OK',
                fehlendeMenge: 1,
                zahnbegrenzt: true,
                freiendsituation: false,
                angrenzendeWeitersLuecken: 1
            };

            // Pfeiler 14 (VB) und 18 (nicht VB)
            // Zwischenglieder: 15 (VB), 16 (nicht VB), 17 (nicht VB)
            const befunde = getBefundeFuerBruecke(luecke, [14, 18], [15, 16, 17]);

            // Verblendungen: nur 14 + 15 = 2
            const fz27 = befunde.filter(b => b === 'FZ_2.7');
            expect(fz27.length).toBe(2);
        });
    });

    /**
     * STRESS TEST 3: Brücke mit disparallelen Pfeilern (FZ 2.6)
     * Geschiebe-Brücke nötig
     */
    describe('STRESS: Geschiebe-Brücke mit FZ 2.6 (Spitta)', () => {
        it('sollte FZ 2.6 für disparallele Pfeiler berechnen', () => {
            const luecke: LueckenSituation = {
                kiefer: 'OK',
                fehlendeMenge: 2,
                zahnbegrenzt: true,
                freiendsituation: false,
                disparallelePfeiler: true  // Geschiebe nötig
            };

            const befunde = getBefundeFuerBruecke(luecke, [13, 17], [14, 15, 16]);

            expect(befunde).toContain('FZ_2.2');  // 2 fehlende Zähne
            expect(befunde).toContain('FZ_2.6');  // Geschiebe-Zuschlag
        });

        it('sollte Festzuschuss mit Geschiebe-Zuschlag berechnen', () => {
            const befunde = ['FZ_2.2', 'FZ_2.6', 'FZ_2.7', 'FZ_2.7', 'FZ_2.7'];  // 3 VB
            const result = berechneFestzuschuss(befunde, '10_jahre');

            // FZ 2.2: 743.29€ + FZ 2.6: 125.79€ + 3x FZ 2.7: 219.03€ = 1088.11€
            expect(result.gesamtbetrag).toBeCloseTo(1088.11, 0);
        });
    });

    /**
     * STRESS TEST 4: Oberkiefer Totalprothese (FZ 4.1)
     * Nur 2 Restzähne
     */
    describe('STRESS: OK mit ≤3 Restzähnen FZ 4.1 (Spitta)', () => {
        it('sollte Befundklasse 4 für ≤3 Restzähne ermitteln', () => {
            const luecke: LueckenSituation = {
                kiefer: 'OK',
                fehlendeMenge: 12,
                zahnbegrenzt: false,
                freiendsituation: true,
                restzaehne: 2  // Nur 2 Zähne übrig
            };

            const befunde = getBefundeFuerProthese(luecke);

            expect(befunde).toContain('FZ_4.1');  // OK mit ≤3 Restzähnen
        });

        it('sollte korrekten hohen Festzuschuss berechnen', () => {
            const result = berechneFestzuschuss(['FZ_4.1'], '10_jahre');

            // FZ 4.1 mit 10J Bonus: 881.25€
            expect(result.gesamtbetrag).toBe(881.25);
        });
    });

    /**
     * STRESS TEST 5: Komplexfall - 3 Kronen gemischt VB/nicht-VB
     * 14, 16, 36 - unterschiedliche VB-Zugehörigkeit
     */
    describe('STRESS: Gemischte Kronen VB/nicht-VB', () => {
        it('sollte FZ 1.3 nur für VB-Zähne berechnen', () => {
            const situationen: ZahnSituation[] = [
                { zahnNummer: 14, weitgehendZerstoert: true },  // VB ✅
                { zahnNummer: 16, weitgehendZerstoert: true },  // nicht VB ❌
                { zahnNummer: 36, weitgehendZerstoert: true }   // nicht VB ❌
            ];

            let fz11Count = 0;
            let fz13Count = 0;

            for (const sit of situationen) {
                const result = getBefundeFuerZahn(sit);
                fz11Count += result.befunde.filter(b => b === 'FZ_1.1').length;
                fz13Count += result.befunde.filter(b => b === 'FZ_1.3').length;
            }

            expect(fz11Count).toBe(3);  // Alle 3 brauchen Krone
            expect(fz13Count).toBe(1);  // NUR Zahn 14 bekommt Verblendung
        });

        it('sollte korrekten Gesamtfestzuschuss berechnen', () => {
            // 3x FZ 1.1 + 1x FZ 1.3 (nur Zahn 14)
            const result = berechneFestzuschuss(['FZ_1.1', 'FZ_1.1', 'FZ_1.1', 'FZ_1.3'], 'ohne');

            // 3x 229.25€ + 1x 58.41€ = 746.16€
            expect(result.gesamtbetrag).toBeCloseTo(746.16, 1);
        });
    });

    /**
     * STRESS TEST 6: Brücken-Pfeiler Warnung (G-BA Regel)
     * Pfeiler dürfen KEINE Einzelkronen-FZ bekommen
     */
    describe('STRESS: Brücken-Pfeiler G-BA Warnung', () => {
        it('sollte KEINE FZ 1.1-1.3 für Brücken-Pfeiler liefern', () => {
            const pfeilerSituation: ZahnSituation = {
                zahnNummer: 14,
                weitgehendZerstoert: true,
                istBrueckenPfeiler: true  // Ist Teil einer Brücke!
            };

            const result = getBefundeFuerZahn(pfeilerSituation);

            expect(result.befunde).toHaveLength(0);  // KEINE FZ!
            expect(result.warnungen).toBeDefined();
            expect(result.warnungen!.length).toBeGreaterThan(0);
            expect(result.warnungen![0]).toContain('Brücken-Pfeiler');
        });

        it('sollte Befundklasse 2 für Brücken-Pfeiler setzen', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 35,
                weitgehendZerstoert: true,
                istBrueckenPfeiler: true
            });

            expect(result.befundklasse).toBe(2);  // Brücke = Klasse 2
        });
    });
});
