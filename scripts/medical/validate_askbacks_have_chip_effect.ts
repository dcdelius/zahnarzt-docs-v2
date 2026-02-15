/**
 * GP1: Validate that all askbacks have chip effects (except context-only)
 * 
 * Rule: Every askback must have `must_have_chip_effect: true` 
 * OR be explicitly marked as context-only.
 */

import * as fs from 'fs';
import * as path from 'path';

interface AskbackOption {
    label: string;
    effects: Array<{
        type: string;
        chipId?: string;
        path?: string;
        value?: unknown;
    }>;
}

interface Askback {
    id: string;
    title: string;
    when: string;
    options: AskbackOption[];
    must_have_chip_effect: boolean;
    note?: string;
}

interface KnowledgePack {
    askbacks: Askback[];
}

interface ValidationResult {
    valid: boolean;
    askback_id: string;
    title: string;
    must_have_chip_effect: boolean;
    has_chip_effect: boolean;
    is_context_only: boolean;
    error?: string;
}

interface Report {
    run_at: string;
    total_askbacks: number;
    passed: number;
    failed: number;
    results: ValidationResult[];
}

function hasChipEffect(askback: Askback): boolean {
    return askback.options.some(opt =>
        opt.effects.some(eff => eff.type === 'chip')
    );
}

function isContextOnly(askback: Askback): boolean {
    // Context-only askbacks only set facts, no chips
    const hasOnlySetFact = askback.options.every(opt =>
        opt.effects.every(eff => eff.type === 'setFact')
    );
    return hasOnlySetFact && askback.must_have_chip_effect === false;
}

function validate(): Report {
    const knowledgePath = path.join(
        process.cwd(),
        'docs/system-atlas/artifacts/medical-fuellung-de/fuellung_de_knowledge.v1.json'
    );

    const knowledge: KnowledgePack = JSON.parse(
        fs.readFileSync(knowledgePath, 'utf-8')
    );

    const results: ValidationResult[] = [];

    for (const askback of knowledge.askbacks) {
        const hasChip = hasChipEffect(askback);
        const contextOnly = isContextOnly(askback);

        let valid = true;
        let error: string | undefined;

        if (askback.must_have_chip_effect && !hasChip) {
            valid = false;
            error = `Askback marked must_have_chip_effect=true but has no chip effects`;
        }

        if (!askback.must_have_chip_effect && hasChip) {
            // This is fine - it has chip effects even though not required
        }

        if (!askback.must_have_chip_effect && !contextOnly && !hasChip) {
            valid = false;
            error = `Askback has no chip effects and is not marked as context-only`;
        }

        results.push({
            valid,
            askback_id: askback.id,
            title: askback.title,
            must_have_chip_effect: askback.must_have_chip_effect,
            has_chip_effect: hasChip,
            is_context_only: contextOnly,
            error,
        });
    }

    const passed = results.filter(r => r.valid).length;
    const failed = results.filter(r => !r.valid).length;

    return {
        run_at: new Date().toISOString(),
        total_askbacks: knowledge.askbacks.length,
        passed,
        failed,
        results,
    };
}

// Main
const report = validate();

// Write report
const reportPath = 'docs/system-atlas/artifacts/gigaprompt_fuellung_01/report.json';
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`Validation complete: ${report.passed}/${report.total_askbacks} passed`);

if (report.failed > 0) {
    console.log('\nFailed askbacks:');
    report.results
        .filter(r => !r.valid)
        .forEach(r => console.log(`  ${r.askback_id}: ${r.error}`));
    process.exit(1);
}
