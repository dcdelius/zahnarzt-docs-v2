import type { ClinicalEventBundle } from './types';
import { createRadiologyEvidenceAskbackBundles } from './common';

function usesRadiology(facts: Record<string, unknown>): boolean {
    const endo = facts.endo as
        | {
            step?: string;
            obturationMentioned?: boolean;
            obturated?: boolean;
            wfTechnique?: string;
            diagnosticXray?: boolean;
            workingLengthMethod?: string;
        }
        | undefined;
    if (!endo) return false;
    if (endo.diagnosticXray === true) return true;
    if (endo.workingLengthMethod === 'xray') return true;
    return endo.obturated === true
        || endo.wfTechnique !== undefined
        || endo.obturationMentioned === true
        || endo.step === 'obturation';
}

export const endoBundles: ClinicalEventBundle[] = [
    {
        id: 'endo.baseline',
        scope: 'per_instance',
        match: () => true,
    },
    {
        id: 'endo.wl.electronic',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { workingLengthMethod?: string } | undefined)?.workingLengthMethod === 'electronic',
        emitChips: ['laengenmessung_elek'],
    },
    {
        id: 'endo.wl.xray',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { workingLengthMethod?: string } | undefined)?.workingLengthMethod === 'xray',
        emitChips: ['laengenmessung_roentgen'],
    },
    {
        id: 'endo.wf.warm',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { wfTechnique?: string } | undefined)?.wfTechnique === 'warm',
        emitChips: ['wf_warm'],
    },
    {
        id: 'endo.wf.einzel',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { wfTechnique?: string } | undefined)?.wfTechnique === 'einzel',
        emitChips: ['wf_einzel'],
    },
    {
        id: 'endo.wf.kalt',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { wfTechnique?: string } | undefined)?.wfTechnique === 'kalt',
        emitChips: ['wf_kalt'],
    },
    {
        id: 'endo.irrigation.naocl',
        scope: 'per_instance',
        match: (facts) => {
            const solutions = (facts.endo as { irrigationSolutions?: string[] } | undefined)?.irrigationSolutions ?? [];
            return solutions.some(s => String(s).toLowerCase().includes('naocl'));
        },
        emitChips: ['spuelung_naocl'],
    },
    {
        id: 'endo.irrigation.edta',
        scope: 'per_instance',
        match: (facts) => {
            const solutions = (facts.endo as { irrigationSolutions?: string[] } | undefined)?.irrigationSolutions ?? [];
            return solutions.some(s => String(s).toLowerCase().includes('edta'));
        },
        emitChips: ['spuelung_edta'],
    },
    {
        id: 'endo.medication.caoh2',
        scope: 'per_instance',
        match: (facts) => {
            const medication = (facts.endo as { medication?: string } | undefined)?.medication ?? '';
            return String(medication).toLowerCase().includes('ca(oh)') || String(medication).toLowerCase().includes('caoh');
        },
        emitChips: ['einlage_caoh2'],
    },
    {
        id: 'endo.canal.count.1',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { canalCount?: number } | undefined)?.canalCount === 1,
        emitChips: ['kanalaufbereitung_1'],
    },
    {
        id: 'endo.canal.count.2',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { canalCount?: number } | undefined)?.canalCount === 2,
        emitChips: ['kanalaufbereitung_2'],
    },
    {
        id: 'endo.canal.count.3',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { canalCount?: number } | undefined)?.canalCount === 3,
        emitChips: ['kanalaufbereitung_3'],
    },
    {
        id: 'endo.canal.count.4',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { canalCount?: number } | undefined)?.canalCount === 4,
        emitChips: ['kanalaufbereitung_4'],
    },
    {
        id: 'endo.instrumentation.rotary',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { instrumentationMode?: string } | undefined)?.instrumentationMode === 'rotary',
        emitChips: ['endo_instrumentation_rotary'],
    },
    {
        id: 'endo.instrumentation.manual',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { instrumentationMode?: string } | undefined)?.instrumentationMode === 'manual',
        emitChips: ['endo_instrumentation_manual'],
    },
    {
        id: 'endo.sealer',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { sealerMentioned?: boolean } | undefined)?.sealerMentioned === true,
        emitChips: ['endo_sealer'],
    },
    {
        id: 'endo.xray.diagnostic',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { diagnosticXray?: boolean } | undefined)?.diagnosticXray === true,
        emitChips: ['roentgen_einzelzahn'],
    },
    {
        id: 'endo.xray.control',
        scope: 'per_instance',
        match: (facts) => {
            const endo = facts.endo as { step?: string; obturationMentioned?: boolean; obturated?: boolean; wfTechnique?: string } | undefined;
            return endo?.obturated === true
                || endo?.wfTechnique !== undefined
                || endo?.obturationMentioned === true
                || endo?.step === 'obturation';
        },
        emitChips: ['roentgen_kontrolle'],
    },
    {
        id: 'endo.post_buildup',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { postEndoAufbau?: boolean } | undefined)?.postEndoAufbau === true,
        emitChips: ['aufbau_postendo'],
    },
    {
        id: 'endo.temp_closure',
        scope: 'per_instance',
        match: (facts) => (facts.endo as { tempClosure?: boolean } | undefined)?.tempClosure === true,
        emitChips: ['provisorischer_verschluss'],
    },
    {
        id: 'endo.trepanation',
        scope: 'per_instance',
        match: (facts) => {
            const endo = facts.endo as { step?: string; trepanation?: boolean } | undefined;
            return endo?.trepanation === true || endo?.step === 'trepanation';
        },
        emitChips: ['trepanation'],
    },
];

export const endoAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'endo.askback.isolation',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'endo'
            && (facts.isolationMentioned === undefined || facts.isolationMentioned === 'unknown')
            && (facts.kofferdamUsed === undefined)
            && !(facts.endo as { kofferdam?: boolean } | undefined)?.kofferdam,
        requiresFacts: ['isolationMentioned'],
        askbacks: ['medical_isolation'],
    },
    {
        id: 'endo.askback.wl_method',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'endo'
            && !(facts.endo as { workingLengthMethod?: string } | undefined)?.workingLengthMethod,
        requiresFacts: ['endo.workingLengthMethod'],
        askbacks: ['medical_wl_method'],
    },
    {
        id: 'endo.askback.wf_technique',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'endo'
            && !(facts.endo as { wfTechnique?: string } | undefined)?.wfTechnique,
        requiresFacts: ['endo.wfTechnique'],
        askbacks: ['medical_wf_technique'],
    },
    {
        id: 'endo.askback.irrigation',
        scope: 'per_instance',
        match: (facts) => {
            if (facts.treatmentId !== 'endo') return false;
            const solutions = (facts.endo as { irrigationSolutions?: string[] } | undefined)?.irrigationSolutions;
            return !Array.isArray(solutions) || solutions.length === 0;
        },
        requiresFacts: ['endo.irrigationSolutions'],
        askbacks: ['medical_irrigation'],
    },
    {
        id: 'endo.askback.medication',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'endo'
            && !(facts.endo as { medication?: string } | undefined)?.medication,
        requiresFacts: ['endo.medication'],
        askbacks: ['endo_medication'],
    },
    {
        id: 'endo.askback.canal_count',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'endo'
            && typeof (facts.endo as { canalCount?: number } | undefined)?.canalCount !== 'number',
        requiresFacts: ['endo.canalCount'],
        askbacks: ['endo_canal_count'],
    },
];

export const endoStrictEvidenceBundles: ClinicalEventBundle[] = [
    ...createRadiologyEvidenceAskbackBundles({
        idPrefix: 'endo.strict',
        mode: 'strict_only',
        applies: (facts) =>
            facts.treatmentId === 'endo'
            && usesRadiology(facts),
    }),
];
