# Multi-Treatment Core3 Review

## mt01 - GKV Extraktion plus Fuellung

**Diktat**
GKV. Zunaechst Extraktion Zahn 28 nach Luxation mit Infiltrationsanaesthesie und Wundversorgung, danach Fuellung Zahn 16 okklusal mit Komposit unter Kofferdam und Okklusionskontrolle.

**Rueckfragen:** 0

**Erkannte Treatments**
- extraction, fuellung

**Billing**
- BEMA_12, BEMA_40, BEMA_41a, BEMA_13, BEMA_13

**Finaltext**
LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Kofferdam angelegt. Zahn 28 (O): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

Lokalanästhesie (Infiltration). Extraktion Zahn 28 durchgeführt. Wundversorgung durchgeführt.

LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Kofferdam angelegt. Zahn 16 (O): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

**Findings**
- keine harten Issues im Runner

## mt02 - GKV Fuellung plus Endo plus Roentgen

**Diktat**
GKV. Zahn 24 bekam eine tiefe MOD-Kompositfuellung. Anschliessend wurde Zahn 27 wegen Klopfdolenz trepaniert, die Kanaele aufbereitet und medikamentoes eingelegt. Danach erfolgte eine Roentgenkontrolle.

**Rueckfragen:** 12
- medical_ueberkappung::tooth:24: Überkappung durchgeführt?
- medical_ueberkappung::tooth:27: Überkappung durchgeführt?
- fuellung_isolation::tooth:24: Welche Isolation?
- fuellung_isolation::tooth:27: Welche Isolation?
- fuellung_layering::tooth:24: Mehrschichttechnik verwendet?
- fuellung_layering::tooth:27: Mehrschichttechnik verwendet?
- medical_ueberkappung::tooth:24: Überkappung durchgeführt?
- fuellung_isolation::tooth:24: Welche Isolation?
- fuellung_layering::tooth:24: Mehrschichttechnik verwendet?
- medical_roentgen_befund::tooth:24: Roentgen-Befund dokumentieren
- medical_roentgen_typ::tooth:24: Roentgen-Typ dokumentieren (z. B. Zahnfilm/Bissfluegel/OPG)
- medical_roentgen_zeitpunkt::tooth:24: Roentgen-Zeitpunkt dokumentieren

**Erkannte Treatments**
- fuellung, roentgen

**Billing**
- BEMA_12, BEMA_13c, BEMA_13c, BEMA_Ä925a

**Finaltext**
Kofferdam angelegt. Zahn 24 (MOD): Füllungstherapie tief (caries profunda). Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Keine Pulpaeröffnung; Cp nicht erforderlich.

Kofferdam angelegt. Zahn 24 (MOD): Füllungstherapie tief (caries profunda). Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Keine Pulpaeröffnung; Cp nicht erforderlich.

Roentgenologische Einzelzahnaufnahme angefertigt. Roentgenbefund dokumentiert.

**Findings**
- missing_treatments:endo

## mt03 - PKV Kronenpraeparation plus OPG

**Diktat**
PKV. Zahn 11 wurde fuer eine Krone praepariert, abgeformt und provisorisch versorgt; zusaetzlich wurde ein OPG zur Therapieplanung angefertigt.

**Rueckfragen:** 6
- fuellung_material::tooth:11: Welches Füllungsmaterial?
- medical_surfaces::tooth:11: Welche Flächen?
- fuellung_isolation::tooth:11: Welche Isolation?
- crown_prep_impression::tooth:11: Abformung durchgeführt?
- medical_roentgen_befund::tooth:11: Roentgen-Befund dokumentieren
- medical_roentgen_zeitpunkt::tooth:11: Roentgen-Zeitpunkt dokumentieren

**Erkannte Treatments**
- crown_prep, fuellung, roentgen

**Billing**
- GOZ_2040, GOZ_5000, GOZ_2210, GOZ_2260, GOZ_5004

**Finaltext**
Kofferdam angelegt. Zahn 11 (): Füllungstherapie. Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Schmelz/Dentin mit Ätzgel geätzt.

Kofferdam angelegt. Zahn 11: Kronenpräparation durchgeführt. Zahn 11: Präzisionsabformung durchgeführt. Zahn 11: Provisorische Versorgung.

Orthopantomogramm angefertigt und ausgewertet. Roentgenbefund dokumentiert.

**Findings**
- keine harten Issues im Runner
- fachliche Auffaelligkeit: unerwartetes Treatment `fuellung` in Detektion (sollte nur crown_prep + roentgen sein).
