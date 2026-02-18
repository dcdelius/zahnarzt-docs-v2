/**
 * LLM Prompt Contracts (runtime-agnostic)
 *
 * Central builders for system prompts used by preanalysis/extraction.
 * Keep this layer pure so V10 and core services can reuse the same prompt contract.
 */

export interface PreanalysisPromptConfig {
    version: string;
    treatmentIds: readonly string[];
    uncertaintyCodes: readonly string[];
}

export const EXTRACTION_PROMPT_CONTRACT_VERSION = '1.2.0';

function toPipeList(values: readonly string[]): string {
    return values.join('|');
}

const REASONED_FACT_HINT_KEYS = [
    'anesthesia',
    'kofferdam',
    'material',
    'vitality',
    'percussion',
    'capping',
    'working_length',
    'working_length_method',
    'wf_technique',
    'root_canals',
    'irrigation_solutions',
    'endo_medication',
    'temp_closure',
    'endo_step',
    'endo_phase',
    'radiology_indication',
    'radiology_type',
    'radiology_timing',
    'radiology_findings',
    'sensitivity_followup',
] as const;

const CONTEXT_FACT_HINT_KEYS = [
    'current_medication',
    'medication_change',
    'allergies',
    'comorbidities',
    'anticoagulation',
    'immunosuppression',
    'pregnancy_status',
    'infectious_risk',
    'patient_concern',
    'patient_goal',
    'adherence_issue',
    'family_context',
    'social_context',
    'previous_treatment_outcome',
    'followup_need',
    'administrative_note',
] as const;

const ALL_REASONED_FACT_HINT_KEYS = [
    ...REASONED_FACT_HINT_KEYS,
    ...CONTEXT_FACT_HINT_KEYS,
] as const;

const TREATMENT_SIGNAL_GUIDE = [
    '- fuellung: komposit, adh(a)esiv, schichten, matrix, ausarbeitung, politur',
    '- endo: trepanation, wurzelkanal, naocl, edta, ledermix, ca(oh)2, arbeitslaenge, obturation',
    '- extraction: luxation, extraktion, alveole, kuerettage, naht, blutstillung',
    '- pzr: zahnsteinentfernung, airflow/pulverstrahl, politur, fluoridierung',
    '- crown_prep: praeparation, beschliff, abformung/scan, provisorium',
    '- ueberkappung: cp, p, direkte/indirekte ueberkappung, pulpaeroeffnung',
    '- fissurenversiegelung: versiegelung, fissuren, sealant',
    '- parodontologie/upt: parodontalstatus, taschen, geschlossene/open curettage, recall/upt',
    '- wsr: wurzelspitzenresektion, apikoektomie, retrograd',
    '- trauma: zahntrauma, avulsion, replantation, schienung',
    '- implant: implantation, inserat, freilegung, einheilung',
    '- krone/teilkrone/bruecke: praeparation, einprobe, eingliederung, zementierung',
    '- teilprothese/totalprothese: abformung, bissnahme, einprobe, eingliederung',
    '- schiene: aufbiss/okklusionsschiene, anpassung, kontrolle',
    '- untersuchung: anamese, befund, kontrolle, therapieplanung',
    '- roentgen: opg, zahnfilm, bissfluegel, 3d, indikation, befund',
].join('\n');

const CONTEXT_ANALYSIS_GUIDE = [
    '- Medikation: aktuelle Medikation, Aenderungen, relevante Wirkstoffgruppen (z.B. Antikoagulation)',
    '- Risiken/Anamnese: Allergien, Begleiterkrankungen, Immunsuppression, Schwangerschaft, Infektionshinweise',
    '- Patientenkontext: Beschwerden seit Vorbehandlung, Patientenwunsch, Adhaerenz, familiaere/soziale Ereignisse',
    '- Verlauf: Ergebnis frueherer Sitzungen, persistierende Symptome, Recall-/Kontrollbedarf',
    '- Organisation: nur verwertbare organisatorische Hinweise (z.B. Reise, Terminrestriktion) ohne Billing-Ableitung',
].join('\n');

export function buildPreanalysisPrompt(config: PreanalysisPromptConfig): string {
    return `Du strukturierst zahnmedizinische Fliesstext-Diktate in Behandlungs-Intents.
Antworte NUR als JSON mit diesem Schema:
{
  "version": "${config.version}",
  "dictation": "<original>",
  "needsConfirmation": true|false,
  "intents": [
    {
      "intentId": "string",
      "treatmentId": "${toPipeList(config.treatmentIds)}",
      "tooth": "string optional",
      "phase": "string optional",
      "step": "string optional",
      "sharedFacts": { "key": "value optional" },
      "confidence": 0..1,
      "evidenceSpans": [{ "start": number, "end": number, "text": "string" }],
      "uncertainty": "${toPipeList(config.uncertaintyCodes)} optional"
    }
  ]
}
Regeln:
- Keine Erfindungen.
- Jeder Intent braucht mindestens einen evidenceSpan.
- Wenn unsicher: needsConfirmation=true.
- Wenn uncertainty gesetzt ist, muss needsConfirmation=true sein.
- Wenn tooth fehlt, uncertainty setzen (z.B. missing_tooth_reference).
- Keine Billing-Codes/Felder ausgeben (z.B. BEMA/GOZ/GOAE/GOAe/BEL, billingCodes, billingRefs).
- Nur treatmentIds verwenden, die im Schema stehen.
- phase/step setzen, wenn im Diktat ein Behandlungsschritt erkennbar ist (z.B. Erstbehandlung, Revision, Einlagewechsel, Definitivversorgung).
- sharedFacts nur fuer verwertbare, nicht-billingbezogene medizinische Fakten nutzen.
- Fuer sharedFacts bevorzugte Keys: ${ALL_REASONED_FACT_HINT_KEYS.join(', ')}.
- Kontext-Cues fuer treatmentId-Vorsortierung:
${TREATMENT_SIGNAL_GUIDE}
- Zusaetzliche Kontextdimensionen (ohne neue Phantom-Intents):
${CONTEXT_ANALYSIS_GUIDE}
- Prothetische Disambiguierung:
- "Praeparation/Beschliff/Abformung/Provisorium" => crown_prep
- "definitiv eingegliedert/eingesetzt/zementiert" bei Krone/Teilkrone/Bruecke => krone/teilkrone/bruecke (nicht crown_prep)
- Bei kontextueller Zuordnung ohne direkte Nennung confidence senken und uncertainty setzen.
- Historische Verlaufsangaben ohne aktuelle Intervention (z.B. "seit letzter Fuellung weiter empfindlich") NICHT als neue aktive Behandlung ausgeben; stattdessen als sharedFacts.forensicNotes beim passenden Intent dokumentieren.`;
}

export function buildExtractionPromptV1(): string {
    return `Du bist ein hochpraeziser Extraktions-Assistent fuer zahnaerztliche Diktate (Deutschland).
Ziel: maximale strukturelle Qualitaet bei strikter Evidenztreue.
Antworte NUR mit einem JSON-Objekt, keine Erklaerungen, kein Markdown.

Ausgabeschema (nur diese Felder):
- tooth: Zahnnummer (z.B. "36", "15") oder null
- teeth: Array aller explizit genannten Zahnnummern (z.B. ["24","27"]) oder []
- surfaces: Array von Flaechen ["m", "o", "d", "b", "l", "i"] oder []
- diagnosis: Diagnose (z.B. "Caries profunda", "Caries media") oder null
- costs: Kosten in Euro als Zahl oder null
- klinischeZusatzinfos: Array kurzer medizinischer Stichpunkte oder []
- patientenangaben: Array kurzer patientenseitiger Angaben oder []
- zusatzinfos: (legacy) Array kurzer Stichpunkte, falls keine klare Zuordnung moeglich
- mentioned.anesthesia: { type: "infiltr"|"leitung"|"keine", confidence: 0-1 } oder undefined
- mentioned.kofferdam: true/false oder undefined
- mentioned.capping: { type: "cp"|"p"|"none" } oder undefined
- mentioned.material: String oder undefined
- mentioned.vitality: "+"| "-" oder undefined
- mentioned.percussion: "+"| "-" oder undefined
- reasoning.intentHints: Array optionaler Hinweise:
  [{ treatmentId, confidence: 0-1, basis: "explicit"|"inferred", evidence: string[], tooth?: string, phase?: string, step?: string }]
- reasoning.factHints: Array optionaler Hinweise:
  [{ key, value, confidence: 0-1, basis: "explicit"|"inferred", evidence: string[], requiresConfirmation?: boolean }]
- reasoning.forensicNotes: Array forensisch relevanter Kontextinfos (nur explizite Fakten)
- reasoning.unresolved: Array offener Punkte fuer Rueckfragen

Arbeitslogik (intern anwenden, nicht ausgeben):
1) Clause-Level Kontextklassifikation:
- ACTIVE_PROCEDURE: aktuelle Massnahme/Intervention in dieser Sitzung
- HISTORICAL_CONTEXT: Verlauf/Anamnese/Nachsymptomatik ohne aktuelle Intervention
- PLAN_ONLY: reine Absicht/Plan ohne Durchfuehrung
2) Mapping-Regel:
- Nur ACTIVE_PROCEDURE darf strukturtragende Felder treiben (tooth/surfaces/mentioned/diagnosis/intentHints).
- HISTORICAL_CONTEXT gehoert in patientenangaben und/oder reasoning.forensicNotes.
- PLAN_ONLY gehoert in reasoning.unresolved (wenn rueckfragepflichtig).
3) Evidenzdisziplin:
- Jedes reasoning-Item braucht evidence.
- basis="explicit" nur bei direkter Nennung; sonst "inferred".
- inferred nie als harte Strukturfakten ausgeben.

Fachregeln:
1. Strukturfelder (tooth/teeth/surfaces/diagnosis/mentioned/zusatzinfos) nur mit expliziter Evidenz befuellen
2. Bei "tief" oder "profunda" -> diagnosis: "Caries profunda"
3. Diagnose nur setzen, wenn sie im Diktat wirklich belegt ist; bei Unsicherheit diagnosis = null
4. "Sekundaerkaries" alleine bedeutet NICHT automatisch "Caries profunda"
5. Endodontische Hinweise (z.B. NaOCl, EDTA, Ca(OH)2, Trepanation, Arbeitslaenge) als klinischeZusatzinfos erfassen, wenn explizit genannt
6. Wenn mehrere Zaehne genannt sind und kein klarer Hauptzahn ableitbar ist: tooth = null, teeth aber befuellen
7. "mod" = ["m", "o", "d"], "ob" = ["o", "b"], etc.
8. klinischeZusatzinfos nur bei expliziter, medizinisch relevanter Zusatzinfo (kurz, neutral, keine Mutmassungen)
9. patientenangaben nur bei expliziter Patientenangabe (kurz, neutral, keine Mutmassungen)
10. zusatzinfos nur wenn keine klare Zuordnung moeglich ist
11. KEINE Annahmen ueber nicht erwaehnte Felder
12. reasoning.intentHints/factHints sind optional und duerfen NUR mit evidence befuellt werden
13. basis="explicit" nur wenn direkt gesagt; sonst basis="inferred"
14. inferred Hinweise nie als sichere Fakten ausgeben; bei Unsicherheit requiresConfirmation=true setzen
15. Inferenz ist erlaubt, aber NUR in reasoning.intentHints/factHints (nie direkt in Strukturfelder)
16. Fuer reasoning.factHints bevorzugte keys: ${REASONED_FACT_HINT_KEYS.join(', ')}
17. Kontext-Cues fuer reasoning.intentHints (behandlungsuebergreifend):
${TREATMENT_SIGNAL_GUIDE}
18. Kontextdimensionen zusaetzlich immer pruefen:
${CONTEXT_ANALYSIS_GUIDE}
19. Fuer Kontext-FactHints bevorzugte keys: ${CONTEXT_FACT_HINT_KEYS.join(', ')}
19b. Prothetische Disambiguierung:
- Praeparation/Abformung/Provisorium = Vorbereitung (crown_prep)
- definitive Eingliederung/Zementierung einer Krone/Teilkrone/Bruecke = entsprechende definitive Behandlung
20. Historische Beschwerden ohne aktuelle Massnahme (z.B. "seit letzter Fuellung empfindlich") als reasoning.forensicNotes/patientenangaben erfassen, nicht als neue aktive Behandlung.
21. Beispielregel: "Zahn 24 heute Fuellung gelegt ... Zahn 36 seit letzter Fuellung empfindlich" => aktive Behandlung bei Zahn 24, Verlaufshinweis Zahn 36 nur als Kontext.
22. Mapping fuer nicht-prozedurale Informationen:
- medizinisch/risikorelevant -> klinischeZusatzinfos (kurz, neutral)
- patientenseitig/psychosozial -> patientenangaben (kurz, neutral)
- nur organisatorisch/sonstig -> zusatzinfos
23. Keine relevanten Kontextinfos verlieren: wenn keine sichere Zuordnung zu Behandlung, dann mindestens in reasoning.forensicNotes oder einem der Kontext-Arrays sichern.
24. Kontext als Arrays mit kurzen Stichpunkten ausgeben, keine langen Fliesstext-Absaetze.
25. Kontext-Eintraege (klinischeZusatzinfos/patientenangaben/zusatzinfos/reasoning.forensicNotes) moeglichst wortnah aus dem Diktat uebernehmen; keine freie Synonymisierung.
26. Forensisch starke Triggerbegriffe unveraendert erhalten (z.B. "Sportunfall", "Provisorium", "beruflich ins Ausland", "nur morgens verfuegbar").
27. Zeitbezug und Kausalbezug aus dem Diktat nicht umformulieren (z.B. "seit letzter Fuellung", "nach Vorbehandlung", "heute").

JSON-Antwort:`;
}
