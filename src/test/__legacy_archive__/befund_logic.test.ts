import { describe, it, expect } from 'vitest';
import {
    istImVerblendbereich,
    getVerblendbereichZaehne,
    ermittleBefundklasse,
    getBefundeFuerZahn,
    getBefundeFuerBruecke,
    getBefundeFuerProthese,
    ZahnSituation,
    LueckenSituation
} from '../sonia/billing/knowledgeBase/logic/befundLogic';
import {
    berechneFestzuschuss,
    berechneFZFuerZahn
} from '../sonia/billing/knowledgeBase/logic/festzuschussMapper';

describe('Befund-Logik', () => {

    describe('istImVerblendbereich', () => {
        it('sollte OK Frontzähne als im VB erkennen', () => {
            expect(istImVerblendbereich(11)).toBe(true);  // OK 1er
            expect(istImVerblendbereich(12)).toBe(true);  // OK 2er
            expect(istImVerblendbereich(13)).toBe(true);  // OK 3er
            expect(istImVerblendbereich(21)).toBe(true);  // OK 1er links
            expect(istImVerblendbereich(22)).toBe(true);  // OK 2er links
            expect(istImVerblendbereich(23)).toBe(true);  // OK 3er links
        });

        it('sollte OK Prämolaren als im VB erkennen', () => {
            expect(istImVerblendbereich(14)).toBe(true);  // OK 4er
            expect(istImVerblendbereich(15)).toBe(true);  // OK 5er
            expect(istImVerblendbereich(24)).toBe(true);  // OK 4er links
            expect(istImVerblendbereich(25)).toBe(true);  // OK 5er links
        });

        it('sollte OK Molaren als außerhalb VB erkennen', () => {
            expect(istImVerblendbereich(16)).toBe(false); // OK 6er
            expect(istImVerblendbereich(17)).toBe(false); // OK 7er
            expect(istImVerblendbereich(18)).toBe(false); // OK 8er
            expect(istImVerblendbereich(26)).toBe(false); // OK 6er links
            expect(istImVerblendbereich(27)).toBe(false); // OK 7er links
        });

        it('sollte UK Frontzähne als im VB erkennen', () => {
            expect(istImVerblendbereich(31)).toBe(true);  // UK 1er
            expect(istImVerblendbereich(32)).toBe(true);  // UK 2er
            expect(istImVerblendbereich(33)).toBe(true);  // UK 3er
            expect(istImVerblendbereich(41)).toBe(true);  // UK 1er rechts
            expect(istImVerblendbereich(42)).toBe(true);  // UK 2er rechts
            expect(istImVerblendbereich(43)).toBe(true);  // UK 3er rechts
        });

        it('sollte UK 4er (1. PM) als im VB erkennen', () => {
            expect(istImVerblendbereich(34)).toBe(true);  // UK 4er
            expect(istImVerblendbereich(44)).toBe(true);  // UK 4er rechts
        });

        it('sollte UK 5er als AUSSERHALB VB erkennen', () => {
            // WICHTIG: UK Verblendbereich nur bis 4er!
            expect(istImVerblendbereich(35)).toBe(false); // UK 5er
            expect(istImVerblendbereich(45)).toBe(false); // UK 5er rechts
        });

        it('sollte UK Molaren als außerhalb VB erkennen', () => {
            expect(istImVerblendbereich(36)).toBe(false); // UK 6er
            expect(istImVerblendbereich(37)).toBe(false); // UK 7er
            expect(istImVerblendbereich(46)).toBe(false); // UK 6er rechts
            expect(istImVerblendbereich(47)).toBe(false); // UK 7er rechts
        });
    });

    describe('getVerblendbereichZaehne', () => {
        it('sollte 18 Zähne im VB haben', () => {
            const vbZaehne = getVerblendbereichZaehne();
            expect(vbZaehne.length).toBe(18);
        });
    });

    describe('getBefundeFuerZahn', () => {
        it('sollte FZ 1.1 für weitgehend zerstörten Zahn liefern', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 36,
                weitgehendZerstoert: true
            });
            expect(result.befunde).toContain('FZ_1.1');
        });

        it('sollte FZ 1.3 NUR im Verblendbereich hinzufügen', () => {
            // Zahn 36 = außerhalb VB
            const r36 = getBefundeFuerZahn({
                zahnNummer: 36,
                weitgehendZerstoert: true
            });
            expect(r36.befunde).not.toContain('FZ_1.3');
            expect(r36.imVerblendbereich).toBe(false);

            // Zahn 14 = im VB (OK 4er)
            const r14 = getBefundeFuerZahn({
                zahnNummer: 14,
                weitgehendZerstoert: true
            });
            expect(r14.befunde).toContain('FZ_1.3');
            expect(r14.imVerblendbereich).toBe(true);
        });

        it('sollte FZ 1.4 für konfektionierten Stift nach Endo liefern', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 36,
                weitgehendZerstoert: true,
                nachEndo: true,
                stiftart: 'konfektioniert'
            });
            expect(result.befunde).toContain('FZ_1.1');
            expect(result.befunde).toContain('FZ_1.4');
            expect(result.befunde).not.toContain('FZ_1.5');
        });

        it('sollte FZ 1.5 für gegossenen Stift liefern', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 36,
                weitgehendZerstoert: true,
                nachEndo: true,
                stiftart: 'gegossen'
            });
            expect(result.befunde).toContain('FZ_1.5');
            expect(result.befunde).not.toContain('FZ_1.4');
        });

        it('sollte FZ 1.2 für partiellen Defekt liefern (ohne 1.3!)', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 14,  // Im VB
                partiellerDefekt: true
            });
            expect(result.befunde).toContain('FZ_1.2');
            expect(result.befunde).not.toContain('FZ_1.3'); // Teilkrone = keine Verblendung!
        });
    });

    describe('getBefundeFuerBruecke', () => {
        it('sollte FZ 2.1 für 1 fehlenden Zahn liefern', () => {
            const result = getBefundeFuerBruecke(
                { kiefer: 'UK', fehlendeMenge: 1, zahnbegrenzt: true, freiendsituation: false },
                [35, 37],  // Pfeiler: außerhalb VB
                [36]       // Fehlend: außerhalb VB
            );
            expect(result).toContain('FZ_2.1');
            expect(result.filter(b => b === 'FZ_2.7').length).toBe(0); // Keine VB!
        });

        it('sollte korrekt VB-Verblendungen zählen - Frontzahn-Brücke', () => {
            // Brücke im Frontzahnbereich: 12-X-22 (21 fehlt)
            const result = getBefundeFuerBruecke(
                { kiefer: 'OK', fehlendeMenge: 1, zahnbegrenzt: true, freiendsituation: false },
                [12, 22],  // Pfeiler im VB
                [21]       // Fehlend im VB
            );
            expect(result).toContain('FZ_2.1');
            // 2 Pfeiler + 1 Zwischenglied = 3 Verblendungen
            expect(result.filter(b => b === 'FZ_2.7').length).toBe(3);
        });

        it('sollte gemischte VB korrekt berechnen', () => {
            // Brücke: 15-X-17 (16 fehlt) - 15 im VB, 16+17 außerhalb
            const result = getBefundeFuerBruecke(
                { kiefer: 'OK', fehlendeMenge: 1, zahnbegrenzt: true, freiendsituation: false },
                [15, 17],  // 15 im VB, 17 nicht
                [16]       // Nicht im VB
            );
            expect(result).toContain('FZ_2.1');
            // Nur 1 Verblendung (Zahn 15)
            expect(result.filter(b => b === 'FZ_2.7').length).toBe(1);
        });

        it('sollte FZ 2.4 nur für Frontzähne erlauben', () => {
            // Fehler: 4 fehlende Zähne aber nicht alle Frontzähne
            expect(() => {
                getBefundeFuerBruecke(
                    { kiefer: 'OK', fehlendeMenge: 4, zahnbegrenzt: true, freiendsituation: false },
                    [15, 25],
                    [14, 13, 12, 11]  // 14 ist kein Frontzahn!
                );
            }).toThrow('FZ 2.4 nur für Frontzahnbereich');
        });

        it('sollte FZ 2.4 für echte Frontzahn-Lücke erlauben', () => {
            // OK: 4 Frontzähne fehlen (11-22)
            const result = getBefundeFuerBruecke(
                { kiefer: 'OK', fehlendeMenge: 4, zahnbegrenzt: true, freiendsituation: false },
                [13, 23],
                [12, 11, 21, 22]  // Alle Frontzähne
            );
            expect(result).toContain('FZ_2.4');
        });

        it('sollte FZ 2.5 für angrenzende Lücken berechnen', () => {
            const result = getBefundeFuerBruecke(
                {
                    kiefer: 'OK',
                    fehlendeMenge: 1,
                    zahnbegrenzt: true,
                    freiendsituation: false,
                    angrenzendeWeitersLuecken: 2  // 2 angrenzende 1-Zahn-Lücken
                },
                [14, 17],
                [15]
            );
            expect(result).toContain('FZ_2.1');
            expect(result.filter(b => b === 'FZ_2.5').length).toBe(2);
        });

        it('sollte FZ 2.6 für disparallele Pfeiler berechnen', () => {
            const result = getBefundeFuerBruecke(
                {
                    kiefer: 'OK',
                    fehlendeMenge: 1,
                    zahnbegrenzt: true,
                    freiendsituation: false,
                    disparallelePfeiler: true
                },
                [14, 16],
                [15]
            );
            expect(result).toContain('FZ_2.1');
            expect(result).toContain('FZ_2.6');
        });
    });

    describe('getBefundeFuerZahn - Erweiterte Tests', () => {
        it('sollte FZ 1.1 auch für erneuerungsbedürftige Krone (kw) liefern', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 14,
                erneuerungsbeduerftig: true
            });
            expect(result.befunde).toContain('FZ_1.1');
            expect(result.befunde).toContain('FZ_1.3'); // Im VB!
        });

        it('sollte FZ 1.1 auch für unzureichende Retention (ur) liefern', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 36, // Außerhalb VB
                unzureichendeRetention: true
            });
            expect(result.befunde).toContain('FZ_1.1');
            expect(result.befunde).not.toContain('FZ_1.3'); // 36 nicht im VB
        });

        it('sollte bei Brücken-Pfeiler KEINE FZ 1.1-1.3 liefern + Warnung', () => {
            const result = getBefundeFuerZahn({
                zahnNummer: 14,
                weitgehendZerstoert: true,
                istBrueckenPfeiler: true  // G-BA Regel!
            });
            expect(result.befunde).toHaveLength(0); // Keine FZ für Brücken-Pfeiler!
            expect(result.befundklasse).toBe(2);
            expect(result.warnungen).toBeDefined();
            expect(result.warnungen![0]).toContain('Brücken-Pfeiler');
        });
    });

    describe('ermittleBefundklasse', () => {
        it('sollte Klasse 1 für Einzelkrone liefern', () => {
            const klasse = ermittleBefundklasse([
                { zahnNummer: 36, weitgehendZerstoert: true }
            ]);
            expect(klasse).toBe(1);
        });

        it('sollte Klasse 2 für zahnbegrenzte Lücke liefern', () => {
            const klasse = ermittleBefundklasse(
                [],
                { kiefer: 'OK', fehlendeMenge: 2, zahnbegrenzt: true, freiendsituation: false }
            );
            expect(klasse).toBe(2);
        });

        it('sollte Klasse 3 für Freiendsituation liefern', () => {
            const klasse = ermittleBefundklasse(
                [],
                { kiefer: 'OK', fehlendeMenge: 3, zahnbegrenzt: false, freiendsituation: true }
            );
            expect(klasse).toBe(3);
        });

        it('sollte Klasse 4 für ≤3 Restzähne liefern', () => {
            const klasse = ermittleBefundklasse(
                [],
                { kiefer: 'OK', fehlendeMenge: 10, zahnbegrenzt: false, freiendsituation: true, restzaehne: 2 }
            );
            expect(klasse).toBe(4);
        });
    });
});

describe('Festzuschuss-Mapper', () => {

    describe('berechneFestzuschuss', () => {
        it('sollte Krone ohne Bonus korrekt berechnen (2025)', () => {
            const result = berechneFestzuschuss(['FZ_1.1'], 'ohne');
            expect(result.gesamtbetrag).toBe(229.25);
        });

        it('sollte Krone mit 10J Bonus korrekt berechnen (2025)', () => {
            const result = berechneFestzuschuss(['FZ_1.1'], '10_jahre');
            expect(result.gesamtbetrag).toBe(286.57);
        });

        it('sollte Krone + Stift + Verblendung summieren (2025)', () => {
            const result = berechneFestzuschuss(['FZ_1.1', 'FZ_1.3', 'FZ_1.4'], 'ohne');
            // 229.25 + 58.41 + 55.31 = 342.97
            expect(result.gesamtbetrag).toBe(342.97);
        });

        it('sollte Regelversorgung korrekt ermitteln', () => {
            const kronenResult = berechneFestzuschuss(['FZ_1.1'], 'ohne');
            expect(kronenResult.regelversorgung).toBe('Metallkrone');

            const brueckenResult = berechneFestzuschuss(['FZ_2.1'], 'ohne');
            expect(brueckenResult.regelversorgung).toBe('Brücke');
        });
    });

    describe('berechneFZFuerZahn - Praxis-Szenario (2025)', () => {
        it('Vollkeramikkrone Zahn 36 nach Endo mit Glasfaserstift', () => {
            const result = berechneFZFuerZahn({
                zahnNummer: 36,
                weitgehendZerstoert: true,
                nachEndo: true,
                stiftart: 'konfektioniert'
            }, 'ohne');

            // Erwartete Befunde: FZ 1.1 + FZ 1.4 (NICHT 1.3 weil 36 außerhalb VB!)
            expect(result.befunde).toContain('FZ_1.1');
            expect(result.befunde).toContain('FZ_1.4');
            expect(result.befunde).not.toContain('FZ_1.3'); // KRITISCH!

            // Betrag 2025: 229.25 + 55.31 = 284.56
            expect(result.gesamtbetrag).toBe(284.56);
        });
    });
});

