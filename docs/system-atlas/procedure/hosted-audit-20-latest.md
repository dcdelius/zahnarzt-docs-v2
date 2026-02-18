# Hosted V10 Audit 20 Cases

- Date: 2026-02-18T07:27:00.796Z
- Base URL: http://localhost:4173
- Auth Mode: localBypass=true, forceRealAuth=false
- Cases: 20
- Summary: extraction.llm=0/20, preanalysis.llm=0/20, preanalysis.fallback=20/20, preanalysis.loginRequired=20/20

## S1 — GKV Füllung MOD
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: BEMA_12B, BEMA_13C, BEMA_41A
- Output excerpt: [BEFUND] Zahn 36. MOD [AUFKLÄRUNG] Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunächst Leitungsanästhesie N. alv. inf. (Ultracain D-S, A
- Output fulltext:
```text
[BEFUND]

Zahn 36. MOD

[AUFKLÄRUNG]

Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst Leitungsanästhesie N. alv. inf. (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Daraufhin Kofferdam angelegt. Im Weiteren Zahn 36 (MOD): Füllungstherapie. Anschließend Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Abschließend Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.

[DURCHGEFÜHRTE LEISTUNGEN]

• LA Leitung.
• Kofferdam.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen.

[ABRECHNUNG]

Kassenleistung (BEMA):
  41a – Leitungsanästhesie, intraoral
  12 – Besondere Maßnahmen beim Präparieren oder Füllen (Separieren, Beseitigen störenden Zahnfleisches, Anlegen von Spanngummi, Stillung einer übermäßigen Papillenblutung), je Sitzung, je Kieferhälfte oder Frontzahnbereich
  13c – Füllung dreiflächig
```

## S2 — GKV+MKV Füllung mit Mehrkosten
- Treatment/Insurance: fuellung / GKV+MKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Mehrkostenbetrag (Patientenanteil)? | Mehrkosten-Begründung?Mehrschichttechnik (adhäsiv)Ästhetik / Materialwahl (Patientenwunsch)Keine Mehrkosten (nur Kasse)
- Askbacks (beantwortet): 2
- QA [free_text] mkv_betrag::tooth:16: Mehrkostenbetrag (Patientenanteil)? => 150
- QA [option] fuellung_mkv_justification::tooth:16: Mehrkosten-Begründung?Mehrschichttechnik (adhäsiv)Ästhetik / Materialwahl (Patientenwunsch)Keine Mehrkosten (nur Kasse) => Mehrschichttechnik (adhäsiv)
- Billing: BEMA_12B, BEMA_13B, GOZ_2080
- Output excerpt: [BEFUND] Zahn 16. OD [AUFKLÄRUNG] Über die Mehrkosten der Mehrschichttechnik und/oder Adhäsivtechnik wurde aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. Es wurde eine Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V geschlossen. Die Zuzahlung fü
- Output fulltext:
```text
[BEFUND]

Zahn 16. OD

[AUFKLÄRUNG]

Über die Mehrkosten der Mehrschichttechnik und/oder Adhäsivtechnik wurde aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. Es wurde eine Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V geschlossen. Die Zuzahlung für die über den Kassenanteil hinausgehenden Leistungen wurde erläutert und vom Patienten akzeptiert.
Mehrkostenbegründung: mehrschicht.
Mehrkostenbetrag dokumentiert: 150.00 EUR.

[BEHANDLUNGSABLAUF]

Initial Kofferdam angelegt. Im Weiteren Zahn 16 (OD): Füllungstherapie. Anschließend Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Daraufhin Höherwertige Versorgung mit Mehrkostenvereinbarung (§ 28 SGB V). Abschließend Mehrkosten-Begründung: mehrschicht.

[DURCHGEFÜHRTE LEISTUNGEN]

• Kofferdam.
• Komposit Mehrschichttechnik.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Kassenleistung (BEMA):
  12 – Besondere Maßnahmen beim Präparieren oder Füllen (Separieren, Beseitigen störenden Zahnfleisches, Anlegen von Spanngummi, Stillung einer übermäßigen Papillenblutung), je Sitzung, je Kieferhälfte oder Frontzahnbereich
  13b – Füllung zweiflächig
Privatleistung (GOZ):
  2080 – Kompositfüllung zweiflächig in Adhäsivtechnik
[MKV-Validierung] Mehrschichttechnik dokumentiert.

Zuzahlung lt. Mehrkostenvereinbarung
```

## S3 — PKV Füllung
- Treatment/Insurance: fuellung / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: GOZ_0090, GOZ_2040, GOZ_2120
- Output excerpt: [BEFUND] Zahn 45. MODB [AUFKLÄRUNG] Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunächst LA Infiltration (Ultracain D-S, Articain 4% + Ad
- Output fulltext:
```text
[BEFUND]

Zahn 45. MODB

[AUFKLÄRUNG]

Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Daraufhin Kofferdam angelegt. Im Weiteren Zahn 45 (MODB): Füllungstherapie. Anschließend Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Zum Schluss Kontaktpunkt geprüft.

[DURCHGEFÜHRTE LEISTUNGEN]

• LA Infiltr.
• Kofferdam.
• Komposit Mehrschichttechnik.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen.

[ABRECHNUNG]

Privatleistung (GOZ):
  0090 – Infiltrationsanästhesie
  2040 – Anlegen von Spanngummi (Kofferdam)
  2120 – Kompositfüllung mehr als dreiflächig
```

## S4 — GKV Endo mit Einlage
- Treatment/Insurance: endo / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-multi-treatment-signals:1:endo|roentgen
- Askbacks (erkannt): none
- Askbacks (beantwortet): 3
- QA [free_text] ENDO_T1_WORKING_LENGTHS::tooth:46: Bitte Arbeitslängen pro Kanal angeben => {"K1":19,"K2":18,"K3":17}
- QA [free_text] endo_canal_count::tooth:46: Wie viele Kanaele wurden behandelt? => 3
- QA [option] medical_wf_technique::tooth:46: Welche Wurzelfuelltechnik wurde verwendet?Warm vertikalKalt lateralEinzelstift => Warm vertikal
- Billing: BEMA_12B, BEMA_31B, BEMA_32B, BEMA_34B, BEMA_35B, BEMA_Ä925A
- Output excerpt: [BEFUND] Zahn 46 [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunächst Kofferdam angelegt. Daraufhin Trepanation der Pulpakammer. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 3 Wurzelkanälen.
- Output fulltext:
```text
[BEFUND]

Zahn 46

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst Kofferdam angelegt. Daraufhin Trepanation der Pulpakammer. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 3 Wurzelkanälen. Anschließend Spülung mit NaOCl. Daraufhin Spülung mit EDTA. Anschließend Medikamentöse Einlage mit Ca(OH)₂. Daraufhin Provisorischer Verschluss. Anschließend Wurzelfüllung in warmer vertikaler Kondensation. Daraufhin Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"K1":19,"K2":18,"K3":17}.

Klinische Zusatzinfo: Endo Arbeitslängenmethode: electronic; Endo Kanalanzahl: 3; Endo Spüllösungen: NaOCl, EDTA; Endo Medikamentöse Einlage: Ca(OH)2; Endo Wurzelfülltechnik: warm.
Medikamentöse Einlage dokumentiert: Ca(OH)2.

[DURCHGEFÜHRTE LEISTUNGEN]

• Kofferdam.
• Trep.
• Elektr. AL.
• 3K.
• Ca(OH)₂ Einlage.
• WF warmvertikal.
• Rö-Kontrolle.
Kanalanzahl dokumentiert: 3.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Kassenleistung (BEMA):
  12 – Besondere Maßnahmen beim Präparieren oder Füllen (Separieren, Beseitigen störenden Zahnfleisches, Anlegen von Spanngummi, Stillung einer übermäßigen Papillenblutung), je Sitzung, je Kieferhälfte oder Frontzahnbereich
  34 – Medikamentöse Einlage (Med)
  35 – Wurzelfüllung
  32 – Wurzelkanalbehandlung (Aufbereitung)
  Ä925a – Röntgen: Aufnahme je Projektion
  31 – Trepanation (Trep)
```

## S5 — PKV Endo warm
- Treatment/Insurance: endo / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Bitte Arbeitslängen pro Kanal angeben | Welche Spüllösungen wurden verwendet?NaOClEDTACHXNaClAndere | Wie viele Kanaele wurden behandelt? | Welche medikamentoese Einlage wurde verwendet?
- Askbacks (beantwortet): 4
- QA [free_text] ENDO_T1_WORKING_LENGTHS::tooth:11: Bitte Arbeitslängen pro Kanal angeben => {"K1":19}
- QA [free_text] endo_canal_count::tooth:11: Wie viele Kanaele wurden behandelt? => 1
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

Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 1 Wurzelkanal. Anschließend Aufbereitung maschinell (rotierend). Daraufhin Spülung mit NaOCl. Anschließend Medikamentöse Einlage mit Ca(OH)₂. Daraufhin Wurzelfüllung in warmer vertikaler Kondensation. Anschließend Sealer verwendet. Daraufhin Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"K1":19}.

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

## S6 — Multitooth GKV
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-skipped-no-treatment-signal:2 | tooth-context-ambiguous | ambiguous-untoothed-intent-demoted:seg-3-1-1:fuellung | ambiguous-untoothed-note-attached:seg-1-1-2
- Askbacks (erkannt): Welches Füllungsmaterial?KompositGlasionomerzement (GIZ)
- Askbacks (beantwortet): 1
- QA [option] seg-1-1-2:tooth:14::fuellung_material::tooth:14: Welches Füllungsmaterial?KompositGlasionomerzement (GIZ) => Komposit
- Billing: BEMA_13, BEMA_12, BEMA_13B
- Output excerpt: Kofferdam angelegt. Zahn 36 (OD): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Zahn 14 (O): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgefü
- Output fulltext:
```text
Kofferdam angelegt. Zahn 36 (OD): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

Zahn 14 (O): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.
```

## S7 — GKV Füllung mit tiefer Karies
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Überkappung durchgeführt?Ja, indirekt (Cp)Ja, direkt (P)Nein
- Askbacks (beantwortet): 2
- QA [option] medical_ueberkappung::tooth:26: Überkappung durchgeführt?Ja, indirekt (Cp)Ja, direkt (P)Nein => Ja, indirekt (Cp)
- QA [option] medical_ueberkappung_material::tooth:26: Überkappungsmaterial?Ca(OH)₂MTABiodentine => Ca(OH)₂
- Billing: BEMA_12B, BEMA_13B, BEMA_25B
- Output excerpt: [BEFUND] Zahn 26. O. Caries profunda [AUFKLÄRUNG] Bei der Überkappung wurde über das Risiko eines späteren Vitalitätsverlusts aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zu Beginn Kofferdam angelegt. Anschließend Pulpana
- Output fulltext:
```text
[BEFUND]

Zahn 26. O. Caries profunda

[AUFKLÄRUNG]

Bei der Überkappung wurde über das Risiko eines späteren Vitalitätsverlusts aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zu Beginn Kofferdam angelegt. Anschließend Pulpanahe Exkavation, indirekte Überkappung mit Ca(OH)₂. Daraufhin Zahn 26 (O): Füllungstherapie tief (caries profunda). Zum Schluss Füllung mit lichthärtendem Komposit (komposit) durchgeführt.
Überkappung durchgeführt (Ca(OH)₂).

[DURCHGEFÜHRTE LEISTUNGEN]

• Kofferdam.
• Cp (Ca(OH)₂).

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Kassenleistung (BEMA):
  12 – Besondere Maßnahmen beim Präparieren oder Füllen (Separieren, Beseitigen störenden Zahnfleisches, Anlegen von Spanngummi, Stillung einer übermäßigen Papillenblutung), je Sitzung, je Kieferhälfte oder Frontzahnbereich
  13 – Füllung einflächig
  25 – Indirekte Überkappung (Cp)
```

## S8 — PKV Füllung Frontzahn
- Treatment/Insurance: fuellung / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: GOZ_2080
- Output excerpt: [BEFUND] Zahn 11. OB [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zu Beginn Adhäsivsystem Adhäsiv appliziert. Anschließend Zahn 11 (OB): Füllungstherapie. Daraufhin Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrs
- Output fulltext:
```text
[BEFUND]

Zahn 11. OB

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zu Beginn Adhäsivsystem Adhäsiv appliziert. Anschließend Zahn 11 (OB): Füllungstherapie. Daraufhin Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Abschließend Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.

[DURCHGEFÜHRTE LEISTUNGEN]

• Komposit Mehrschichttechnik.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Privatleistung (GOZ):
  2080 – Kompositfüllung zweiflächig in Adhäsivtechnik
```

## S9 — GKV Endo Revision akut
- Treatment/Insurance: endo / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Bitte Arbeitslängen pro Kanal angeben | Wie viele Kanaele wurden behandelt? | Welche Isolation?KofferdamRelative Trockenlegung | Welche medikamentoese Einlage wurde verwendet? | Welche Wurzelfuelltechnik wurde verwendet?Warm vertikalKalt lateralEinzelstift
- Askbacks (beantwortet): 5
- QA [free_text] ENDO_T1_WORKING_LENGTHS::tooth:36: Bitte Arbeitslängen pro Kanal angeben => {"K1":19,"K2":18,"K3":17}
- QA [free_text] endo_canal_count::tooth:36: Wie viele Kanaele wurden behandelt? => 3
- QA [free_text] endo_medication::tooth:36: Welche medikamentoese Einlage wurde verwendet? => Ca(OH)2
- QA [option] medical_isolation::tooth:36: Welche Isolation?KofferdamRelative Trockenlegung => Kofferdam
- QA [option] medical_wf_technique::tooth:36: Welche Wurzelfuelltechnik wurde verwendet?Warm vertikalKalt lateralEinzelstift => Warm vertikal
- Billing: BEMA_12B, BEMA_31B, BEMA_32B, BEMA_34B, BEMA_35B, BEMA_Ä925A
- Output excerpt: [BEFUND] Zahn 36 [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunächst Kofferdam angelegt. Daraufhin Trepanation der Pulpakammer. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 3 Wurzelkanälen.
- Output fulltext:
```text
[BEFUND]

Zahn 36

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst Kofferdam angelegt. Daraufhin Trepanation der Pulpakammer. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 3 Wurzelkanälen. Anschließend Spülung mit NaOCl. Daraufhin Spülung mit EDTA. Anschließend Medikamentöse Einlage mit Ca(OH)₂. Daraufhin Provisorischer Verschluss. Anschließend Wurzelfüllung in warmer vertikaler Kondensation. Daraufhin Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"K1":19,"K2":18,"K3":17}.

Klinische Zusatzinfo: Endo Arbeitslängenmethode: electronic; Endo Kanalanzahl: 3; Endo Spüllösungen: NaOCl, EDTA; Endo Medikamentöse Einlage: Ca(OH)2; Endo Wurzelfülltechnik: warm.
Medikamentöse Einlage dokumentiert: Ca(OH)2.

[DURCHGEFÜHRTE LEISTUNGEN]

• Kofferdam.
• Trep.
• Elektr. AL.
• 3K.
• Ca(OH)₂ Einlage.
• WF warmvertikal.
• Rö-Kontrolle.
Kanalanzahl dokumentiert: 3.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Kassenleistung (BEMA):
  12 – Besondere Maßnahmen beim Präparieren oder Füllen (Separieren, Beseitigen störenden Zahnfleisches, Anlegen von Spanngummi, Stillung einer übermäßigen Papillenblutung), je Sitzung, je Kieferhälfte oder Frontzahnbereich
  34 – Medikamentöse Einlage (Med)
  35 – Wurzelfüllung
  32 – Wurzelkanalbehandlung (Aufbereitung)
  Ä925a – Röntgen: Aufnahme je Projektion
  31 – Trepanation (Trep)
```

## S10 — PKV Endo mit Dokumentation
- Treatment/Insurance: endo / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Wie viele Kanaele wurden behandelt? | Welche Spuelloesungen wurden verwendet?NaOCl + EDTANaOClEDTACHXKeine | Welche medikamentoese Einlage wurde verwendet? | Welche Wurzelfuelltechnik wurde verwendet?Warm vertikalKalt lateralEinzelstift
- Askbacks (beantwortet): 4
- QA [free_text] endo_canal_count::tooth:21: Wie viele Kanaele wurden behandelt? => 1
- QA [free_text] endo_medication::tooth:21: Welche medikamentoese Einlage wurde verwendet? => Ca(OH)2
- QA [option] medical_endo_irrigation::tooth:21: Welche Spuelloesungen wurden verwendet?NaOCl + EDTANaOClEDTACHXKeine => NaOCl + EDTA
- QA [option] medical_wf_technique::tooth:21: Welche Wurzelfuelltechnik wurde verwendet?Warm vertikalKalt lateralEinzelstift => Warm vertikal
- Billing: GOZ_2040, GOZ_2400, GOZ_2410, GOZ_2430, GOZ_2440, GOZ_5000
- Output excerpt: [BEFUND] Zahn 21 [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 1 Wurzelkanal. Anschließend Spülung mit NaOCl. Daraufhin
- Output fulltext:
```text
[BEFUND]

Zahn 21

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 1 Wurzelkanal. Anschließend Spülung mit NaOCl. Daraufhin Spülung mit EDTA. Anschließend Medikamentöse Einlage mit Ca(OH)₂. Daraufhin Wurzelfüllung in warmer vertikaler Kondensation. Abschließend Röntgenkontrolle post WF.

Klinische Zusatzinfo: Endo Arbeitslängenmethode: electronic; Endo Kanalanzahl: 1; Endo Spüllösungen: NaOCl, EDTA; Endo Medikamentöse Einlage: Ca(OH)2; Endo Wurzelfülltechnik: warm.
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

## S12 — PKV Kronenpräparation
- Treatment/Insurance: crown_prep / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: GOZ_2210, GOZ_2260, GOZ_5000
- Output excerpt: [BEHANDLUNGSABLAUF] Zunaechst Zahn 16: Kronenpräparation durchgeführt. Anschliessend Zahn 16: Präzisionsabformung durchgeführt. Abschliessend Zahn 16: Provisorische Versorgung. Klinische Zusatzinfo: Kronenpräparation dokumentiert; Präzisionsabformung dokumentiert; Provisorische Versorgung dokumentiert. [DURCHGEFUEHRTE 
- Output fulltext:
```text
[BEHANDLUNGSABLAUF]

Zunaechst Zahn 16: Kronenpräparation durchgeführt. Anschliessend Zahn 16: Präzisionsabformung durchgeführt. Abschliessend Zahn 16: Provisorische Versorgung.

Klinische Zusatzinfo: Kronenpräparation dokumentiert; Präzisionsabformung dokumentiert; Provisorische Versorgung dokumentiert.

[DURCHGEFUEHRTE LEISTUNGEN]

• Zahn 16: Präparation durchgeführt.
• Zahn 16: Abformung.
• Zahn 16: Provisorium.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Privatleistung (GOZ):
  2210 – Vollkrone (Hohlkehl- oder Stufenpräparation)
  5000 – Röntgen: Intraorale Aufnahme
  2260 – Provisorium direktes Verfahren ohne Abformung
```

## S13 — GKV Füllung nur Kasse
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-skipped-no-treatment-signal:2 | segment-context-note-attached:2
- Askbacks (erkannt): none
- Askbacks (beantwortet): 1
- QA [option] fuellung_material::tooth:27: Welches Füllungsmaterial?KompositGlasionomerzement (GIZ) => Komposit
- Billing: BEMA_13B, BEMA_40B
- Output excerpt: [BEFUND] Zahn 27. O [AUFKLÄRUNG] Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Es wurde ausschließlich eine Kassenleistung erbracht. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunäch
- Output fulltext:
```text
[BEFUND]

Zahn 27. O

[AUFKLÄRUNG]

Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Es wurde ausschließlich eine Kassenleistung erbracht. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Daraufhin Zahn 27 (O): Füllungstherapie. Im Weiteren Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Abschließend Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.

[DURCHGEFÜHRTE LEISTUNGEN]

• LA Infiltr.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen.

[ABRECHNUNG]

Kassenleistung (BEMA):
  40 – Infiltrationsanästhesie
  13 – Füllung einflächig
```

## S14 — GKV+MKV Füllung Mehrschicht
- Treatment/Insurance: fuellung / GKV+MKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-skipped-no-treatment-signal:2
- Askbacks (erkannt): Mehrkostenbetrag (Patientenanteil)? | Mehrkosten-Begründung?Mehrschichttechnik (adhäsiv)Ästhetik / Materialwahl (Patientenwunsch)Keine Mehrkosten (nur Kasse)
- Askbacks (beantwortet): 2
- QA [free_text] mkv_betrag::tooth:36: Mehrkostenbetrag (Patientenanteil)? => 150
- QA [option] fuellung_mkv_justification::tooth:36: Mehrkosten-Begründung?Mehrschichttechnik (adhäsiv)Ästhetik / Materialwahl (Patientenwunsch)Keine Mehrkosten (nur Kasse) => Mehrschichttechnik (adhäsiv)
- Billing: BEMA_13C, GOZ_2100
- Output excerpt: [BEFUND] Zahn 36. MOD [AUFKLÄRUNG] Über die Mehrkosten der Mehrschichttechnik und/oder Adhäsivtechnik wurde aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. Es wurde eine Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V geschlossen. Die Zuzahlung f
- Output fulltext:
```text
[BEFUND]

Zahn 36. MOD

[AUFKLÄRUNG]

Über die Mehrkosten der Mehrschichttechnik und/oder Adhäsivtechnik wurde aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. Es wurde eine Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V geschlossen. Die Zuzahlung für die über den Kassenanteil hinausgehenden Leistungen wurde erläutert und vom Patienten akzeptiert.
Mehrkostenbegründung: mehrschicht.
Mehrkostenbetrag dokumentiert: 150.00 EUR.

[BEHANDLUNGSABLAUF]

Zunächst Adhäsivsystem Adhäsiv appliziert. Daraufhin Zahn 36 (MOD): Füllungstherapie. Im Weiteren Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Anschließend Höherwertige Versorgung mit Mehrkostenvereinbarung (§ 28 SGB V). Abschließend Mehrkosten-Begründung: mehrschicht.

[DURCHGEFÜHRTE LEISTUNGEN]

• Komposit Mehrschichttechnik.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Kassenleistung (BEMA):
  13c – Füllung dreiflächig
Privatleistung (GOZ):
  2100 – Kompositfüllung dreiflächig in Adhäsivtechnik
[MKV-Validierung] Adhäsivtechnik dokumentiert.

Zuzahlung lt. Mehrkostenvereinbarung
```

## S15 — PKV Füllung mit Nebendetails
- Treatment/Insurance: fuellung / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Kontrolle bei Überempfindlichkeit geplant?JaNein
- Askbacks (beantwortet): 1
- QA [option] medical_sensitivity_followup::tooth:24: Kontrolle bei Überempfindlichkeit geplant?JaNein => Ja
- Billing: GOZ_2080
- Output excerpt: [BEFUND] Zahn 24. OD [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunächst Exkavation kariöser Anteile bis sondenharter Konsistenz. Daraufhin Zahn 24 (OD): Füllungstherapie. Im Weiteren Ätz-/Adhäsivtechnik (Schmelz/Denti
- Output fulltext:
```text
[BEFUND]

Zahn 24. OD

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst Exkavation kariöser Anteile bis sondenharter Konsistenz. Daraufhin Zahn 24 (OD): Füllungstherapie. Im Weiteren Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Zum Schluss Kontaktpunkt geprüft.

[DURCHGEFÜHRTE LEISTUNGEN]

• Komposit Mehrschichttechnik.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Privatleistung (GOZ):
  2080 – Kompositfüllung zweiflächig in Adhäsivtechnik
```

## S16 — GKV Endo mit Kofferdam
- Treatment/Insurance: endo / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Bitte Arbeitslängen pro Kanal angeben | Wie viele Kanaele wurden behandelt? | Welche Wurzelfuelltechnik wurde verwendet?Warm vertikalKalt lateralEinzelstift
- Askbacks (beantwortet): 3
- QA [free_text] ENDO_T1_WORKING_LENGTHS::tooth:47: Bitte Arbeitslängen pro Kanal angeben => {"K1":19,"K2":18,"K3":17}
- QA [free_text] endo_canal_count::tooth:47: Wie viele Kanaele wurden behandelt? => 3
- QA [option] medical_wf_technique::tooth:47: Welche Wurzelfuelltechnik wurde verwendet?Warm vertikalKalt lateralEinzelstift => Warm vertikal
- Billing: BEMA_12B, BEMA_32B, BEMA_34B, BEMA_35B, BEMA_Ä925A
- Output excerpt: [BEFUND] Zahn 47 [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 3 Wurzelkanälen. Anschließend Spülung mit NaOCl. Daraufh
- Output fulltext:
```text
[BEFUND]

Zahn 47

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 3 Wurzelkanälen. Anschließend Spülung mit NaOCl. Daraufhin Spülung mit EDTA. Anschließend Medikamentöse Einlage mit Ca(OH)₂. Daraufhin Provisorischer Verschluss. Anschließend Wurzelfüllung in warmer vertikaler Kondensation. Daraufhin Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"K1":19,"K2":18,"K3":17}.

Klinische Zusatzinfo: Endo Arbeitslängenmethode: electronic; Endo Kanalanzahl: 3; Endo Spüllösungen: NaOCl, EDTA; Endo Medikamentöse Einlage: Ca(OH)2; Endo Wurzelfülltechnik: warm.
Medikamentöse Einlage dokumentiert: Ca(OH)2.

[DURCHGEFÜHRTE LEISTUNGEN]

• Kofferdam.
• Elektr. AL.
• 3K.
• Ca(OH)₂ Einlage.
• WF warmvertikal.
• Rö-Kontrolle.
Kanalanzahl dokumentiert: 3.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Kassenleistung (BEMA):
  12 – Besondere Maßnahmen beim Präparieren oder Füllen (Separieren, Beseitigen störenden Zahnfleisches, Anlegen von Spanngummi, Stillung einer übermäßigen Papillenblutung), je Sitzung, je Kieferhälfte oder Frontzahnbereich
  34 – Medikamentöse Einlage (Med)
  35 – Wurzelfüllung
  32 – Wurzelkanalbehandlung (Aufbereitung)
  Ä925a – Röntgen: Aufnahme je Projektion
```

## S17 — PKV Endo mit Röntgenkontrolle
- Treatment/Insurance: endo / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): Bitte Arbeitslängen pro Kanal angeben | Welche Spüllösungen wurden verwendet?NaOClEDTACHXNaClAndere | Wie viele Kanaele wurden behandelt? | Welche Isolation?KofferdamRelative Trockenlegung | Welche medikamentoese Einlage wurde verwendet?
- Askbacks (beantwortet): 5
- QA [free_text] ENDO_T1_WORKING_LENGTHS::tooth:21: Bitte Arbeitslängen pro Kanal angeben => {"K1":19}
- QA [free_text] endo_canal_count::tooth:21: Wie viele Kanaele wurden behandelt? => 1
- QA [free_text] endo_medication::tooth:21: Welche medikamentoese Einlage wurde verwendet? => Ca(OH)2
- QA [option] ENDO_T1_IRRIGATION::tooth:21: Welche Spüllösungen wurden verwendet?NaOClEDTACHXNaClAndere => NaOCl
- QA [option] medical_isolation::tooth:21: Welche Isolation?KofferdamRelative Trockenlegung => Kofferdam
- Billing: GOZ_2040, GOZ_2400, GOZ_2410, GOZ_2430, GOZ_2440, GOZ_5000
- Output excerpt: [BEFUND] Zahn 21 [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 1 Wurzelkanal. Anschließend Spülung mit NaOCl. Daraufhin
- Output fulltext:
```text
[BEFUND]

Zahn 21

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Initial Kofferdam angelegt. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 1 Wurzelkanal. Anschließend Spülung mit NaOCl. Daraufhin Medikamentöse Einlage mit Ca(OH)₂. Anschließend Wurzelfüllung in warmer vertikaler Kondensation. Daraufhin Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"K1":19}.

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

## S18 — GKV Füllung tiefe Karies mit Überkappung
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-multi-treatment-signals:1:fuellung|ueberkappung | tooth-inferred-from-context | duplicate-intent-collapsed:fuellung::15:2
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: BEMA_13B, BEMA_25B
- Output excerpt: [BEFUND] Zahn 15. O. Caries profunda [AUFKLÄRUNG] Bei der Überkappung wurde über das Risiko eines späteren Vitalitätsverlusts aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunächst Pulpanahe Exkavation, indirekte Überkappu
- Output fulltext:
```text
[BEFUND]

Zahn 15. O. Caries profunda

[AUFKLÄRUNG]

Bei der Überkappung wurde über das Risiko eines späteren Vitalitätsverlusts aufgeklärt. Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst Pulpanahe Exkavation, indirekte Überkappung mit Ca(OH)₂. Daraufhin Zahn 15 (O): Füllungstherapie tief (caries profunda). Im Weiteren Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Abschließend Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.
Überkappung durchgeführt (Ca(OH)₂).

[DURCHGEFÜHRTE LEISTUNGEN]

• Cp (Ca(OH)₂).

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Kassenleistung (BEMA):
  13 – Füllung einflächig
  25 – Indirekte Überkappung (Cp)
```

## S19 — GKV Extraktion ohne Naht
- Treatment/Insurance: extraction / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-multi-treatment-signals:1:trauma|extraction
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: BEMA_41A
- Output excerpt: [BEHANDLUNGSABLAUF] Zunaechst Leitungsanästhesie N. alv. inf. (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Anschliessend Extraktion Zahn 38 durchgeführt. [DURCHGEFUEHRTE LEISTUNGEN] • LA Leitung. • Extraktion durchgeführt. [HINWEISE] Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrun
- Output fulltext:
```text
[BEHANDLUNGSABLAUF]

Zunaechst Leitungsanästhesie N. alv. inf. (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Anschliessend Extraktion Zahn 38 durchgeführt.

[DURCHGEFUEHRTE LEISTUNGEN]

• LA Leitung.
• Extraktion durchgeführt.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen.

[ABRECHNUNG]

Kassenleistung (BEMA):
  41a – Leitungsanästhesie, intraoral
```

## S20 — PKV schnelle Frontzahn-Füllung
- Treatment/Insurance: fuellung / PKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: GOZ_2040, GOZ_2080
- Output excerpt: [BEFUND] Zahn 11. OB [AUFKLÄRUNG] Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zu Beginn Kofferdam angelegt. Anschließend Adhäsivsystem Adhäsiv appliziert. Daraufhin Zahn 11 (OB): Füllungstherapie. Im Weiteren Ätz-/Adhäsivtechnik (Sc
- Output fulltext:
```text
[BEFUND]

Zahn 11. OB

[AUFKLÄRUNG]

Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zu Beginn Kofferdam angelegt. Anschließend Adhäsivsystem Adhäsiv appliziert. Daraufhin Zahn 11 (OB): Füllungstherapie. Im Weiteren Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Zum Schluss Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.

[DURCHGEFÜHRTE LEISTUNGEN]

• Kofferdam.
• Komposit Mehrschichttechnik.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

[ABRECHNUNG]

Privatleistung (GOZ):
  2040 – Anlegen von Spanngummi (Kofferdam)
  2080 – Kompositfüllung zweiflächig in Adhäsivtechnik
```

