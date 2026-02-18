# Hosted V10 Audit 20 Cases

- Date: 2026-02-18T07:19:15.015Z
- Base URL: http://localhost:4173
- Auth Mode: localBypass=true, forceRealAuth=false
- Cases: 2
- Summary: extraction.llm=0/2, preanalysis.llm=0/2, preanalysis.fallback=2/2, preanalysis.loginRequired=2/2

## S5 — PKV Endo warm
- Treatment/Insurance: endo / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Bitte Arbeitslängen pro Kanal angeben | Welche Spüllösungen wurden verwendet?NaOClEDTACHXNaClAndere | Wie viele Kanaele wurden behandelt? | Welche medikamentoese Einlage wurde verwendet?
- Askbacks (beantwortet): 4
- QA [free_text] ENDO_T1_WORKING_LENGTHS::tooth:11: Bitte Arbeitslängen pro Kanal angeben => {"K1":19,"K2":18,"K3":20}
- QA [free_text] endo_canal_count::tooth:11: Wie viele Kanaele wurden behandelt? => 3
- QA [free_text] endo_medication::tooth:11: Welche medikamentoese Einlage wurde verwendet? => Ca(OH)2
- QA [option] ENDO_T1_IRRIGATION::tooth:11: Welche Spüllösungen wurden verwendet?NaOClEDTACHXNaClAndere => NaOCl
- Billing: GOZ_2040, GOZ_2400, GOZ_2410, GOZ_2430, GOZ_2440, GOZ_5000
- Output excerpt: [BEFUND] Zahn 11 [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 1 Wurzelkanal. Anschließend Aufbereitung maschinell (rot
- Output fulltext:
```text
[BEFUND]

Zahn 11

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 1 Wurzelkanal. Anschließend Aufbereitung maschinell (rotierend). Daraufhin Spülung mit NaOCl. Anschließend Medikamentöse Einlage mit Ca(OH)₂. Daraufhin Wurzelfüllung in warmer vertikaler Kondensation. Anschließend Sealer verwendet. Daraufhin Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"K1":19,"K2":18,"K3":20}.

Klinische Zusatzinfo: Endo Arbeitslängenmethode: electronic; Endo Kanalanzahl: 1; Endo Spüllösungen: NaOCl; Endo Medikamentöse Einlage: Ca(OH)2; Endo Wurzelfülltechnik: warm.
Medikamentöse Einlage dokumentiert: Ca(OH)2.

[DURCHGEFÜHRTE LEISTUNGEN]

• Kofferdam.
• Elektr. AL.
• 1K.
• Ca(OH)₂ Einlage.
• WF warmvertikal.
• Rö-Kontrolle.
Kanalanzahl dokumentiert: 1.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Privatleistung (GOZ):
  2040 – Anlegen von Spanngummi (Kofferdam)
  2400 – Elektrometrische Längenbestimmung (Endometrie)
  2440 – Wurzelfüllung je Kanal
  2430 – Einlage medikamentös je Kanal
  2410 – Zusatz maschinelle Aufbereitung
  5000 – Röntgen: Intraorale Aufnahme
```

## S11 — GKV Extraktion + Füllung (Multi-Treatment)
- Treatment/Insurance: extraction / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Wundversorgung/Naht durchgeführt?JaNein
- Askbacks (beantwortet): 1
- QA [option] seg-1-1-1:tooth:28::wound_care::tooth:28: Wundversorgung/Naht durchgeführt?JaNein => Ja
- Billing: BEMA_12, BEMA_13, BEMA_40, BEMA_41A
- Output excerpt: Lokalanästhesie (Infiltration). Extraktion Zahn 28 durchgeführt. Wundversorgung durchgeführt. LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Kofferdam angelegt. Zahn 16 (O): Füllungstherapie. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.
- Output fulltext:
```text
Lokalanästhesie (Infiltration). Extraktion Zahn 28 durchgeführt. Wundversorgung durchgeführt.

LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Kofferdam angelegt. Zahn 16 (O): Füllungstherapie. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.
```

