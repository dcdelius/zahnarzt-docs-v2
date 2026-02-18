import type { TreatmentFacts } from './types';

export interface DocumentationEvidenceNotes {
    clinical: string[];
    patient: string[];
    administrative: string[];
}

function normalizeToken(value: string): string {
    return value
        .trim()
        .replace(/_+/g, ' ')
        .replace(/\s+/g, ' ');
}

function normalizeLine(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.replace(/[.;,\s]+$/g, '').trim();
}

function isMeaningfulValue(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return true;
    const text = String(value).trim().toLowerCase();
    if (!text) return false;
    if (text === 'unknown' || text === 'dokumentiert' || text === 'none') return false;
    return true;
}

function formatValue(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'ja' : 'nein';
    const normalized = normalizeToken(String(value));
    return normalized.replace(/[.;,\s]+$/g, '').trim();
}

function pushNote(target: string[], label: string, value: unknown): void {
    if (!isMeaningfulValue(value)) return;
    target.push(normalizeLine(`${label}: ${formatValue(value)}`));
}

function pushYesOnly(target: string[], line: string, value: unknown): void {
    if (!isMeaningfulValue(value)) return;
    const normalized = String(value).trim().toLowerCase();
    if (value === true || normalized === 'yes' || normalized === 'ja' || normalized === 'true') {
        target.push(normalizeLine(line));
    }
}

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

export function collectDocumentationEvidenceNotes(facts: TreatmentFacts): DocumentationEvidenceNotes {
    const clinical: string[] = [];

    pushNote(clinical, 'Röntgenindikation', facts.radiology?.indication);
    pushNote(clinical, 'Röntgentyp', facts.radiology?.type);
    pushNote(clinical, 'Röntgenzeitpunkt', facts.radiology?.timing);
    pushNote(clinical, 'Röntgenbefund', facts.radiology?.findings);

    pushNote(clinical, 'Endo Arbeitslängenmethode', facts.endo?.workingLengthMethod);
    pushNote(clinical, 'Endo Kanalanzahl', facts.endo?.canalCount);
    if (Array.isArray(facts.endo?.irrigationSolutions) && facts.endo.irrigationSolutions.length > 0) {
        pushNote(clinical, 'Endo Spüllösungen', facts.endo.irrigationSolutions.join(', '));
    }
    pushNote(clinical, 'Endo Medikamentöse Einlage', facts.endo?.medication);
    pushNote(clinical, 'Endo Wurzelfülltechnik', facts.endo?.wfTechnique);

    pushNote(clinical, 'Untersuchungsanlass', facts.untersuchung?.reason);
    pushNote(clinical, 'Untersuchungsbefunde', facts.untersuchung?.findings);
    pushNote(clinical, 'Untersuchungsbeurteilung', facts.untersuchung?.assessment);

    pushNote(clinical, 'Fissurenversiegelung Indikation', facts.fissurenversiegelung?.indication);
    pushNote(clinical, 'Fissurenversiegelung Material', facts.fissurenversiegelung?.material);

    pushNote(clinical, 'Parodontalphase', facts.parodontologie?.phase);
    pushNote(clinical, 'Parodontal UPT-Grad', facts.parodontologie?.uptGrade);

    pushNote(clinical, 'UPT-Grad', facts.upt?.grade);
    pushNote(clinical, 'UPT-Recallintervall', facts.upt?.interval);

    pushNote(clinical, 'Kronenart', facts.krone?.type);
    pushNote(clinical, 'Kroneneingliederung', facts.krone?.placement);
    pushNote(clinical, 'Teilkronenart', facts.teilkrone?.type);
    pushNote(clinical, 'Teilkroneneingliederung', facts.teilkrone?.placement);
    pushNote(clinical, 'Brückenart', facts.bruecke?.type);
    pushNote(clinical, 'Brückenphase', facts.bruecke?.phase);

    pushNote(clinical, 'WSR Zugang', facts.wsr?.zugang);
    pushNote(clinical, 'WSR Lokalisation', facts.wsr?.lokalisation);

    pushNote(clinical, 'Traumaart', facts.trauma?.art);
    pushNote(clinical, 'Trauma Schienung', facts.trauma?.schienung);
    pushNote(clinical, 'Trauma Verlaufskontrolle', facts.trauma?.kontrolle);

    pushNote(clinical, 'Implantatphase', facts.implant?.phase);
    pushNote(clinical, 'Implantat Nachsorge', facts.implant?.nachsorge);

    pushNote(clinical, 'Schienentyp', facts.schiene?.type);
    pushNote(clinical, 'Schienenphase', facts.schiene?.phase);

    pushNote(clinical, 'Teilprothesentyp', facts.teilprothese?.type);
    pushNote(clinical, 'Teilprothesenphase', facts.teilprothese?.phase);
    pushNote(clinical, 'Totalprothesentyp', facts.totalprothese?.type);
    pushNote(clinical, 'Totalprothesenphase', facts.totalprothese?.phase);

    pushYesOnly(clinical, 'PZR Zahnsteinentfernung dokumentiert', facts.pzr?.zahnsteinEntfernung);
    pushYesOnly(clinical, 'PZR Fluoridierung dokumentiert', facts.pzr?.fluoridation);
    pushYesOnly(clinical, 'Kronenpräparation dokumentiert', facts.crownPrep?.preparation);
    pushYesOnly(clinical, 'Präzisionsabformung dokumentiert', facts.crownPrep?.impression);
    pushYesOnly(clinical, 'Provisorische Versorgung dokumentiert', facts.crownPrep?.provisional);

    return {
        clinical: dedupe(clinical),
        patient: [],
        administrative: [],
    };
}
