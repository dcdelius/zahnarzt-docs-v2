import { describe, expect, it } from 'vitest';

import { evaluateClinicalObligations } from '../../obligations/clinicalObligations';

describe('evaluateClinicalObligations', () => {
    it('roentgen requires all radiology evidence when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'roentgen',
            strictKzvMode: false,
            facts: {
                treatmentId: 'roentgen',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });

        expect(result.requiredAskbacks).toEqual([
            'medical_roentgen_indikation',
            'medical_roentgen_typ',
            'medical_roentgen_zeitpunkt',
            'medical_roentgen_befund',
        ]);
        expect(result.checks.every(check => check.outcome === 'not_done')).toBe(true);
    });

    it('fuellung strict disabled marks radiology obligations as deferred', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'fuellung',
            strictKzvMode: false,
            facts: {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'yes' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });

        expect(result.requiredAskbacks).toEqual([]);
        expect(result.checks.every(check => check.outcome === 'deferred_next_visit')).toBe(true);
        expect(result.checks.every(check => check.reason === 'strict_kzv_disabled')).toBe(true);
    });

    it('endo strict path marks present evidence as done and missing as not_done', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'endo',
            strictKzvMode: true,
            facts: {
                treatmentId: 'endo',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
                endo: {
                    workingLengthMethod: 'xray',
                },
                radiology: {
                    indication: 'planungsrelevant',
                    type: 'opg',
                },
            },
        });

        const byFact = new Map(result.checks.map(check => [check.factPath, check.outcome]));
        expect(byFact.get('radiology.indication')).toBe('done');
        expect(byFact.get('radiology.type')).toBe('done');
        expect(byFact.get('radiology.timing')).toBe('not_done');
        expect(byFact.get('radiology.findings')).toBe('not_done');
        expect(result.requiredAskbacks).toEqual([
            'medical_roentgen_zeitpunkt',
            'medical_roentgen_befund',
        ]);
    });

    it('extraction requires LA type and wound care when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'extraction',
            strictKzvMode: false,
            facts: {
                treatmentId: 'extraction',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
                anesthesia: 'unknown',
            },
        });

        const byFact = new Map(result.checks.map(check => [check.factPath, check.outcome]));
        expect(byFact.get('anesthesia.type')).toBe('not_done');
        expect(byFact.get('woundCare')).toBe('not_done');
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_la_type', 'wound_care'])
        );
    });

    it('extraction marks obligations as done when facts are present', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'extraction',
            strictKzvMode: false,
            facts: {
                treatmentId: 'extraction',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
                anesthesia: 'infiltr',
                woundCare: true,
            },
        });

        const byFact = new Map(result.checks.map(check => [check.factPath, check.outcome]));
        expect(byFact.get('anesthesia.type')).toBe('done');
        expect(byFact.get('woundCare')).toBe('done');
        expect(result.requiredAskbacks).not.toContain('medical_la_type');
        expect(result.requiredAskbacks).not.toContain('wound_care');
    });

    it('pzr requires zahnstein and fluoridation evidence when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'pzr',
            strictKzvMode: false,
            facts: {
                treatmentId: 'pzr',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });

        const byFact = new Map(result.checks.map(check => [check.factPath, check.outcome]));
        expect(byFact.get('pzr.zahnsteinEntfernung')).toBe('not_done');
        expect(byFact.get('pzr.fluoridation')).toBe('not_done');
        expect(result.requiredAskbacks).toEqual(expect.arrayContaining(['pzr_zahnstein', 'pzr_fluoridation']));
    });

    it('untersuchung requires reason/findings/assessment when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'untersuchung',
            strictKzvMode: false,
            facts: {
                treatmentId: 'untersuchung',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
                untersuchung: {},
            },
        });

        const byFact = new Map(result.checks.map(check => [check.factPath, check.outcome]));
        expect(byFact.get('untersuchung.reason')).toBe('not_done');
        expect(byFact.get('untersuchung.findings')).toBe('not_done');
        expect(byFact.get('untersuchung.assessment')).toBe('not_done');
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining([
                'medical_untersuchung_anlass',
                'medical_untersuchung_befunde',
                'medical_untersuchung_beurteilung',
            ])
        );
    });

    it('parodontologie requires phase; uptGrade only when phase=upt', () => {
        const missing = evaluateClinicalObligations({
            treatmentId: 'parodontologie',
            strictKzvMode: false,
            facts: {
                treatmentId: 'parodontologie',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(missing.requiredAskbacks).toContain('medical_parodontologie_phase');

        const ait = evaluateClinicalObligations({
            treatmentId: 'parodontologie',
            strictKzvMode: false,
            facts: {
                treatmentId: 'parodontologie',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
                parodontologie: { phase: 'ait' },
            },
        });
        expect(ait.requiredAskbacks).not.toContain('medical_parodontologie_upt_grad');
    });

    it('upt requires grade and interval when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'upt',
            strictKzvMode: false,
            facts: {
                treatmentId: 'upt',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_upt_grad', 'medical_upt_intervall'])
        );
    });

    it('trauma requires art and schienung when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'trauma',
            strictKzvMode: false,
            facts: {
                treatmentId: 'trauma',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_trauma_art', 'medical_trauma_schienung'])
        );
    });

    it('implant requires phase and nachsorge when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'implant',
            strictKzvMode: false,
            facts: {
                treatmentId: 'implant',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });

        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_implant_phase', 'medical_implant_nachsorge'])
        );
    });

    it('wsr requires insurance-specific evidence only', () => {
        const gkv = evaluateClinicalObligations({
            treatmentId: 'wsr',
            strictKzvMode: false,
            facts: {
                treatmentId: 'wsr',
                insuranceType: 'GKV',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(gkv.requiredAskbacks).toContain('medical_wsr_zugang');
        expect(gkv.requiredAskbacks).not.toContain('medical_wsr_lokalisation');

        const pkv = evaluateClinicalObligations({
            treatmentId: 'wsr',
            strictKzvMode: false,
            facts: {
                treatmentId: 'wsr',
                insuranceType: 'PKV',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(pkv.requiredAskbacks).toContain('medical_wsr_lokalisation');
        expect(pkv.requiredAskbacks).not.toContain('medical_wsr_zugang');
    });

    it('fissurenversiegelung requires indication and material when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'fissurenversiegelung',
            strictKzvMode: false,
            facts: {
                treatmentId: 'fissurenversiegelung',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });

        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_fissuren_indikation', 'medical_fissuren_material'])
        );
    });

    it('crown_prep requires preparation/impression/provisional when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'crown_prep',
            strictKzvMode: false,
            facts: {
                treatmentId: 'crown_prep',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining([
                'crown_prep_preparation',
                'crown_prep_impression',
                'crown_prep_provisional',
            ])
        );
    });

    it('krone requires type and placement when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'krone',
            strictKzvMode: false,
            facts: {
                treatmentId: 'krone',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_krone_art', 'medical_krone_eingliederung'])
        );
    });

    it('teilkrone requires type and placement when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'teilkrone',
            strictKzvMode: false,
            facts: {
                treatmentId: 'teilkrone',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_teilkrone_art', 'medical_teilkrone_eingliederung'])
        );
    });

    it('bruecke requires type and phase when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'bruecke',
            strictKzvMode: false,
            facts: {
                treatmentId: 'bruecke',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_bruecke_typ', 'medical_bruecke_phase'])
        );
    });

    it('teilprothese requires type and phase when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'teilprothese',
            strictKzvMode: false,
            facts: {
                treatmentId: 'teilprothese',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_teilprothese_typ', 'medical_teilprothese_phase'])
        );
    });

    it('totalprothese requires type and phase when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'totalprothese',
            strictKzvMode: false,
            facts: {
                treatmentId: 'totalprothese',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_totalprothese_typ', 'medical_totalprothese_phase'])
        );
    });

    it('schiene requires type and phase when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'schiene',
            strictKzvMode: false,
            facts: {
                treatmentId: 'schiene',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_schiene_typ', 'medical_schiene_phase'])
        );
    });

    it('ueberkappung requires type and material when missing', () => {
        const result = evaluateClinicalObligations({
            treatmentId: 'ueberkappung',
            strictKzvMode: false,
            facts: {
                treatmentId: 'ueberkappung',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        expect(result.requiredAskbacks).toEqual(
            expect.arrayContaining(['medical_ueberkappung', 'medical_ueberkappung_material'])
        );
    });
});
