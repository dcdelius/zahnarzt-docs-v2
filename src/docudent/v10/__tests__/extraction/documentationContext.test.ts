import { describe, expect, it } from 'vitest';

import {
    buildDocumentationContextFromExtraction,
    buildLabeledContextNotes,
    collectSharedForensicNotes,
    collectSharedUnresolvedNotes,
    createDocumentationContext,
    mergeNotesIntoDocumentationContext,
    resolveDocumentationContextMapping,
    syncDocumentationContextToExtraction,
} from '../../extraction/context/documentationContext';

describe('documentationContext SSOT', () => {
    it('builds context from legacy extraction fields and reasoning hints', () => {
        const context = buildDocumentationContextFromExtraction({
            klinischeZusatzinfos: ['Medikation: Apixaban'],
            patientenangaben: ['Patient berichtet Druckbeschwerden'],
            zusatzinfos: ['Termin nur vormittags'],
            reasoning: {
                forensicNotes: ['Sportunfall vor 2 Tagen'],
                unresolved: ['Recallintervall festlegen'],
            },
        });

        expect(context.clinical).toContain('Medikation: Apixaban');
        expect(context.patient).toContain('Patient berichtet Druckbeschwerden');
        expect(context.administrative).toContain('Termin nur vormittags');
        expect(context.forensicNotes).toContain('Sportunfall vor 2 Tagen');
        expect(context.unresolved).toContain('Recallintervall festlegen');
    });

    it('resolves context mapping keys consistently for camelCase and snake_case', () => {
        const camel = resolveDocumentationContextMapping('medicationChange');
        const snake = resolveDocumentationContextMapping('medication_change');
        expect(camel?.target).toBe('klinischeZusatzinfos');
        expect(snake?.target).toBe('klinischeZusatzinfos');
        expect(camel?.label).toBe('Medikationsaenderung');

        const notes = buildLabeledContextNotes(camel!, 'Marcumar pausiert');
        expect(notes).toEqual(['Medikationsaenderung: Marcumar pausiert']);
    });

    it('synchronizes structured context to legacy extraction fields and reasoning', () => {
        const extracted: Record<string, unknown> = {};
        const context = createDocumentationContext();
        mergeNotesIntoDocumentationContext(context, 'clinical', ['Allergien: Penicillin']);
        mergeNotesIntoDocumentationContext(context, 'patient', ['Familiaerer Kontext: Pflegefall zuhause']);
        mergeNotesIntoDocumentationContext(context, 'administrative', ['Organisatorischer Hinweis: nur morgens verfuegbar']);
        mergeNotesIntoDocumentationContext(context, 'forensicNotes', ['Sportunfall']);
        mergeNotesIntoDocumentationContext(context, 'unresolved', ['Kontrolle in 3 Monaten bestaetigen']);

        const applied = syncDocumentationContextToExtraction(extracted, context);

        expect(applied).toContain('documentationContext');
        expect(applied).toContain('klinischeZusatzinfos');
        expect(applied).toContain('patientenangaben');
        expect(applied).toContain('reasoning.unresolved');

        const patientenangaben = (extracted.patientenangaben as string[]) ?? [];
        expect(patientenangaben).toContain('Familiaerer Kontext: Pflegefall zuhause');
        expect(patientenangaben).toContain('Sportunfall');
        expect((extracted.reasoning as { unresolved?: string[] })?.unresolved).toContain('Kontrolle in 3 Monaten bestaetigen');
    });

    it('collects shared forensic and unresolved notes from alias keys', () => {
        const shared = {
            forensicNotes: ['seit letzter Fuellung empfindlich'],
            context_notes: ['beruflich im Ausland'],
            unresolved_forensic_hints: ['Laengenangabe bestaetigen'],
        };

        expect(collectSharedForensicNotes(shared)).toEqual([
            'seit letzter Fuellung empfindlich',
            'beruflich im Ausland',
        ]);
        expect(collectSharedUnresolvedNotes(shared)).toEqual([
            'Laengenangabe bestaetigen',
        ]);
    });
});

