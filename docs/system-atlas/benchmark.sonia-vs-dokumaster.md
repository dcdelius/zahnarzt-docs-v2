# Benchmark: Sonia-Zielbild vs Dokumaster V10 (Markt-Must-Haves + Killer-Funktionen)

**Captured:** 2026-01-30  
**Status:** Draft (Brainstorm + Benchmark; priorisierte Lueckenliste)

## Ziel dieses Dokuments

1) **Was muss** eine Diktat→Doku→Abrechnung-Software in Deutschland koennen, um in der Praxis wirklich zu funktionieren (mindestens so gut wie "Sonia")?  
2) **Was koennen wir bereits** (Dokumaster V10, SSOT-Architektur)?  
3) **Wo sind die groessten Luecken** und was ist der schnellste Weg zu "praxisreif + skalierbar"?

> Leitprinzip: **Trust > Magic.** Wir gewinnen nicht durch "kreative" KI, sondern durch nachvollziehbare, reproduzierbare, abrechnungs-sichere Ergebnisse.

---

## Annahmen (Scope)

- **Deutschland / Zahnarztpraxis** mit GKV/PKV/MKV (Mehrkosten), KZV-Dokumentationsanforderungen und abrechnungslogischen Fallstricken (Kombinationsregeln, Multiplicity).
- Dokumaster ist **Add-on / Control Center**, nicht zwingend ein vollwertiges PVS. Erfolg haengt deshalb stark von **Integration** (Import/Export) ab.
- SSOT bleibt: **Renderer/KB ist Quelle fuer Text + BillingRefs**; UI steuert nur Facts/Controls.

---

## Markt-Must-Haves (was "so eine Software" koennen muss)

### A) Kern-Workflow (der Praxis-ROI)

- **Zeitgewinn**: <2 Minuten von Diktat zu fertigem, kontrollierbarem Output.
- **"Stop-the-line" nur bei wirklich Kritischem**: askbacks nur wenn sonst falsche Doku/Abrechnung droht.
- **Korrektur ohne Tippen**: Chips/Controls fuer die haeufigsten Korrekturen (Zahn, Flaechen, LA, Isolation, Material, Mehrkosten, Risiko).
- **Multi-Behandlung**: ein Diktat kann mehrere Leistungen enthalten (z.B. Endo + Fuellung + Provisorium) -> segmentieren, getrennt rechnen, sauber zusammenfuehren.
- **Teamfaehig**: Assistenz kann vorbereiten, Zahnarzt finalisiert (Rollen/Sign-off).

### B) Abrechnung & KZV-Fitness (das "Geld"-Problem)

- **Kataloge & Referenzen**: BEMA/GOZ/GOAe/BEL/Festzuschuesse muessen verifizierbar sein (SSOT, versioniert).
- **Insurance Channelization**: GKV != GOZ; PKV != BEMA; MKV sauber (BEMA-Basis + GOZ-Addon nur wenn erlaubt).
- **Kombinationsregeln**: Konflikte erkennen (BLOCK/WARN) und die Ausgabe entsprechend anpassen (Codes droppen + Text anpassen, tracebar).
- **Multiplicity**: gleiche Leistung mehrfach (z.B. je Zahn/je Flaeche) darf nicht "wegdedupliziert" werden; Abrechnung muss pro Instance korrekt sein.
- **Formulare/Flows** (je nach Produktziel): HKP/EBZ, PAR-Plan, ZE-Plan, etc. (mindestens Export/Assist).

### C) Vertrauen, Recht & Sicherheit (ohne das kauft niemand)

- **Nachvollziehbarkeit**: Warum steht das im Text / warum dieser Code? -> Trace: Code -> Chip -> KB -> Fact/Quelle.
- **Reproduzierbarkeit**: gleicher Input + gleiche KB-Version -> gleicher Output (Version Pinning).
- **Datenschutz (DSGVO)**: Rollen, Mandantenfaehigkeit, Logging, Loeschkonzept, Verschluesselung, AVV, Datenminimierung.
- **Regulatorik-Check**: Einordnung ob/ wann das Produkt als Medizinprodukt (SaMD/MDR) gilt und welche Prozesse daraus folgen (Risiko-Management, Validierung, Post-Market).

### D) Integration (entscheidet, ob es im Alltag "klebt")

- **PVS-Integration**: Patient/Termin/Versicherungsart rein; Doku/Befund/Leistungen raus (mind. Copy/Paste + Export; ideal: Schnittstellen).
- **TI-Kommunikation**: KIM/EBZ/Datenaustausch, wo relevant (mindestens kompatibler Export).
- **Geräte-/Material-Defaults**: Praxis-spezifische Standards (Materialien, Systeme, Workflows) muessen als Settings abbildbar sein.

### E) Operativ & Skalierung

- **Onboarding**: in 30-60 Minuten einsatzbereit (Praxis-Defaults, Team, Favoriten pro Behandlung).
- **Monitoring & Supportability**: Repro-Bundles, Debug, klare Fehlerbilder, Telemetrie (ohne Patientendaten zu leaken).
- **KB-Release Prozess**: Updates ohne Chaos (Release Notes, Rollback, Praxis-Pinning, QA-Gates pro Pack).

---

## Killer-Funktion-Hypothesen (differenzierend, realistisch)

1) **"Abrechnung mit Beweis" (Trace-first Billing)**
   - Jede Abrechnungsposition ist klickbar: *welcher Fakt* -> *welcher Chip* -> *welcher KB-Satz* -> *welche Regel*.
   - Outcome: maximaler Trust, weniger Rueckfragen, bessere Akzeptanz im Team.

2) **KZV-/Abrechnungs-Fehlerpraevention ("Reject-Proof Mode")**
   - Vor Finalisierung: Plausibilitaetschecks (fehlende Pflichtangaben, Mehrkosten-Consent, Kombinationskonflikte, falsche Kanalisierung).
   - Outcome: weniger Ruecklaeufer/Absetzungen, direkt messbarer ROI.

3) **"One Dictation -> Many Instances" (Multi-Behandlung, deterministic)**
   - Ein Diktat erzeugt getrennte, abrechenbare Behandlungs-Instanzen (pro Zahn / pro Segment) und merged am Ende deterministisch.
   - Outcome: echte Alltagstauglichkeit (der Zahnarzt diktiert so nun mal).

4) **Praxis-Standards als "Policies" (nicht als Hardcode)**
   - Praxis entscheidet: was AUTO, was CONFIRM, was FORBIDDEN ist (mit Billing-Risiko-Label).
   - Outcome: weniger nervige Fragen, trotzdem sicher.

---

## Benchmark-Matrix (Soll vs Ist Dokumaster V10)

Legende:
- **Have** = produktionsnah/validiert
- **Partial** = vorhanden, aber lueckenhaft / nicht E2E abgesichert
- **Missing** = nicht vorhanden / nur Idee

| Bereich | Must-Have | Status V10 | Evidence (Datei/Doc) | Notizen / Gap |
|---|---|---:|---|---|
| SSOT Text+BILLINGREF | Text/Codes nie aus UI/LLM, nur aus KB | **Have** | `docs/system-atlas/reality.snapshot.v10.md` | Kern-Asset; muss geschuetzt bleiben |
| BillingRef-only Runtime | Keine hardcoded BEMA/GOZ Strings im Runtime | **Have** | `docs/system-atlas/reality.snapshot.v10.md` | Gate-Suite vorhanden |
| Kataloge (BEMA/GOZ/GOAe/BEL) | Vollstaendige, auditierbare Kataloge | **Have** | `docs/system-atlas/catalog-status.md` | GOZ 8xxx teils als "missing" markiert |
| Kombinationsregeln | BLOCK/WARN + DroppedCodes propagieren | **Partial** | `docs/system-atlas/known-gaps.md` | Coverage-Luecken (KB-Regeln) |
| Askbacks | Kritische Infos abfragen, nicht raten | **Have** | `docs/system-atlas/reality.snapshot.v10.md` | Hybrid: MedicalKB + QuestionServiceV2 |
| Chips/Controls UI | Korrektur ohne Tippen | **Partial** | `docs/system-atlas/product.plan.md` | Control Center (Page 2) ist Zielbild, nicht fertig |
| Settings (Praxis/User Defaults) | Standards/Prefs -> Facts/Policies | **Partial** | `docs/system-atlas/settings.design.md` | Umsetzung laeuft, muss "boring & clear" werden |
| Treatment Coverage | 20-30 Packs, je Pack QA-Gates | **Partial** | `docs/system-atlas/reality.snapshot.v10.md` | Fuellung komplett; Endo teilweise; Rest fehlt |
| Multi-Behandlung | Segmentierung + Merge + perInstance-Scoping | **Partial** | `docs/system-atlas/architecture.scaling.plan.md` | Plan existiert, Umsetzung lueckenhaft |
| Repro/Debug | Repro-Bundle, Trace, Explain | **Have** | `src/docudent/v10/pages/DocudentV10Page.tsx` | Debug Drawer da; Trace UX noch "techy" |
| Sonia Baseline | Templates + Suggestions + Standards toggles | **Have (legacy)** | `src/_legacy/pages/SoniaV3.jsx` | V10 muss UX/Flow mindestens erreichen |
| PVS Integration | Patient/Termin rein, Doku/Billing raus | **Missing** | - | Produkt-Entscheidung noetig (API vs Export) |
| TI/KIM/EBZ Support | Kompatible Kommunikations-/Exportwege | **Missing** | - | Abhaengig von Integrations-Strategie |
| Compliance Paket | DSGVO Prozesse + MDR Einordnung | **Partial** | `firestore.rules` | Technik da; Prozess/Docs fehlen |
| Team/Rollen/Sign-off | Assistenz vorbereitet, Zahnarzt signiert | **Missing** | - | Wichtig fuer Adoption in groesseren Praxen |
| KPIs/Analytics | Zeit, Vollstaendigkeit, Absetzungen | **Missing** | - | Braucht Telemetrie + anonymisierte Metriken |

---

## Priorisierte Lueckenliste (Business-first)

### P0 (Praxis-Test faellt sonst um)

- **Control Center (Page 2) wirklich fertig**: Chips als klare, reduzierte Controls (kein Kistenfriedhof), mit Unterpunkten pro Behandlung.
- **Treatment Coverage**: weitere haeufige 10-15 Behandlungen als Packs (mit QA-Gates), nicht nur "Definitionen".
- **Combinability Coverage**: die echten Absetzungs-Klassiker abdecken; unknown darf nicht still "ok" sein.

### P1 (macht es deutlich besser als "Sonia")

- **Trace-first UX** fuer Billing: "Warum dieser Code?" in 1 Klick (ohne Debug-Mode).
- **Reject-Proof Checks**: Plausibilitaet + Missing-Criticals + MKV/Consent.
- **Settings als Policies**: AUTO/CONFIRM/FORBIDDEN pro Control, sauber gespeichert (Firestore nur Settings/Meta).

### P2 (Skalierung & Moat)

- **PVS Integration** (mind. Exportpakete; ideal: Schnittstellen, VDDS-ecosystem).
- **Team-Workflow** (Rollen + Sign-off + Audit).
- **KB Release Ops** (Rollouts, Pinning, Rollback, Praxis-Notizen).

---

## Quellen / Offizielle Referenzen (Auswahl)

Diese Links sind fuer **Wording/Begriffe/Regel-Existenz** gedacht, nicht um medizinische Entscheidungen zu automatisieren:

- BEMA / Gebuehrenverzeichnisse (KZBV): https://www.kzbv.de/gebuehrenverzeichnisse.550.de.html
- BEMA (PDF, KZBV): https://www.kzbv.de/bema.450.de.html
- GOZ (amtlich, gesetze-im-internet.de): https://www.gesetze-im-internet.de/goz/BJNR026310987.html
- VDDS (Schnittstellen/Industrie): https://www.vdds.de/
- KIM (gematik): https://www.gematik.de/anwendungen/kim
- KIM (KBV KV-Lexikon, Einordnung im Versorgungskontext): https://www.kbv.de/html/kle_kim.php
- KZBV Digitalisierung (u.a. EBZ/ePA-Kontext): https://www.kzbv.de/digitalisierung.100.de.html

> Hinweis: Die konkrete Abrechnungslogik pro Fall muss weiterhin aus unserer versionierten KB kommen und durch Gates/Domain-Review abgesichert werden.
