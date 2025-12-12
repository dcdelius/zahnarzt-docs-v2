# 09 — UX Flow & Dictation

> **Stand:** 2025-12-12  
> **Source of Truth:** V6 UI Components

---

## Status: PROVEN

| Komponente | Status | Nachweis |
|------------|--------|----------|
| DictationStep | **PROVEN** | E2E Smoke Tests |
| QuestionsStep | **PROVEN** | E2E Smoke Tests |
| OutputStep | **PROVEN** | E2E Smoke Tests |
| Versicherungs-Toggle | **PROVEN** | 10 Fixtures |
| Jeton-Style Design | **PROVEN** | UI implementiert |

---

## Design-Philosophie

> **Visuelles Konzept: Jeton-inspiriert**

**Status: PROVEN** (UI implementiert)

- Pills statt Buttons ✅
- Smooth motion ✅
- Coral gradient ✅
- Typographie statt Karten ✅

---

## Layout-Struktur

**Status: PROVEN**

```
┌────────────────────────────────────────────┐
│                  Header                    │
├──────────────────────┬─────────────────────┤
│   Diktat / Voice     │  Versicherungswahl  │
│   [GKV] [MKV] [PKV]  │  Behandlungstyp     │
└──────────────────────┴─────────────────────┘
```

---

## Multi-Step Flow

**Status: PROVEN** (E2E Smoke)

```
[Dictation] → [Questions] → [Output]
```

| Step | Status |
|------|--------|
| Dictation | **PROVEN** |
| Questions | **PROVEN** |
| Output | **PROVEN** |

---

## Visuelle Elemente

| Element | Status |
|---------|--------|
| Pills (Chips) | **PROVEN** |
| Billing Pills (BEMA coral, GOZ purple) | **PROVEN** |
| Smooth Transitions | **PROVEN** |
| Responsive Layout | **PARTIAL** |
