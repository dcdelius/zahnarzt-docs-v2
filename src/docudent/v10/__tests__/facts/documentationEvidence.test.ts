import { describe, expect, it } from 'vitest';
import { collectDocumentationEvidenceNotes } from '../../facts/documentationEvidence';
import type { TreatmentFacts } from '../../facts/types';

describe('documentationEvidence', () => {
    it('collects meaningful treatment detail notes and preserves interval tokens', () => {
        const facts = {
            treatmentId: 'upt',
            cariesDepth: 'unknown',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
            upt: { grade: 'b', interval: '3-4_monate' },
            untersuchung: { findings: 'klinisch unauffaellig' },
            wsr: { lokalisation: 'front_praemolar' },
        } as TreatmentFacts;

        const notes = collectDocumentationEvidenceNotes(facts);
        expect(notes.clinical).toContain('UPT-Grad: b');
        expect(notes.clinical).toContain('UPT-Recallintervall: 3-4 monate');
        expect(notes.clinical).toContain('Untersuchungsbefunde: klinisch unauffaellig');
        expect(notes.clinical).toContain('WSR Lokalisation: front praemolar');
    });

    it('filters unknown placeholder values', () => {
        const facts = {
            treatmentId: 'untersuchung',
            cariesDepth: 'unknown',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
            untersuchung: { findings: 'unknown', reason: 'dokumentiert' },
            upt: { interval: 'unknown' },
        } as TreatmentFacts;

        const notes = collectDocumentationEvidenceNotes(facts);
        expect(notes.clinical).toEqual([]);
    });
});
