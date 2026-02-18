# Real-Life Audit (20 Faelle)

Run: 2026-02-17T16:17:26.141Z
Pass: 20/20

## f01 — GKV Fuellung tief

**Diktat**
Heute bei Zahn 24 MOD die kariosen Anteile entfernt, die Karies war tief, danach mit Komposit versorgt und die Okklusion kontrolliert.

**Rueckfragen (3)**
- isolation
- layering
- ueberkappung

**Antworten**
- fuellung-24-1::fuellung_isolation::tooth:24: relativ
- fuellung-24-1::fuellung_layering::tooth:24: no
- fuellung-24-1::medical_ueberkappung::tooth:24: keine

**Finaler Text**
[Befund]
Zahn 24. MOD. Caries profunda

[Aufklärung]
Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[Behandlungsablauf]
Zunächst Relative Trockenlegung (Watterollen/Speichelsauger). Daraufhin Keine Pulpaeröffnung; Cp nicht erforderlich. Im Weiteren Zahn 24 (MOD): Füllungstherapie tief (caries profunda). Zum Schluss Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

**Billing**
BEMA_13c

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f02 — PKV Endo mehrkanalig

**Diktat**
An Zahn 27 wurde eine endodontische Behandlung mit Trepanation, Arbeitslangenbestimmung, maschineller Aufbereitung, NaOCl-Spulung und medikamentoeser Einlage durchgefuehrt.

**Rueckfragen (6)**
- canal_count
- medication
- ENDO_T1_WORKING_LENGTH_METHOD
- ENDO_T1_WORKING_LENGTHS
- isolation
- wf_technique

**Antworten**
- endo-27-1::endo_canal_count::tooth:27: 3
- endo-27-1::endo_medication::tooth:27: Ca(OH)2
- endo-27-1::ENDO_T1_WORKING_LENGTH_METHOD::tooth:27: Apexlokator (EAL)
- endo-27-1::ENDO_T1_WORKING_LENGTHS::tooth:27: {"MB":19,"ML":18,"D":20}
- endo-27-1::medical_isolation::tooth:27: relativ
- endo-27-1::medical_wf_technique::tooth:27: warm

**Finaler Text**
[Befund]
Zahn 27

[Aufklärung]
Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[Behandlungsablauf]
Initial Relative Trockenlegung. Anschließend Trepanation der Pulpakammer. Daraufhin Elektrische Arbeitslängenmessung. Anschließend Aufbereitung von 3 Wurzelkanälen. Daraufhin Aufbereitung maschinell (rotierend). Anschließend Spülung mit NaOCl. Daraufhin Medikamentöse Einlage mit Ca(OH)₂. Anschließend Wurzelfüllung in warmer vertikaler Kondensation. Abschließend Röntgenkontrolle post WF.

[Durchgeführte Leistungen]
• Trep.
• Elektr. AL.
• 3K.
• Ca(OH)₂ Einlage.
• WF warmvertikal.
• Rö-Kontrolle.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

**Billing**
GOZ_2400, GOZ_2440, GOZ_2430, GOZ_2410, GOZ_5000, GOZ_2360

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f03 — GKV Extraktion mit Wundversorgung

**Diktat**
Zahn 18 wurde nach Infiltrationsanaesthesie komplikationslos extrahiert, anschliessend erfolgte die Wundversorgung mit postoperativer Aufklaerung.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Lokalanästhesie (Infiltration). Anschliessend Extraktion Zahn 18 durchgeführt. Abschliessend Wundversorgung durchgeführt.

[Durchgefuehrte Leistungen]
• LA infiltr.
• Extraktion durchgeführt.
• Wundversorgung.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen.

**Billing**
BEMA_40, BEMA_41a

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f04 — PKV Kronenpraeparation

**Diktat**
Bei Zahn 11 erfolgte die Kronenpraeparation, danach Abformung und Eingliederung eines Provisoriums.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Zahn 11: Kronenpräparation durchgeführt. Anschliessend Zahn 11: Präzisionsabformung durchgeführt. Abschliessend Zahn 11: Provisorische Versorgung.

[Durchgefuehrte Leistungen]
• Zahn 11: Präparation durchgeführt.
• Zahn 11: Abformung.
• Zahn 11: Provisorium.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

**Billing**
GOZ_2210, GOZ_5000, GOZ_2260

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f05 — GKV PZR komplett

**Diktat**
Es wurde eine professionelle Zahnreinigung mit Zahnsteinentfernung, Politur und abschliessender Fluoridierung durchgefuehrt.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Professionelle Zahnreinigung durchgeführt. Anschliessend Supragingivale Zahnsteinentfernung. Abschliessend Fluoridierung der Zähne.

[Durchgefuehrte Leistungen]
• PZR durchgeführt.
• Zahnstein entfernt.
• Fluoridierung.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

**Billing**
BEMA_107, BEMA_107a

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f06 — PKV Ueberkappung

**Diktat**
Bei Zahn 36 kam es pulpanah zur direkten Ueberkappung mit MTA nach punktfoermiger Pulpaeroeffnung.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Direkte Ueberkappung bei Pulpaeroeffnung durchgefuehrt. Anschliessend Ueberkappungsmaterial: MTA.

**Billing**
GOZ_2340

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f07 — PKV Fissurenversiegelung

**Diktat**
Zur Kariesprophylaxe wurde an Zahn 16 eine Fissurenversiegelung mit lichthaertendem Material vorgenommen.

**Rueckfragen (1)**
- fissuren_material

**Antworten**
- fissurenversiegelung-16-1::medical_fissuren_material::tooth:16: giz_provisorisch

**Finaler Text**
[Behandlungsablauf]
Zunaechst Fissurenversiegelung kariesfreier Fissuren mit Kunststoff durchgefuehrt. Anschliessend Sitz und Randqualitaet der Versiegelung kontrolliert.

**Billing**
GOZ_2000

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f08 — GKV Parodontologie

**Diktat**
Im Rahmen der Parodontaltherapie wurde an den Regionen 36 und 37 eine geschlossene antiinfektioese Behandlung durchgefuehrt.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Geschlossene antiinfektioese Parodontaltherapie durchgefuehrt.

Zunaechst Geschlossene antiinfektioese Parodontaltherapie durchgefuehrt.

**Billing**
BEMA_AIT, BEMA_AIT

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f09 — GKV UPT Recall

**Diktat**
UPT Grad B wurde heute an Zahn 36 durchgefuehrt, das Recallintervall ist auf sechs Monate festgelegt.

**Rueckfragen (1)**
- upt_intervall

**Antworten**
- upt-36-1::medical_upt_intervall::tooth:36: 3-4_monate

**Finaler Text**
[Behandlungsablauf]
Zunaechst Unterstuetzende Parodontitistherapie (UPT) Grad B durchgefuehrt. Anschliessend Recallintervall fuer UPT dokumentiert.

**Billing**
BEMA_UPTb

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f10 — PKV WSR

**Diktat**
An Zahn 36 wurde eine Wurzelspitzenresektion ueber Osteotomie im Molarenbereich durchgefuehrt.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Wurzelspitzenresektion durch Osteotomie am betroffenen Zahn durchgefuehrt. Anschliessend Lokalisation Molar fuer Wurzelspitzenresektion dokumentiert.

**Billing**
GOZ_3120

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f11 — GKV Trauma Schienung

**Diktat**
Nach Luxation an Zahn 11 wurde eine semipermanente Schienung angelegt und die Verlaufskontrolle geplant.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Akute Traumasituation klinisch beurteilt und dokumentiert. Anschliessend Semipermanente Schienung zur Stabilisierung traumatisierter Zaehne durchgefuehrt. Abschliessend Verlaufskontrolle nach Trauma empfohlen und dokumentiert.

**Billing**
BEMA_100

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f12 — PKV Implantat

**Diktat**
In regio 36 erfolgte die Implantatinsertion, anschliessend wurden Nachsorge und Kontrolltermin dokumentiert.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Implantatinsertion am betroffenen Zahngebiet durchgefuehrt. Anschliessend Postoperative Nachsorge inklusive Verhaltensempfehlungen dokumentiert.

**Billing**
GOZ_9000

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f13 — PKV Krone definitiv

**Diktat**
Die definitive Vollkrone an Zahn 16 wurde eingegliedert und funktionell-okklusal kontrolliert.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Vollkronenversorgung am betroffenen Zahn durchgefuehrt. Anschliessend Definitive Eingliederung und Okklusionskontrolle dokumentiert.

**Billing**
GOZ_2210, GOZ_5180

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f14 — PKV Teilkrone

**Diktat**
An Zahn 16 wurde die Teilkrone heute definitiv eingesetzt und der Sitz abschliessend geprueft.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Definitive Teilkronenversorgung am betroffenen Zahn durchgefuehrt. Anschliessend Definitive Eingliederung und Okklusionskontrolle dokumentiert.

**Billing**
GOZ_2220, GOZ_5180

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f15 — PKV Bruecke

**Diktat**
Die definitive Brueckenversorgung in regio 36 wurde eingesetzt, anschliessend erfolgte die statische und dynamische Okklusionskontrolle.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Definitive Brueckenversorgung eingegliedert und okklusal kontrolliert. Anschliessend Brueckenkontrolle mit Funktionspruefung dokumentiert.

**Billing**
GOZ_5070

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f16 — PKV Teilprothese

**Diktat**
Die Modellguss-Teilprothese im Unterkiefer wurde eingegliedert und auf Druckstellen kontrolliert.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Modellgussprothese mit gegossenen Halte-/Stuetzanteilen eingegliedert.

**Billing**
GOZ_5210

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f17 — PKV Totalprothese

**Diktat**
Im Oberkiefer wurde die konventionelle Totalprothese eingesetzt und die Schleimhaut auf Druckstellen kontrolliert.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Konventionelle Totalprothese eingegliedert und Sitz kontrolliert.

**Billing**
GOZ_5220

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f18 — GKV Schiene

**Diktat**
Die Okklusionsschiene wurde eingegliedert und initial auf den Biss angepasst.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Okklusionsschiene eingegliedert und initial angepasst.

**Billing**
BEMA_K1

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f19 — PKV Untersuchung

**Diktat**
Es erfolgte eine eingehende Kontrolluntersuchung; Anlass war die Routinekontrolle, Befunde klinisch unauffaellig, aktuell kein akuter Therapiebedarf.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Eingehende Untersuchung zur Feststellung von Zahn-, Mund- und Kiefererkrankungen durchgefuehrt. Anschliessend Befunde nachvollziehbar dokumentiert.

**Billing**
GOZ_0010

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).

## f20 — PKV Roentgen OPG

**Diktat**
Zur praeoperativen Therapieplanung wurde ein OPG angefertigt; Roentgenbefund: apikale Auffaelligkeit regio 36 dokumentiert.

**Rueckfragen (0)**
- keine

**Antworten**
- keine

**Finaler Text**
[Behandlungsablauf]
Zunaechst Orthopantomogramm angefertigt und ausgewertet. Anschliessend Roentgenbefund dokumentiert.

**Billing**
GOZ_5004

**Bewertung**
Stimmig im aktuellen Regelwerk (Output vorhanden, Billing kanal-konsistent, keine BLOCK-Fehler im Lauf).
