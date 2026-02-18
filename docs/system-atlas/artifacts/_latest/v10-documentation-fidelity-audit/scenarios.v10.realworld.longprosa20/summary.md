# V10 Documentation Fidelity Audit

- File: /Users/david/dokumaster-ui/scripts/v10/scenarios.v10.realworld.longprosa20.json
- Cases: 20
- Critical findings: 0
- Warnings: 0
- Extraction runtime: LLM=20, regex=0, stub=0, unknown=0
- Require LLM extraction: yes
- Firestore KB disabled: yes

## lp01-fuellung-gkv — undefined
- Treatment/Insurance: fuellung / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_40, BEMA_12, BEMA_13c
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
Die Patientin stellte sich heute mit Beschwerden an Zahn 24 vor; klinisch zeigte sich eine ausgedehnte mesio-okkluso-distale Karies, deutlich pulpanah, ohne sichere Pulpaeroeffnung. Nach Infiltrationsanaesthesie und absoluter Trockenlegung mit Kofferdam erfolgte die Exkavation, anschließend adhäsive Mehrschichttechnik mit Komposit, Okklusions- und Artikulationskontrolle sowie finale Politur.
```
- Askbacks + Antworten:
  - [fuellung-24-1] fuellung-24-1::medical_ueberkappung::tooth:24 (ueberkappung)
    - Frage: Überkappung durchgeführt?
    - Antwort: keine
- Finaltext:
```text
[Befund]
Zahn 24. MOD. Caries profunda

[Aufklärung]
Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[Behandlungsablauf]
Zunächst LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Daraufhin Kofferdam angelegt. Im Weiteren Adhäsivsystem Adhäsiv appliziert. Anschließend Exkavation kariöser Anteile bis sondenharter Konsistenz. Daraufhin Keine Pulpaeröffnung; Cp nicht erforderlich. Im Weiteren Zahn 24 (MOD): Füllungstherapie tief (caries profunda). Anschließend Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Zum Schluss Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.

[Durchgeführte Leistungen]
• LA Infiltr.
• Kofferdam.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen. Patientenangabe: Patientin stellte sich heute mit Beschwerden an Zahn 24 vor; klinisch zeigte sich eine ausgedehnte mesio-okkluso-distale Karies, deutlich pulpanah, ohne sichere Pulpaeroeffnung.
```

## lp02-fuellung-pkv — undefined
- Treatment/Insurance: fuellung / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2080
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Bei Zahn 11 distal-inzisal bestand ein alter insuffizienter Kompositrand mit Sekundaerkaries; der Defekt wurde unter relativer Trockenlegung versorgt, nach Schmelz-Dentin-Adhaesivprotokoll schichtweise rekonstruiert und im Anschluss in Funktion und Aesthetik ausgearbeitet, inklusive feiner Politur.
```
- Finaltext:
```text
[Befund]
Zahn 11. OD. Caries media

[Aufklärung]
Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[Behandlungsablauf]
Zu Beginn Relative Trockenlegung (Watterollen/Speichelsauger). Anschließend Zahn 11 (OD): Füllungstherapie mittel (caries media). Daraufhin Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Abschließend Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.

Klinische Zusatzinfo: relativer Trockenlegung; Schmelz-Dentin-Adhaesivprotokoll; schichtweise rekonstruiert; feine Politur.

[Durchgeführte Leistungen]
• Komposit Mehrschichttechnik.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Patientenangabe: alter insuffizienter Kompositrand mit Sekundaerkaries.
```

## lp03-endo-pkv — undefined
- Treatment/Insurance: endo / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2400, GOZ_2440, GOZ_2430, GOZ_2410, GOZ_5000
- Answered askbacks: 4
- Questions asked: 4
- Findings: none
- Dictation:
```text
Zahn 27 war weiterhin deutlich klopfempfindlich nach Vorbehandlung, daher heute erneute endodontische Sitzung: Zugang erweitert, Arbeitslaenge elektronisch kontrolliert, maschinelle Aufbereitung in allen Kanaelen, intensive Spuelung mit Natriumhypochlorit und EDTA, medikamentoese Einlage mit Calciumhydroxid sowie dichter provisorischer Verschluss; postoperatives Vorgehen wurde erklaert.
```
- Askbacks + Antworten:
  - [endo-27-1] endo-27-1::endo_canal_count::tooth:27 (canal_count)
    - Frage: Wie viele Kanaele wurden behandelt?
    - Antwort: 3
  - [endo-27-1] endo-27-1::ENDO_T1_WORKING_LENGTHS::tooth:27 (ENDO_T1_WORKING_LENGTHS)
    - Frage: Bitte Arbeitslängen pro Kanal angeben
    - Antwort: {"MB":19,"ML":18,"D":20}
  - [endo-27-1] endo-27-1::medical_isolation::tooth:27 (isolation)
    - Frage: Welche Isolation?
    - Antwort: relativ
  - [endo-27-1] endo-27-1::medical_wf_technique::tooth:27 (wf_technique)
    - Frage: Welche Wurzelfuelltechnik wurde verwendet?
    - Antwort: warm
- Finaltext:
```text
[Befund]
Zahn 27

[Aufklärung]
Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[Behandlungsablauf]
Initial Relative Trockenlegung. Anschließend Elektrische Arbeitslängenmessung. Daraufhin Aufbereitung von 3 Wurzelkanälen. Anschließend Aufbereitung maschinell (rotierend). Daraufhin Spülung mit NaOCl. Anschließend Spülung mit EDTA. Daraufhin Medikamentöse Einlage mit Ca(OH)₂. Anschließend Provisorischer Verschluss. Daraufhin Wurzelfüllung in warmer vertikaler Kondensation. Anschließend Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"MB":19,"ML":18,"D":20}.

Klinische Zusatzinfo: Zugang erweitert; Arbeitslaenge elektronisch kontrolliert; maschinelle Aufbereitung in allen Kanaelen; intensive Spuelung mit Natriumhypochlorit und EDTA; medikamentoese Einlage mit Calciumhydroxid; dichter provisorischer Verschluss; Endo Arbeitslängenmethode: electronic; Endo Kanalanzahl: 3; Endo Spüllösungen: NaOCl, EDTA; Endo Medikamentöse Einlage: Ca(OH)2; Endo Wurzelfülltechnik: warm.
Medikamentöse Einlage dokumentiert: Ca(OH)2.

[Durchgeführte Leistungen]
• Elektr. AL.
• 3K.
• Ca(OH)₂ Einlage.
• WF warmvertikal.
• Rö-Kontrolle.
Kanalanzahl dokumentiert: 3.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Patientenangabe: Zahn 27 war weiterhin deutlich klopfempfindlich nach Vorbehandlung.
```

## lp04-extraction-gkv — undefined
- Treatment/Insurance: extraction / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_40, BEMA_41a
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Bei Zahn 28 persistierten rezidivierende Entzuendungszeichen mit begrenzter Erhaltungswuerdigkeit; nach Infiltrationsanaesthesie wurde der Zahn schonend luxiert und komplikationslos extrahiert, die Alveole gesaeubert, Wundversorgung mit Adaptation und Naht durchgefuehrt sowie die Patientin ueber Verhalten und Nachkontrolle informiert.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Lokalanästhesie (Infiltration). Anschliessend Extraktion Zahn 28 durchgeführt. Abschliessend Wundversorgung durchgeführt.

[Durchgefuehrte Leistungen]
• LA infiltr.
• Extraktion durchgeführt.
• Wundversorgung.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen. Patientenangabe: persistierende rezidivierende Entzündungszeichen; begrenzte Erhaltungswürdigkeit; rezidivierende Entzündungszeichen.
```

## lp05-crownprep-pkv — undefined
- Treatment/Insurance: crown_prep / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2210, GOZ_5000, GOZ_2260
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
An Zahn 16 erfolgte nach lokaler Anaesthesie die definitive Kronenpraeparation bei praeexistenter grosser Defektfuellung, anschließend Praezisionsabformung und Bissnahme, provisorische Versorgung adhäsiv befestigt, Okklusion kontrolliert und Pflegehinweise bis zur definitiven Eingliederung besprochen.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Zahn 16: Kronenpräparation durchgeführt. Anschliessend Zahn 16: Präzisionsabformung durchgeführt. Abschliessend Zahn 16: Provisorische Versorgung.

Klinische Zusatzinfo: Kronenpräparation dokumentiert; Präzisionsabformung dokumentiert; Provisorische Versorgung dokumentiert.

[Durchgefuehrte Leistungen]
• Zahn 16: Präparation durchgeführt.
• Zahn 16: Abformung.
• Zahn 16: Provisorium.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.
```

## lp06-pzr-gkv — undefined
- Treatment/Insurance: pzr / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_107, BEMA_107a
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
Im Rahmen der Prophylaxesitzung wurden supra- und gingivale harte sowie weiche Belaege systematisch entfernt, anschließend alle Zahnflaechen poliert und abschließend fluoridiert; die Patientin wurde motivierend zur Interdentalpflege und Recall-Intervall beraten.
```
- Askbacks + Antworten:
  - [pzr-unknown-1] pzr-unknown-1::pzr_zahnstein (pzr_zahnstein)
    - Frage: Zahnstein/Beläge entfernt?
    - Antwort: yes
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Professionelle Zahnreinigung durchgeführt. Anschliessend Supragingivale Zahnsteinentfernung. Abschliessend Fluoridierung der Zähne.

Klinische Zusatzinfo: PZR Zahnsteinentfernung dokumentiert; PZR Fluoridierung dokumentiert.

[Durchgefuehrte Leistungen]
• PZR durchgeführt.
• Zahnstein entfernt.
• Fluoridierung.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.
```

## lp07-ueberkappung-pkv — undefined
- Treatment/Insurance: ueberkappung / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2340
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Bei der Exkavation an Zahn 36 kam es punktfoermig zur Pulpaeroeffnung bei erhaltener Blutstillung, sodass nach atraumatischer Reinigung eine direkte Ueberkappung mit MTA erfolgte, darauf dichter bakteriendichter Verschluss mit adhäsiver Rekonstruktion und Aufklaerung ueber Prognose sowie Verlaufskontrolle.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Direkte Ueberkappung bei Pulpaeroeffnung durchgefuehrt. Anschliessend Ueberkappungsmaterial: MTA.

Klinische Zusatzinfo: Pulpaeroeffnung; atraumatische Reinigung; direkte Ueberkappung mit MTA.
Überkappung durchgeführt (MTA).
```

## lp08-fissuren-pkv — undefined
- Treatment/Insurance: fissurenversiegelung / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2000
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Zur kariesprophylaktischen Primärpraevention wurden die okklusalen Fissuren an Zahn 16 gereinigt, geaetzt, getrocknet und mit lichthaertendem Versiegler blasenfrei appliziert; anschließend erfolgte die Härtung und okklusale Feinjustierung.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Fissurenversiegelung kariesfreier Fissuren mit Kunststoff durchgefuehrt. Anschliessend Sitz und Randqualitaet der Versiegelung kontrolliert.

Klinische Zusatzinfo: Fissurenversiegelung Indikation: kariesprophylaxe; Fissurenversiegelung Material: kunststoff.
```

## lp09-paro-gkv — undefined
- Treatment/Insurance: parodontologie / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_AIT, BEMA_AIT
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Nach abgeschlossener Befunderhebung wurde heute in den Regionen 36 und 37 eine geschlossene antiinfektioese Therapie mit subgingivaler Instrumentierung durchgefuehrt, begleitet von Hygienereinstruktion, Blutungskontrolle und Planung der weiteren parodontalen Nachsorge.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Geschlossene antiinfektioese Parodontaltherapie durchgefuehrt.

Klinische Zusatzinfo: geschlossene antiinfektioese Therapie; subgingivaler Instrumentierung; Blutungskontrolle; Parodontalphase: ait.
```

## lp10-upt-gkv — undefined
- Treatment/Insurance: upt / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_UPTb
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
In der UPT-Sitzung Grad B wurden die bekannten Resttaschen kontrolliert, Biofilmmanagement und Re-Instruktion durchgefuehrt sowie die supportive Therapie dokumentiert; das naechste Recall wurde auf sechs Monate terminiert.
```
- Askbacks + Antworten:
  - [upt-unknown-1] upt-unknown-1::medical_upt_intervall (upt_intervall)
    - Frage: Recallintervall dokumentieren
    - Antwort: 3-4_monate
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Unterstuetzende Parodontitistherapie (UPT) Grad B durchgefuehrt. Anschliessend Recallintervall fuer UPT dokumentiert.

Klinische Zusatzinfo: UPT-Grad: b; UPT-Recallintervall: 3-4 monate.
```

## lp11-wsr-pkv — undefined
- Treatment/Insurance: wsr / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_3110
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
An Zahn 36 erfolgte aufgrund persistierender apikaler Symptomatik die chirurgische Wurzelspitzenresektion mit osteotomischem Zugang, kuerzender Resektion der Wurzelspitze und Wundverschluss; postoperatives Regime inklusive Analgesie- und Kontrollhinweis wurde dokumentiert.
```
- Askbacks + Antworten:
  - [wsr-36-1] wsr-36-1::medical_wsr_lokalisation::tooth:36 (wsr_lokalisation)
    - Frage: WSR-Lokalisation dokumentieren
    - Antwort: front_praemolar
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Lokalisation Frontzahn/Praemolar fuer Wurzelspitzenresektion dokumentiert.

Klinische Zusatzinfo: chirurgische Wurzelspitzenresektion; osteotomischer Zugang; kuerzende Resektion der Wurzelspitze; Wundverschluss; WSR Lokalisation: front praemolar.
```

## lp12-trauma-gkv — undefined
- Treatment/Insurance: trauma / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_100
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
Nach Frontzahntrauma mit Lockerung von Zahn 11 wurde klinisch und funktionell beurteilt, anschließend eine semipermanente Schienung angelegt, die Okklusion entlastet und ein engmaschiges Kontrollschema mit Sensibilitaetskontrollen vereinbart.
```
- Askbacks + Antworten:
  - [trauma-11-1] trauma-11-1::medical_trauma_art::tooth:11 (trauma_art)
    - Frage: Traumaart dokumentieren
    - Antwort: luxation
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Akute Traumasituation klinisch beurteilt und dokumentiert. Anschliessend Semipermanente Schienung zur Stabilisierung traumatisierter Zaehne durchgefuehrt. Abschliessend Verlaufskontrolle nach Trauma empfohlen und dokumentiert.

Klinische Zusatzinfo: Traumaart: luxation; Trauma Schienung: ja; Trauma Verlaufskontrolle: ja.
```

## lp13-implant-pkv — undefined
- Treatment/Insurance: implant / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_9000
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
In regio 36 wurde unter sterilem Protokoll nach osteotomischer Bettaufbereitung ein enossales Implantat inseriert, Primärstabilität kontrolliert und die postoperative Nachsorge einschließlich Medikation und Kontrollintervall mit der Patientin besprochen.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Implantatinsertion am betroffenen Zahngebiet durchgefuehrt. Anschliessend Postoperative Nachsorge inklusive Verhaltensempfehlungen dokumentiert.

Klinische Zusatzinfo: steriles Protokoll; osteotomische Bettaufbereitung; Primärstabilität kontrolliert; Implantatphase: insertion; Implantat Nachsorge: ja.
```

## lp14-krone-pkv — undefined
- Treatment/Insurance: krone / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2210, GOZ_5180
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Die definitive Vollkrone an Zahn 16 wurde heute nach Trockenprobe und Randkontrolle eingesetzt, statische und dynamische Okklusion feinadjustiert und die Patientin zu Verhalten und Pflege der neuen Versorgung instruiert.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Vollkronenversorgung am betroffenen Zahn durchgefuehrt. Anschliessend Definitive Eingliederung und Okklusionskontrolle dokumentiert.

Klinische Zusatzinfo: Kronenart: vollkrone; Kroneneingliederung: definitiv.
```

## lp15-teilkrone-pkv — undefined
- Treatment/Insurance: teilkrone / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2220, GOZ_5180
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
An Zahn 16 wurde die laborgefertigte Teilkrone definitiv eingegliedert, approximale Kontakte sowie Okklusionspunkte kontrolliert und dokumentiert, anschließend erfolgte die Abschlussaufklaerung zum Verhalten in der Eingewoehnungsphase.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Definitive Teilkronenversorgung am betroffenen Zahn durchgefuehrt. Anschliessend Definitive Eingliederung und Okklusionskontrolle dokumentiert.

Klinische Zusatzinfo: Teilkronenart: teilkrone; Teilkroneneingliederung: definitiv.
```

## lp16-bruecke-pkv — undefined
- Treatment/Insurance: bruecke / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5070
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Die definitive Brueckenversorgung in regio 36 wurde eingesetzt, Sitz und Passung geprueft und danach in statischer wie dynamischer Okklusion eingeschliffen; die Reinigungsfaehigkeit unter dem Brueckenglied wurde demonstriert und besprochen.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Definitive Brueckenversorgung eingegliedert und okklusal kontrolliert.

Klinische Zusatzinfo: Brückenart: definitiv; Brückenphase: eingliederung.
```

## lp17-teilprothese-pkv — undefined
- Treatment/Insurance: teilprothese / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5210
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Die Modellguss-Teilprothese im Unterkiefer wurde eingegliedert, Halte- und Stuetzfunktion kontrolliert, Druckstellen evaluiert und die Patientin ausfuehrlich zur Handhabung, Hygiene und Nachsorge angeleitet.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Modellgussprothese mit gegossenen Halte-/Stuetzanteilen eingegliedert.

Klinische Zusatzinfo: Teilprothesentyp: modellguss; Teilprothesenphase: eingliederung.
```

## lp18-totalprothese-pkv — undefined
- Treatment/Insurance: totalprothese / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5220
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Im Oberkiefer wurde die konventionelle Totalprothese eingesetzt, Randgestaltung und Saugschluss geprueft, potenzielle Druckareale markiert und die schrittweise Adaptation sowie notwendige Kontrolltermine mit der Patientin abgestimmt.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Konventionelle Totalprothese eingegliedert und Sitz kontrolliert.

Klinische Zusatzinfo: Totalprothesentyp: konventionell; Totalprothesenphase: eingliederung.
```

## lp19-untersuchung-pkv — undefined
- Treatment/Insurance: untersuchung / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_0010
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
Im Rahmen der eingehenden Untersuchung wurden Hart- und Weichgewebe sowie Okklusion beurteilt, anamnestisch keine akuten Beschwerden angegeben, klinisch aktuell kein unmittelbarer Therapiebedarf, jedoch Empfehlung zur routinemaessigen Verlaufskontrolle.
```
- Askbacks + Antworten:
  - [untersuchung-unknown-1] untersuchung-unknown-1::medical_untersuchung_befunde (untersuchung_befunde)
    - Frage: Wesentliche Befunde dokumentieren
    - Antwort: Befunde klinisch unauffaellig
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Eingehende Untersuchung zur Feststellung von Zahn-, Mund- und Kiefererkrankungen durchgefuehrt. Anschliessend Befunde nachvollziehbar dokumentiert.

Klinische Zusatzinfo: Untersuchungsanlass: kontrolle; Untersuchungsbefunde: Befunde klinisch unauffaellig; Untersuchungsbeurteilung: therapiebedarf.
```

## lp20-roentgen-pkv — undefined
- Treatment/Insurance: roentgen / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5004
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
Zur erweiterten Diagnostik und Therapieplanung wurde ein OPG angefertigt; radiologisch zeigte sich in regio 36 eine apikale Auffaelligkeit, die mit dem klinischen Befund korreliert und in den weiteren Behandlungsplan integriert wurde.
```
- Askbacks + Antworten:
  - [roentgen-36-1] roentgen-36-1::medical_roentgen_zeitpunkt::tooth:36 (radiology_timing)
    - Frage: Roentgen-Zeitpunkt dokumentieren
    - Antwort: dokumentiert
- Finaltext:
```text
[befund]
Röntgenindikation: planung.
Röntgentyp: opg.
Röntgenzeitpunkt: dokumentiert.
Röntgenbefund: apikale_auffaelligkeit.

[Behandlungsablauf]
Zunaechst Orthopantomogramm angefertigt und ausgewertet. Anschliessend Roentgenbefund dokumentiert.

Klinische Zusatzinfo: Röntgenindikation: planung; Röntgentyp: opg; Röntgenbefund: apikale auffaelligkeit.
```

