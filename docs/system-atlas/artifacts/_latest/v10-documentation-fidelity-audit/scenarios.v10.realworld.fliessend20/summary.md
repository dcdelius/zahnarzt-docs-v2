# V10 Documentation Fidelity Audit

- File: /Users/david/dokumaster-ui/scripts/v10/scenarios.v10.realworld.fliessend20.json
- Cases: 20
- Critical findings: 0
- Warnings: 0
- Extraction runtime: LLM=20, regex=0, stub=0, unknown=0
- Require LLM extraction: no
- Firestore KB disabled: yes

## f01 — GKV Fuellung tief
- Treatment/Insurance: fuellung / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_13c
- Answered askbacks: 3
- Questions asked: 3
- Findings: none
- Dictation:
```text
Heute bei Zahn 24 MOD die kariosen Anteile entfernt, die Karies war tief, danach mit Komposit versorgt und die Okklusion kontrolliert.
```
- Askbacks + Antworten:
  - [fuellung-24-1] fuellung-24-1::fuellung_isolation::tooth:24 (isolation)
    - Frage: Welche Isolation?
    - Antwort: relativ
  - [fuellung-24-1] fuellung-24-1::fuellung_layering::tooth:24 (layering)
    - Frage: Mehrschichttechnik verwendet?
    - Antwort: no
  - [fuellung-24-1] fuellung-24-1::medical_ueberkappung::tooth:24 (ueberkappung)
    - Frage: Überkappung durchgeführt?
    - Antwort: keine
- Finaltext:
```text
[Befund]
Zahn 24. MOD. Caries profunda

[Aufklärung]
Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[Behandlungsablauf]
Zunächst Relative Trockenlegung (Watterollen/Speichelsauger). Daraufhin Keine Pulpaeröffnung; Cp nicht erforderlich. Im Weiteren Zahn 24 (MOD): Füllungstherapie tief (caries profunda). Zum Schluss Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

Klinische Zusatzinfo: Komposit verwendet.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.
```

## f02 — PKV Endo mehrkanalig
- Treatment/Insurance: endo / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2400, GOZ_2440, GOZ_2430, GOZ_2410, GOZ_5000, GOZ_2360
- Answered askbacks: 6
- Questions asked: 6
- Findings: none
- Dictation:
```text
An Zahn 27 wurde eine endodontische Behandlung mit Trepanation, Arbeitslangenbestimmung, maschineller Aufbereitung, NaOCl-Spulung und medikamentoeser Einlage durchgefuehrt.
```
- Askbacks + Antworten:
  - [endo-27-1] endo-27-1::endo_canal_count::tooth:27 (canal_count)
    - Frage: Wie viele Kanaele wurden behandelt?
    - Antwort: 3
  - [endo-27-1] endo-27-1::endo_medication::tooth:27 (medication)
    - Frage: Welche medikamentoese Einlage wurde verwendet?
    - Antwort: Ca(OH)2
  - [endo-27-1] endo-27-1::ENDO_T1_WORKING_LENGTH_METHOD::tooth:27 (ENDO_T1_WORKING_LENGTH_METHOD)
    - Frage: Wie wurden die Arbeitslängen bestimmt?
    - Antwort: Apexlokator (EAL)
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
Initial Relative Trockenlegung. Anschließend Trepanation der Pulpakammer. Daraufhin Elektrische Arbeitslängenmessung. Anschließend Aufbereitung von 3 Wurzelkanälen. Daraufhin Aufbereitung maschinell (rotierend). Anschließend Spülung mit NaOCl. Daraufhin Medikamentöse Einlage mit Ca(OH)₂. Anschließend Wurzelfüllung in warmer vertikaler Kondensation. Daraufhin Röntgenkontrolle post WF. Abschließend Arbeitslängen dokumentiert: {"MB":19,"ML":18,"D":20}.

Klinische Zusatzinfo: Trepanation; Arbeitslangenbestimmung; maschinelle Aufbereitung; NaOCl-Spulung; medikamentoese Einlage; Endo Arbeitslängenmethode: electronic; Endo Kanalanzahl: 3; Endo Spüllösungen: NaOCl; Endo Medikamentöse Einlage: Ca(OH)2; Endo Wurzelfülltechnik: warm.
Medikamentöse Einlage dokumentiert: Ca(OH)2.

[Durchgeführte Leistungen]
• Trep.
• Elektr. AL.
• 3K.
• Ca(OH)₂ Einlage.
• WF warmvertikal.
• Rö-Kontrolle.
Kanalanzahl dokumentiert: 3.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.
```

## f03 — GKV Extraktion mit Wundversorgung
- Treatment/Insurance: extraction / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_40, BEMA_41a
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Zahn 18 wurde nach Infiltrationsanaesthesie komplikationslos extrahiert, anschliessend erfolgte die Wundversorgung mit postoperativer Aufklaerung.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Lokalanästhesie (Infiltration). Anschliessend Extraktion Zahn 18 durchgeführt. Abschliessend Wundversorgung durchgeführt.

[Durchgefuehrte Leistungen]
• LA infiltr.
• Extraktion durchgeführt.
• Wundversorgung.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen.
```

## f04 — PKV Kronenpraeparation
- Treatment/Insurance: crown_prep / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2210, GOZ_5000, GOZ_2260
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Bei Zahn 11 erfolgte die Kronenpraeparation, danach Abformung und Eingliederung eines Provisoriums.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Zahn 11: Kronenpräparation durchgeführt. Anschliessend Zahn 11: Präzisionsabformung durchgeführt. Abschliessend Zahn 11: Provisorische Versorgung.

Klinische Zusatzinfo: Kronenpräparation dokumentiert; Präzisionsabformung dokumentiert; Provisorische Versorgung dokumentiert.

[Durchgefuehrte Leistungen]
• Zahn 11: Präparation durchgeführt.
• Zahn 11: Abformung.
• Zahn 11: Provisorium.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.
```

## f05 — GKV PZR komplett
- Treatment/Insurance: pzr / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_107, BEMA_107a
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Es wurde eine professionelle Zahnreinigung mit Zahnsteinentfernung, Politur und abschliessender Fluoridierung durchgefuehrt.
```
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

## f06 — PKV Ueberkappung
- Treatment/Insurance: ueberkappung / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2340
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Bei Zahn 36 kam es pulpanah zur direkten Ueberkappung mit MTA nach punktfoermiger Pulpaeroeffnung.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Direkte Ueberkappung bei Pulpaeroeffnung durchgefuehrt. Anschliessend Ueberkappungsmaterial: MTA.

Klinische Zusatzinfo: direkte Überkappung mit MTA; punktförmige Pulpaeröffnung.
Überkappung durchgeführt (MTA).
```

## f07 — PKV Fissurenversiegelung
- Treatment/Insurance: fissurenversiegelung / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2000
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
Zur Kariesprophylaxe wurde an Zahn 16 eine Fissurenversiegelung mit lichthaertendem Material vorgenommen.
```
- Askbacks + Antworten:
  - [fissurenversiegelung-16-1] fissurenversiegelung-16-1::medical_fissuren_material::tooth:16 (fissuren_material)
    - Frage: Versiegelungsmaterial dokumentieren
    - Antwort: giz_provisorisch
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Fissurenversiegelung kariesfreier Fissuren mit Kunststoff durchgefuehrt. Anschliessend Sitz und Randqualitaet der Versiegelung kontrolliert.

Klinische Zusatzinfo: Fissurenversiegelung; lichthärtendes Material; Fissurenversiegelung Indikation: kariesprophylaxe; Fissurenversiegelung Material: giz provisorisch.
```

## f08 — GKV Parodontologie
- Treatment/Insurance: parodontologie / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_AIT, BEMA_AIT
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Im Rahmen der Parodontaltherapie wurde an den Regionen 36 und 37 eine geschlossene antiinfektioese Behandlung durchgefuehrt.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Geschlossene antiinfektioese Parodontaltherapie durchgefuehrt.

Klinische Zusatzinfo: geschlossene antiinfektiöse Behandlung; Parodontalphase: ait.
```

## f09 — GKV UPT Recall
- Treatment/Insurance: upt / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_UPTb
- Answered askbacks: 1
- Questions asked: 1
- Findings: none
- Dictation:
```text
UPT Grad B wurde heute an Zahn 36 durchgefuehrt, das Recallintervall ist auf sechs Monate festgelegt.
```
- Askbacks + Antworten:
  - [upt-36-1] upt-36-1::medical_upt_intervall::tooth:36 (upt_intervall)
    - Frage: Recallintervall dokumentieren
    - Antwort: 3-4_monate
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Unterstuetzende Parodontitistherapie (UPT) Grad B durchgefuehrt. Anschliessend Recallintervall fuer UPT dokumentiert.

Klinische Zusatzinfo: UPT-Grad: b; UPT-Recallintervall: 3-4 monate.
```

## f10 — PKV WSR
- Treatment/Insurance: wsr / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_3120
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
An Zahn 36 wurde eine Wurzelspitzenresektion ueber Osteotomie im Molarenbereich durchgefuehrt.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Wurzelspitzenresektion durch Osteotomie am betroffenen Zahn durchgefuehrt. Anschliessend Lokalisation Molar fuer Wurzelspitzenresektion dokumentiert.

Klinische Zusatzinfo: Wurzelspitzenresektion; Osteotomie; Molarenbereich; WSR Zugang: osteotomie; WSR Lokalisation: molar.
```

## f11 — GKV Trauma Schienung
- Treatment/Insurance: trauma / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_100
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Nach Luxation an Zahn 11 wurde eine semipermanente Schienung angelegt und die Verlaufskontrolle geplant.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Akute Traumasituation klinisch beurteilt und dokumentiert. Anschliessend Semipermanente Schienung zur Stabilisierung traumatisierter Zaehne durchgefuehrt. Abschliessend Verlaufskontrolle nach Trauma empfohlen und dokumentiert.

Klinische Zusatzinfo: semipermanente Schienung angelegt; Traumaart: luxation; Trauma Schienung: ja; Trauma Verlaufskontrolle: ja.
```

## f12 — PKV Implantat
- Treatment/Insurance: implant / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_9000
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
In regio 36 erfolgte die Implantatinsertion, anschliessend wurden Nachsorge und Kontrolltermin dokumentiert.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Implantatinsertion am betroffenen Zahngebiet durchgefuehrt. Anschliessend Postoperative Nachsorge inklusive Verhaltensempfehlungen dokumentiert.

Klinische Zusatzinfo: Implantatphase: insertion; Implantat Nachsorge: ja.
```

## f13 — PKV Krone definitiv
- Treatment/Insurance: krone / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2210, GOZ_5180
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Die definitive Vollkrone an Zahn 16 wurde eingegliedert und funktionell-okklusal kontrolliert.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Vollkronenversorgung am betroffenen Zahn durchgefuehrt. Anschliessend Definitive Eingliederung und Okklusionskontrolle dokumentiert.

Klinische Zusatzinfo: Kronenart: vollkrone; Kroneneingliederung: definitiv.
```

## f14 — PKV Teilkrone
- Treatment/Insurance: teilkrone / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_2220, GOZ_5180
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
An Zahn 16 wurde die Teilkrone heute definitiv eingesetzt und der Sitz abschliessend geprueft.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Definitive Teilkronenversorgung am betroffenen Zahn durchgefuehrt. Anschliessend Definitive Eingliederung und Okklusionskontrolle dokumentiert.

Klinische Zusatzinfo: Teilkronenart: teilkrone; Teilkroneneingliederung: definitiv.
```

## f15 — PKV Bruecke
- Treatment/Insurance: bruecke / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5070
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Die definitive Brueckenversorgung in regio 36 wurde eingesetzt, anschliessend erfolgte die statische und dynamische Okklusionskontrolle.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Definitive Brueckenversorgung eingegliedert und okklusal kontrolliert. Anschliessend Brueckenkontrolle mit Funktionspruefung dokumentiert.

Klinische Zusatzinfo: Brückenart: definitiv; Brückenphase: kontrolle.
```

## f16 — PKV Teilprothese
- Treatment/Insurance: teilprothese / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5210
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Die Modellguss-Teilprothese im Unterkiefer wurde eingegliedert und auf Druckstellen kontrolliert.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Modellgussprothese mit gegossenen Halte-/Stuetzanteilen eingegliedert.

Klinische Zusatzinfo: Teilprothesentyp: modellguss; Teilprothesenphase: eingliederung.
```

## f17 — PKV Totalprothese
- Treatment/Insurance: totalprothese / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5220
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Im Oberkiefer wurde die konventionelle Totalprothese eingesetzt und die Schleimhaut auf Druckstellen kontrolliert.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Konventionelle Totalprothese eingegliedert und Sitz kontrolliert.

Klinische Zusatzinfo: Totalprothesentyp: konventionell; Totalprothesenphase: eingliederung.
```

## f18 — GKV Schiene
- Treatment/Insurance: schiene / GKV
- Extraction: llm (llmError=none)
- Billing refs: BEMA_K1
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Die Okklusionsschiene wurde eingegliedert und initial auf den Biss angepasst.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Okklusionsschiene eingegliedert und initial angepasst.

Klinische Zusatzinfo: Schienentyp: okklusionsschiene; Schienenphase: eingliederung.
```

## f19 — PKV Untersuchung
- Treatment/Insurance: untersuchung / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_0010
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Es erfolgte eine eingehende Kontrolluntersuchung; Anlass war die Routinekontrolle, Befunde klinisch unauffaellig, aktuell kein akuter Therapiebedarf.
```
- Finaltext:
```text
[Behandlungsablauf]
Zunaechst Eingehende Untersuchung zur Feststellung von Zahn-, Mund- und Kiefererkrankungen durchgefuehrt. Anschliessend Befunde nachvollziehbar dokumentiert.

Klinische Zusatzinfo: Untersuchungsanlass: kontrolle; Untersuchungsbefunde: unauffaellig; Untersuchungsbeurteilung: ohne therapiebedarf.
```

## f20 — PKV Roentgen OPG
- Treatment/Insurance: roentgen / PKV
- Extraction: llm (llmError=none)
- Billing refs: GOZ_5004
- Answered askbacks: 0
- Questions asked: 0
- Findings: none
- Dictation:
```text
Zur praeoperativen Therapieplanung wurde ein OPG angefertigt; Roentgenbefund: apikale Auffaelligkeit regio 36 dokumentiert.
```
- Finaltext:
```text
[Befund]
Röntgenindikation: planung.
Röntgentyp: opg.
Röntgenzeitpunkt: praeoperativ.
Röntgenbefund: apikale_auffaelligkeit.

[Behandlungsablauf]
Zunaechst Orthopantomogramm angefertigt und ausgewertet. Anschliessend Roentgenbefund dokumentiert.

Klinische Zusatzinfo: Röntgenindikation: planung; Röntgentyp: opg; Röntgenzeitpunkt: praeoperativ; Röntgenbefund: apikale auffaelligkeit.
```

