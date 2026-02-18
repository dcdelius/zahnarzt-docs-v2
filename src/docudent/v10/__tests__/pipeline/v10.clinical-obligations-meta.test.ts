import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 pipeline: clinical obligations meta', () => {
    it('reports not_done obligations for roentgen when evidence is missing', async () => {
        const result = await runV10({
            dictation: 'Roentgenaufnahme Zahn 36 erstellt.',
            treatmentId: 'roentgen',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.meta.clinicalObligations?.summary.notDone).toBe(4);
        expect(result.meta.clinicalObligations?.summary.done).toBe(0);
    });

    it('reports deferred obligations when strict mode is disabled for fuellung', async () => {
        const result = await runV10({
            dictation: 'Zahn 26 tiefe Karies, indirekte Ueberkappung mit MTA.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map<string, unknown>([
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'MTA'],
            ]),
            userDefaults: {
                practice: {
                    version: '1.0.0',
                    strictKzvMode: false,
                },
            },
        });

        expect(result.meta.clinicalObligations?.summary.notDone).toBe(0);
        expect(result.meta.clinicalObligations?.summary.deferredNextVisit).toBe(4);
    });

    it('maps shared MKV amount obligation into clinical checks when amount exists', async () => {
        const result = await runV10({
            dictation: 'Zahn 26 MOD Komposit, Mehrkosten 129 Euro vereinbart.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map<string, unknown>([
                ['mkv_betrag', '129'],
                ['medical_ueberkappung', 'keine'],
            ]),
        });

        const mkvAmountCheck = result.meta.clinicalObligations?.checks.find(
            check => check.treatmentId === 'fuellung' && check.askbackId === 'mkv_betrag'
        );
        expect(mkvAmountCheck).toBeDefined();
        expect(mkvAmountCheck?.outcome).toBe('done');
    });

    it('prioritizes obligation provenance when askback IDs overlap with procedure rules', async () => {
        const result = await runV10({
            dictation: 'Roentgenaufnahme Zahn 36 erstellt.',
            treatmentId: 'roentgen',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        const askbackProvenance = result.meta.provenance?.askbacks ?? [];
        const roentgenIndikation = askbackProvenance.find(entry =>
            entry.askbackId.startsWith('medical_roentgen_indikation')
        );

        expect(roentgenIndikation).toBeDefined();
        expect(roentgenIndikation?.ruleId.startsWith('obligation:')).toBe(true);
    });

    it('adds extraction obligations into meta summary and required questions', async () => {
        const result = await runV10({
            dictation: 'Extraktion Zahn 28 durchgeführt.',
            treatmentId: 'extraction',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.summary.notDone).toBeGreaterThanOrEqual(2);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'extraction' && check.askbackId === 'medical_la_type'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'extraction' && check.askbackId === 'wound_care'
        )).toBe(true);
    });

    it('adds pzr obligations into meta summary and required questions', async () => {
        const result = await runV10({
            dictation: 'PZR durchgeführt.',
            treatmentId: 'pzr',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'pzr' && check.askbackId === 'pzr_zahnstein'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'pzr' && check.askbackId === 'pzr_fluoridation'
        )).toBe(true);
    });

    it('adds untersuchung obligations into meta summary and required questions', async () => {
        const result = await runV10({
            dictation: 'Eingehende Untersuchung durchgeführt.',
            treatmentId: 'untersuchung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'untersuchung' && check.askbackId === 'medical_untersuchung_anlass'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'untersuchung' && check.askbackId === 'medical_untersuchung_befunde'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'untersuchung' && check.askbackId === 'medical_untersuchung_beurteilung'
        )).toBe(true);
    });

    it('adds parodontologie obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Parodontalbehandlung an Zahn 36 durchgeführt.',
            treatmentId: 'parodontologie',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'parodontologie' && check.askbackId === 'medical_parodontologie_phase'
        )).toBe(true);
    });

    it('adds upt obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'UPT an Zahn 36 durchgeführt.',
            treatmentId: 'upt',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'upt' && check.askbackId === 'medical_upt_grad'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'upt' && check.askbackId === 'medical_upt_intervall'
        )).toBe(true);
    });

    it('adds trauma obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Zahntrauma an Zahn 11 dokumentiert.',
            treatmentId: 'trauma',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'trauma' && check.askbackId === 'medical_trauma_art'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'trauma' && check.askbackId === 'medical_trauma_schienung'
        )).toBe(true);
    });

    it('adds implant obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Implantologische Behandlung regio 36 dokumentiert.',
            treatmentId: 'implant',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'implant' && check.askbackId === 'medical_implant_phase'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'implant' && check.askbackId === 'medical_implant_nachsorge'
        )).toBe(true);
    });

    it('adds insurance-specific wsr obligations into meta summary', async () => {
        const gkvResult = await runV10({
            dictation: 'Wurzelspitzenresektion an Zahn 11 durchgeführt.',
            treatmentId: 'wsr',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });
        expect(gkvResult.state).toBe('questions');
        expect(gkvResult.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'wsr' && check.askbackId === 'medical_wsr_zugang' && check.outcome === 'not_done'
        )).toBe(true);

        const pkvResult = await runV10({
            dictation: 'Wurzelspitzenresektion an Zahn 36 durchgeführt.',
            treatmentId: 'wsr',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });
        expect(pkvResult.state).toBe('questions');
        expect(pkvResult.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'wsr' && check.askbackId === 'medical_wsr_lokalisation' && check.outcome === 'not_done'
        )).toBe(true);
    });

    it('adds fissurenversiegelung obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Fissurenversiegelung an Zahn 16 durchgeführt.',
            treatmentId: 'fissurenversiegelung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'fissurenversiegelung' && check.askbackId === 'medical_fissuren_indikation'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'fissurenversiegelung' && check.askbackId === 'medical_fissuren_material'
        )).toBe(true);
    });

    it('adds crown_prep obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Kronenpräparation dokumentiert.',
            treatmentId: 'crown_prep',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'crown_prep' && check.askbackId === 'crown_prep_preparation'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'crown_prep' && check.askbackId === 'crown_prep_impression'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'crown_prep' && check.askbackId === 'crown_prep_provisional'
        )).toBe(true);
    });

    it('adds krone obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Kronenversorgung an Zahn 16 durchgeführt.',
            treatmentId: 'krone',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'krone' && check.askbackId === 'medical_krone_art'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'krone' && check.askbackId === 'medical_krone_eingliederung'
        )).toBe(true);
    });

    it('adds teilkrone obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Teilkronenversorgung an Zahn 16 durchgeführt.',
            treatmentId: 'teilkrone',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'teilkrone' && check.askbackId === 'medical_teilkrone_art'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'teilkrone' && check.askbackId === 'medical_teilkrone_eingliederung'
        )).toBe(true);
    });

    it('adds bruecke obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Brueckenversorgung dokumentiert.',
            treatmentId: 'bruecke',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'bruecke' && check.askbackId === 'medical_bruecke_typ'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'bruecke' && check.askbackId === 'medical_bruecke_phase'
        )).toBe(true);
    });

    it('adds teilprothese obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Teilprothese dokumentiert.',
            treatmentId: 'teilprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'teilprothese' && check.askbackId === 'medical_teilprothese_typ'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'teilprothese' && check.askbackId === 'medical_teilprothese_phase'
        )).toBe(true);
    });

    it('adds totalprothese obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Totalprothese dokumentiert.',
            treatmentId: 'totalprothese',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'totalprothese' && check.askbackId === 'medical_totalprothese_typ'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'totalprothese' && check.askbackId === 'medical_totalprothese_phase'
        )).toBe(true);
    });

    it('adds schiene obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Schienentherapie dokumentiert.',
            treatmentId: 'schiene',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'schiene' && check.askbackId === 'medical_schiene_typ'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'schiene' && check.askbackId === 'medical_schiene_phase'
        )).toBe(true);
    });

    it('adds ueberkappung obligations into meta summary', async () => {
        const result = await runV10({
            dictation: 'Ueberkappung bei pulpanaher Karies dokumentiert.',
            treatmentId: 'ueberkappung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('questions');
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'ueberkappung' && check.askbackId === 'medical_ueberkappung'
        )).toBe(true);
        expect(result.meta.clinicalObligations?.checks.some(
            check => check.treatmentId === 'ueberkappung' && check.askbackId === 'medical_ueberkappung_material'
        )).toBe(true);
    });
});
