# G111 — Chips as Control Center

**Purpose:** Chips = SSOT, must be visible in main UI, not just Debug

---

## Chip Display Contract

### Required Chip Properties

| Property | Description | UI Display |
|----------|-------------|------------|
| `id` | Chip identifier | "mehrschicht", "kofferdam" |
| `status` | on / off / auto | Badge or toggle state |
| `source` | Where it came from | "Diktat", "Rückfrage", "Standard" |

### Status Values

| Status | Meaning | Visual |
|--------|---------|--------|
| `on` | Chip is active | Green dot, filled |
| `off` | Chip is inactive | Grey, outline |
| `auto` | Auto-derived from rules | Blue, "auto" badge |

### Source Values

| Source | German Label | Icon |
|--------|--------------|------|
| `dictation` | "Aus Diktat" | 🎤 |
| `askback` | "Aus Rückfrage" | ❓ |
| `default` | "Standardwert" | ⚙️ |
| `settings` | "Einstellung" | 📋 |

---

## Chip Click Behavior

### Information Display

When user clicks a chip:
```
┌─────────────────────────────────────┐
│ Chip: mehrschicht                   │
│ Status: aktiv                       │
│ Quelle: Rückfrage (adhesive = yes)  │
│                                     │
│ Text: "Mehrschichttechnik..."       │
│ Billing: GOZ_2197 (nur MKV)         │
└─────────────────────────────────────┘
```

### Manual Override (Golden Mode Only)

In `goldenMode`, allow toggling chips:
- Toggle on/off
- Shows immediate output preview change

**Production:** Chips are read-only (derived from rules)

---

## UI Location

### Option A: Inline in Output

```
┌─────────────────────────────────────┐
│ Output Text...                       │
│                                      │
│ Chips: [la_leitung] [mehrschicht]   │
│        [rel_trocken] [finishing]    │
└─────────────────────────────────────┘
```

### Option B: Collapsible Panel

```
┌─────────────────────────────────────┐
│ ▼ Aktive Chips (5)                  │
│   • la_leitung (Diktat)             │
│   • mehrschicht (Rückfrage)         │
│   • rel_trocken (Standard)          │
│   • exkavation (auto)               │
│   • finishing (auto)                │
└─────────────────────────────────────┘
```

---

## SSOT Invariant

> **Every line of output text traces back to exactly one chip.**
> **UI may NEVER modify billing or text directly.**

```
Output: "Leitungsanästhesie N. alv. inf."
        ↑
        └── Chip: la_leitung
            └── KB: fuellung/unified.json#la_leitung.textSnippets.mittel
```

---

## Existing Component

`V10ChipsPanel.tsx` exists in `src/docudent/v10/components/`.

Should be exposed in main flow, not just Debug drawer.
