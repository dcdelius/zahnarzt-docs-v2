import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../../../');
const AUDIT_SCRIPT = join(ROOT, 'scripts/v10/runV10DocumentationFidelityAudit.ts');

describe('gate-documentation-fidelity-audit-rules', () => {
    it('keeps instance-scoped answer mapping in fidelity audit', () => {
        const source = readFileSync(AUDIT_SCRIPT, 'utf-8');
        expect(source).toContain('`${instanceId}::${q.id}`');
        expect(source).toContain('`${qa.instanceId}::${qa.questionId}`');
    });

    it('keeps critical endo+billing coverage rules in fidelity audit', () => {
        const source = readFileSync(AUDIT_SCRIPT, 'utf-8');
        expect(source).toContain('endo_wl_method_missing');
        expect(source).toContain('endo_wf_technique_missing');
        expect(source).toContain('endo_irrigation_missing');
        expect(source).toContain('endo_medication_missing');
        expect(source).toContain('generic_free_text_answer_evidence');
        expect(source).toContain('GENERIC_FREE_TEXT_SKIP_KEY_FRAGMENTS');
        expect(source).toContain('billing_prefix_missing');
        expect(source).toContain('billing_prefix_forbidden');
    });

    it('keeps extraction runtime transparency and optional llm-required mode', () => {
        const source = readFileSync(AUDIT_SCRIPT, 'utf-8');
        expect(source).toContain("import 'dotenv/config'");
        expect(source).toContain('--require-llm-extraction');
        expect(source).toContain('--disable-firestore-kb');
        expect(source).toContain('extraction_not_llm');
        expect(source).toContain('extract_detail:');
        expect(source).toContain('extractionSummary');
    });
});
