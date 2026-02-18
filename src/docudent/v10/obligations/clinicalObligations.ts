import type { ClinicalValueKind } from '../../contracts/clinicalObligationRules';
import { CLINICAL_CONDITIONAL_RULES, CLINICAL_SIMPLE_RULES } from '../../contracts/clinicalObligationRules';
import { DOCUMENTATION_OBLIGATION_RULES } from '../../contracts/documentationObligations';
import type { TreatmentFacts } from '../facts';

export type ClinicalObligationOutcome = 'done' | 'not_done' | 'deferred_next_visit';

export interface ClinicalObligationCheck {
    obligationId: string;
    treatmentId: string;
    askbackId: string;
    factPath:
        | 'radiology.indication'
        | 'radiology.type'
        | 'radiology.timing'
        | 'radiology.findings'
        | 'anesthesia.type'
        | 'woundCare'
        | 'capping.performed'
        | 'cappingMaterial'
        | 'pzr.zahnsteinEntfernung'
        | 'pzr.fluoridation'
        | 'untersuchung.reason'
        | 'untersuchung.findings'
        | 'untersuchung.assessment'
        | 'parodontologie.phase'
        | 'parodontologie.uptGrade'
        | 'upt.grade'
        | 'upt.interval'
        | 'trauma.art'
        | 'trauma.schienung'
        | 'implant.phase'
        | 'implant.nachsorge'
        | 'wsr.zugang'
        | 'wsr.lokalisation'
        | 'fissurenversiegelung.indication'
        | 'fissurenversiegelung.material'
        | 'crownPrep.preparation'
        | 'crownPrep.impression'
        | 'crownPrep.provisional'
        | 'krone.type'
        | 'krone.placement'
        | 'teilkrone.type'
        | 'teilkrone.placement'
        | 'bruecke.type'
        | 'bruecke.phase'
        | 'teilprothese.type'
        | 'teilprothese.phase'
        | 'totalprothese.type'
        | 'totalprothese.phase'
        | 'schiene.type'
        | 'schiene.phase'
        | 'endo.workingLengthsText'
        | 'endo.canalCount'
        | 'endo.medication'
        | 'mkv_betrag';
    outcome: ClinicalObligationOutcome;
    reason: string;
}

export interface ClinicalObligationResult {
    checks: ClinicalObligationCheck[];
    requiredAskbacks: string[];
}

interface EvaluateClinicalObligationsParams {
    treatmentId: string;
    facts: TreatmentFacts;
    strictKzvMode: boolean;
}

type RadiologyField = 'indication' | 'type' | 'timing' | 'findings';

type RadiologyRequirementContext = {
    applies: boolean;
    deferReason: string;
};

const RADIOLOGY_FIELDS: Array<{
    field: RadiologyField;
    askbackId: string;
}> = DOCUMENTATION_OBLIGATION_RULES
    .filter(rule => rule.id.startsWith('radiology_') && rule.askbackId)
    .map(rule => ({
        field: String(rule.factPath).replace('radiology.', '') as RadiologyField,
        askbackId: String(rule.askbackId),
    }))
    .filter(def => ['indication', 'type', 'timing', 'findings'].includes(def.field));

function hasRadiologyField(facts: TreatmentFacts, field: RadiologyField): boolean {
    const value = facts.radiology?.[field];
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== undefined && value !== null;
}

function endoUsesRadiology(facts: TreatmentFacts): boolean {
    const endo = facts.endo;
    if (!endo) return false;
    if (endo.diagnosticXray === true) return true;
    if (endo.workingLengthMethod === 'xray') return true;
    return endo.obturated === true
        || endo.wfTechnique !== undefined
        || endo.obturationMentioned === true
        || endo.step === 'obturation';
}

function hasNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

function isBooleanKnown(value: unknown): boolean {
    return typeof value === 'boolean';
}

function evaluateValueKind(value: unknown, valueKind: ClinicalValueKind): boolean {
    if (valueKind === 'string_non_empty') return hasNonEmptyString(value);
    if (valueKind === 'boolean_known') return isBooleanKnown(value);
    return false;
}

function getFactValueByPath(facts: TreatmentFacts, path: string): unknown {
    const parts = path.split('.');
    let cursor: any = facts;
    for (const part of parts) {
        if (!cursor || typeof cursor !== 'object') return undefined;
        cursor = cursor[part];
    }
    return cursor;
}

function evaluateSharedCondition(
    condition: { kind: 'present' } | { kind: 'positiveNumber' } | { kind: 'equals'; value: string },
    value: unknown
): boolean {
    if (condition.kind === 'present') {
        return typeof value === 'string'
            ? value.trim().length > 0
            : value !== undefined && value !== null;
    }
    if (condition.kind === 'positiveNumber') {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0;
    }
    return String(value ?? '').trim().toLowerCase() === condition.value.trim().toLowerCase();
}

function appendSharedDocumentationObligationsAsClinical(
    treatmentId: string,
    facts: TreatmentFacts,
    checks: ClinicalObligationCheck[]
): void {
    const relevant = DOCUMENTATION_OBLIGATION_RULES.filter(rule =>
        (rule.treatmentIds ?? []).includes(treatmentId)
        && typeof rule.askbackId === 'string'
        && (rule.factPath.startsWith('endo.') || rule.factPath === 'mkv_betrag')
        && (rule.factPath !== 'mkv_betrag' || facts.insuranceType === 'MKV')
    );

    for (const rule of relevant) {
        const factPath = rule.factPath as ClinicalObligationCheck['factPath'];
        const value = rule.factPath === 'mkv_betrag'
            ? facts.mkvBetrag
            : getFactValueByPath(facts, rule.factPath);
        const done = evaluateSharedCondition(rule.condition, value);

        checks.push({
            obligationId: `${treatmentId}.${rule.id}`,
            treatmentId,
            askbackId: String(rule.askbackId),
            factPath,
            outcome: done ? 'done' : 'not_done',
            reason: done ? 'fact_present' : 'fact_missing',
        });
    }
}

function isAnesthesiaResolved(facts: TreatmentFacts): boolean {
    return (
        facts.anesthesia !== undefined
        && facts.anesthesia !== 'unknown'
        && facts.anesthesia !== 'none'
        && facts.anesthesiaAmbiguous !== true
    );
}

function pushRequiredAskback(requiredAskbacks: string[], askbackId: string): void {
    if (!requiredAskbacks.includes(askbackId)) {
        requiredAskbacks.push(askbackId);
    }
}

function evaluateRuleValue(
    facts: TreatmentFacts,
    factPath: string,
    valueKind: ClinicalValueKind
): boolean {
    if (valueKind === 'anesthesia_resolved') {
        return isAnesthesiaResolved(facts);
    }
    if (factPath === 'capping.performed') {
        return facts.capping?.performed === 'yes' || facts.capping?.performed === 'no';
    }
    if (factPath === 'cappingMaterial') {
        return hasNonEmptyString(facts.cappingMaterial ?? facts.capping?.material);
    }
    const value = getFactValueByPath(facts, factPath);
    return evaluateValueKind(value, valueKind);
}

function appendSimpleRulesFromContract(
    treatmentId: string,
    facts: TreatmentFacts,
    checks: ClinicalObligationCheck[],
    requiredAskbacks: string[]
): void {
    const rules = CLINICAL_SIMPLE_RULES[treatmentId] ?? [];
    for (const rule of rules) {
        const done = evaluateRuleValue(facts, rule.factPath, rule.valueKind);

        checks.push({
            obligationId: `${treatmentId}.${rule.factPath}`,
            treatmentId,
            askbackId: rule.askbackId,
            factPath: rule.factPath as ClinicalObligationCheck['factPath'],
            outcome: done ? 'done' : 'not_done',
            reason: done ? 'fact_present' : 'fact_missing',
        });

        if (!done) pushRequiredAskback(requiredAskbacks, rule.askbackId);
    }
}

function appendConditionalRules(
    treatmentId: string,
    facts: TreatmentFacts,
    checks: ClinicalObligationCheck[],
    requiredAskbacks: string[]
): void {
    const rules = CLINICAL_CONDITIONAL_RULES[treatmentId] ?? [];
    for (const rule of rules) {
        const obligationId = `${treatmentId}.${rule.factPath}`;
        let required = false;

        switch (rule.applicability) {
            case 'always':
                required = true;
                break;
            case 'parodontologie_phase_upt':
                required = facts.parodontologie?.phase === 'upt';
                break;
            case 'wsr_gkv_only':
                required = facts.insuranceType === 'GKV';
                break;
            case 'wsr_pkv_only':
                required = facts.insuranceType === 'PKV';
                break;
        }

        if (!required) {
            checks.push({
                obligationId,
                treatmentId,
                askbackId: rule.askbackId,
                factPath: rule.factPath as ClinicalObligationCheck['factPath'],
                outcome: 'done',
                reason: rule.notRequiredReason ?? 'not_required',
            });
            continue;
        }

        const done = evaluateRuleValue(facts, rule.factPath, rule.valueKind);

        checks.push({
            obligationId,
            treatmentId,
            askbackId: rule.askbackId,
            factPath: rule.factPath as ClinicalObligationCheck['factPath'],
            outcome: done ? 'done' : 'not_done',
            reason: done ? 'fact_present' : 'fact_missing',
        });

        if (!done) pushRequiredAskback(requiredAskbacks, rule.askbackId);
    }
}

function resolveRadiologyRequirementContext(
    treatmentId: string,
    facts: TreatmentFacts,
    strictKzvMode: boolean
): RadiologyRequirementContext {
    if (treatmentId === 'roentgen') {
        return {
            applies: true,
            deferReason: 'n/a',
        };
    }

    if (treatmentId === 'endo') {
        if (!strictKzvMode) {
            return {
                applies: false,
                deferReason: 'strict_kzv_disabled',
            };
        }
        if (!endoUsesRadiology(facts)) {
            return {
                applies: false,
                deferReason: 'radiology_path_not_reached',
            };
        }
        return {
            applies: true,
            deferReason: 'n/a',
        };
    }

    if (treatmentId === 'fuellung') {
        if (!strictKzvMode) {
            return {
                applies: false,
                deferReason: 'strict_kzv_disabled',
            };
        }
        if (facts.capping?.performed !== 'yes') {
            return {
                applies: false,
                deferReason: 'capping_not_performed',
            };
        }
        return {
            applies: true,
            deferReason: 'n/a',
        };
    }

    return {
        applies: false,
        deferReason: 'treatment_not_mapped',
    };
}

export function evaluateClinicalObligations(
    params: EvaluateClinicalObligationsParams
): ClinicalObligationResult {
    const { treatmentId, facts, strictKzvMode } = params;
    const checks: ClinicalObligationCheck[] = [];
    const requiredAskbacks: string[] = [];

    const radiologyContext = resolveRadiologyRequirementContext(
        treatmentId,
        facts,
        strictKzvMode
    );

    for (const definition of RADIOLOGY_FIELDS) {
        const obligationId = `${treatmentId}.radiology.${definition.field}`;
        const factPath = `radiology.${definition.field}` as ClinicalObligationCheck['factPath'];

        if (!radiologyContext.applies) {
            checks.push({
                obligationId,
                treatmentId,
                askbackId: definition.askbackId,
                factPath,
                outcome: 'deferred_next_visit',
                reason: radiologyContext.deferReason,
            });
            continue;
        }

        if (hasRadiologyField(facts, definition.field)) {
            checks.push({
                obligationId,
                treatmentId,
                askbackId: definition.askbackId,
                factPath,
                outcome: 'done',
                reason: 'fact_present',
            });
            continue;
        }

        checks.push({
            obligationId,
            treatmentId,
            askbackId: definition.askbackId,
            factPath,
            outcome: 'not_done',
            reason: 'fact_missing',
        });
        pushRequiredAskback(requiredAskbacks, definition.askbackId);
    }

    appendSimpleRulesFromContract(treatmentId, facts, checks, requiredAskbacks);
    appendConditionalRules(treatmentId, facts, checks, requiredAskbacks);
    appendSharedDocumentationObligationsAsClinical(treatmentId, facts, checks);

    return {
        checks,
        requiredAskbacks,
    };
}
