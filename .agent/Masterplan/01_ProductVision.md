# 01 — Produktvision

> **Stand:** 2025-12-12  
> **Source of Truth:** Code + Tests

---

## Kerngedanke

> **„Zahnarzt diktiert nur variable Informationen — Software dokumentiert & rechnet korrekt ab"**

Docudent ist eine **AI-gestützte Dokumentations- und Abrechnungsengine** für Zahnärzte.

---

## Das Problem

Zahnärzte verbringen täglich Stunden mit:
- Dokumentation nach jeder Behandlung
- Abrechnungscodes heraussuchen
- Regressfallen vermeiden
- Optimierungspotenzial erkennen

**Docudent löst das vollständig automatisiert.**

---

## Die Lösung

Der Arzt diktiert nur das, was variabel ist:

```
"36 MOD, tief, LA, Kofferdam"
```

Das System übernimmt:

| Aufgabe | Status | Nachweis |
|---------|--------|----------|
| Transkription | **PROVEN** | Whisper API integriert |
| Normalisierung | **PROVEN** | 58 Ugly Whisper Tests |
| Abrechnungscodes | **PROVEN** | 361 Tests, SSOT Scanner |
| Regress-Prüfung | **PARTIAL** | 32 Regeln, ~10 getestet |
| Forensische Doku | **PROVEN** | 147 Golden Output Tests |
| Rückfragen | **PROVEN** | Golden Master Tests |
| Upsell | **PARTIAL** | Engine vorhanden, UI basic |

---

## Zielgruppe

- **Hauptzielgruppe:** Zahnärzte in Einzelpraxen und Gemeinschaftspraxen
- **Sekundär:** Zahnmedizinische Fachangestellte (ZFA)
- **Tertiär:** Abrechnungsdienstleister

---

## Unique Value Proposition

| Feature | Status | Nachweis |
|---------|--------|----------|
| Diktat-first | **PROVEN** | V6 UI implementiert |
| SSOT-Engine | **PROVEN** | SSOT Compliance Scanner |
| Regelgetrieben | **PROVEN** | 62 Golden Master Tests |
| Multi-Treatment | **NOT TESTED** | Engine-Architektur vorhanden, UI fehlt |

---

## Leitprinzipien

1. **Die Datenbank ist das Gehirn** — nicht die LLM → **PROVEN**
2. **Fragen entstehen aus Regeln** — nicht kreativ → **PROVEN**
3. **Alles aus JSON** — erweiterbar ohne Code → **PROVEN**
4. **Arzt diktiert nur Variablen** — System macht den Rest → **PROVEN**
