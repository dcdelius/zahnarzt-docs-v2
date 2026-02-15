# Einstellungen-Design: V10 Jeton Setting-Hub

**Captured:** 2026-01-29  
**Status:** Vorschlag (Layout + Datenverantwortung)

## Ziel
Ein mutiges, dennoch einheitliches Einstellungs-Ökosystem im Look & Feel der V10 Jeton-Seiten, das die Praxis-/User-Defaults sauber in Fakten/Chips verankert. Die Settings sollen nicht nur Konfiguration sein, sondern die SSOT-Erwartung von Page 2 (Control Center) sichtbar machen: Was wird automatisch ins Dictat übernommen, was muss bestätigt werden, und wie bleibt der Renderer weiterhin das einzige Text-/Billing-SSOT?

## Gesamtlayout (Inspirationsquelle: `DocudentV10Page` + Jeton-Dock)
- **Pixel-First Hero**: Reuse `.v7-jeton-hero` mit leicht angepasster Botschaft. Linke Spalte: „Practice Standards“, rechte Spalte: „User Preferences“. Hero liegt über einem durchscheinenden Gradient mit ruhigen Lila-zu-Sand-Überlagerungen, wie im v10 Hero bereits verwendet.  
- **Dock-Nav**: Unterhalb des Hero sitzt der Jeton-Dock (`.v7-jeton-dock`): Tabs „Praxis“, „Behandlungen“, „Team“. Trace/Provenance bleibt **immer** rechts sichtbar (kein eigener Tab), damit der Kontext nie verschwindet. Der Dock bleibt sticky beim Scrollen und sendet Telemetrie („settings.gatedTab“).
- **Content Grid**: Drei-spaltiges Grid (mind. 1.6em Abstand).  
  1. **Links**: Kontext-Panel mit quick stats („Nutzer mit Defaults“, „Autosignierte Facts“, „Offene Blocking Chips“).  
  2. **Mitte (Hauptbereich)**: Block für die aktuell gewählte Kategorie (Praxis, Behandlung, Zahnarzt).  
  3. **Rechts**: Card-Stack mit „Trace Preview“, „Practice Rulebook“ und einem Live-Simulator („Was würde Page 2 zeigen?“) mit Chips als Buttons.

## Abschnitt: Praxis-Defaults („Standard Ships“)
- Karte beschreibt Materialien, Geräte, obligatorische Abläufe (z. B. „Politur nach Füllung“, „Aufklärung Alternativen“, „Forensische Hinweise“).  
- Jede Zeile ist ein Jeton-Chip: Icon, Titel, Kurztext, Status (Active/Review/Inactive).  
- Interaktion: Toggle aktiviert/deaktiviert Default-Chip. Der Toggle schreibt nicht direkt Codes, sondern markiert eine Fact (z. B. `fact.polishAfterFilling = true`, Quelle `settings.practice`).  
- Rechts neben jedem Chip: Policy-Label (keine Deko) aus dem Settings-Contract:  
  `mode: AUTO | CONFIRM | FORBIDDEN`, `billingEligibility: auto | confirmRequired | never`, `scope: session | tooth | instance`, `defaultSource: practice | user`.  
  Bei `confirmRequired` wird eine verpflichtende Review-Badge angezeigt, die Page 2 blockiert, bis bestätigt wurde.
- Unten: „Default-Set speichern“ Button, der Versionshinweis generiert (`settingsVersion: 2026-01-29`). Beim Speichern wird `practiceDefaultsVersion` in Firestore + lokalem Settings-Store aktualisiert.

## Abschnitt: Behandlungsspezifika („Pack-Level Contracts“)
- Tab-Auswahl per Pill Buttons (z. B. „Füllung“, „Endo“, „Kronen“, „Multi-Treatment Template“).  
- Jede Karte zeigt **Controls** statt Chip-Rohdaten:  
  * „Was passiert automatisch?“ (AUTO)  
  * „Was fragt er immer?“ (CONFIRM/Askback)  
  * „Was kann blocken / wird gedroppt?“ (Combinability-Labels)  
  * „Was kostet Geld wenn falsch?“ (billable + confirmRequired)  
  * Checkbox-Reihe „Default Controls pro Dentist“ – aktivierte Controls erscheinen auf Page 2, auch ohne Dictat-Erkennung.  
- Der „MDL“ (Multi-Dictation Layer) Bereich erlaubt das Setzen von `perTreatment.multiInstancePolicy` (z. B. `dedupeSessionScopedBilling: true`), um zu steuern, ob Kombinationsregeln session-weit oder zahnweit wirken.

## Abschnitt: Pro-Arzt-Defaults („Persona-Driven Settings“)
- Ein Accordion/Tabsystem (ähnlich Jeton Dock) listet alle Zahnärzte. Jeder Zahnarzt hat:  
  * Materialliste (z. B. „Superbond Dual-Cure“, „Zement X200“) als Chips mit Icons.  
  * `Standard Steps` (z. B. „Aufklärung Alternativen“, „Abdruck vorbereiten“, „Dokumentation Vitalität“).  
  * Eine „Askback-Policy“ Karte, in der man per Slider die Strenge eines Steps einstellbar macht (z. B. askback grenzt an „Kritisch“ vs „Optional“).  
- Jede Auswahl schreibt ins `settings.userOverrides` (z. B. `fact.useBondingAgent = true`, `source=settings.user->dr-lenz`).  
- Ein eingebauter „Praxis-Überblick“ oben zeigt, welche Defaults mehrere Zahnärzte teilen (Seeded defaults) und welche per User unterschiedlich sind.

## Trace & Feedback (rechts)
- „Trace Preview“ zeigt:  
  1. Fact → Chip → Text snippet (per `renderFromKbChips.ts`).  
  2. KB-Version (z. B. `kbVersion=2026-01-29`).  
  3. How Fact was sourced (Practice/Dictation/Askback/Manual).  
- „Control Center Preview“: Simuliert Page 2/3 mit Chips, Text und BillingRefs. Jede Änderung im Settings-Bereich aktualisiert den Simulator via `settingsResolver`.  
- „Open Questions“ Panel: listet Blocker (z. B. „Combability RULE_24 needs updated mapping“) und erlaubt, per Quick Link `npm run v10:practice-check` auszulösen.

## Datenmodell & Workflow
- Practice + User Settings speichern als Facts (`factOverrides[]`) sowie Referenzen auf Chips (`chipOverrides[]`), aber nie direkte BillingRefs. Die UI legt Tags `source=settings.practice` bzw. `source=settings.user.<id>`.  
- On Fetch: `settingsResolver.ts` lädt den letzten `practiceDefaultsVersion` + active user defaults. Diese Facts fließen in `runV10.ts` vor der Medical KB-Anwendung.  
- On Save: Firestore Provider `settingsStore.ts` persistiert (`/practices/{practiceId}/settings`), inkl. `kbVersion`, `lastTouchedBy`, `traceId`.  
- Die Control Center UI re-synchronisiert beim Öffnen (autosave + push). Jeder Wechsel in der Settings UI feuert `LLM suggestion training` event (optional) für zukünftige askback-optimizations.

## Ende des Designs
Diese Settings-Seite ist ein Jeton-Zugang zur SSOT-Welt: stilistisch vertraut (Jeton Hero + Dock), funktional tief mit Chips/Facts verwoben, und offen für Multi-Treatment & Trace-Erweiterungen. Wenn wir das genauso umsetzen, gibt es kaum noch Überraschungen beim späteren Control-Center und Billing-Output.
