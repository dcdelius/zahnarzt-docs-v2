# Askbacks Proposal — Füllungstherapie

**Regel:** Jeder Askback muss exakt 1 Chip-/Fact-Effekt haben + Default wenn unbeantwortet.

---

## Obligatorische Askbacks (blocking)

### 1. insurance_type

| Eigenschaft | Wert |
|-------------|------|
| **Trigger** | `insuranceTrack === undefined` |
| **Frage** | "Welche Versicherungsart hat der Patient?" |
| **Optionen** | GKV, PKV |
| **Chip wenn GKV** | `+insurance_gkv_basic` (initial) |
| **Chip wenn PKV** | `+insurance_private` |
| **Default** | ❌ BLOCK — muss beantwortet werden |

---

### 2. mkv_confirmed

| Eigenschaft | Wert |
|-------------|------|
| **Trigger** | `insuranceTrack === 'gkv' && toothRegion === 'side' && material === 'komposit' && mkvPresent === undefined` |
| **Frage** | "Liegt eine schriftliche Mehrkostenvereinbarung vor?" |
| **Optionen** | Ja, Nein |
| **Chip wenn Ja** | `-insurance_gkv_basic`, `+insurance_gkv_mkv` |
| **Chip wenn Nein** | ERROR: "Seitenzahn-Komposit ohne MKV nicht dokumentierbar" |
| **Default** | ❌ BLOCK — muss beantwortet werden |

---

### 3. adhesive_technique

| Eigenschaft | Wert |
|-------------|------|
| **Trigger** | `mkvPresent === true && adhesiveTechnique === undefined` |
| **Frage** | "Wurde Adhäsivtechnik (Mehrschicht) angewendet?" |
| **Optionen** | Ja, Nein |
| **Chip wenn Ja** | `+filling_adhesive`, `+filling_layered` |
| **Chip wenn Nein** | `+filling_basic`, WARN |
| **Default** | ❌ BLOCK — beeinflusst Abrechnung erheblich |

---

### 4. capping_performed

| Eigenschaft | Wert |
|-------------|------|
| **Trigger** | `cariesDepth === 'profunda' && cappingPerformed === undefined` |
| **Frage** | "Wurde eine Überkappung durchgeführt?" |
| **Optionen** | Ja, Nein |
| **Chip wenn Ja** | `+capping_indirect` |
| **Chip wenn Nein** | `+capping_not_required` |
| **Default** | ❌ BLOCK — medizinisch relevant |

---

## Optionale Askbacks (mit Defaults)

### 5. kofferdam_used

| Eigenschaft | Wert |
|-------------|------|
| **Trigger** | `kofferdamMentioned === true && kofferdamUsed === undefined` |
| **Frage** | "Wurde Kofferdam angelegt?" |
| **Optionen** | Ja, Nein |
| **Chip wenn Ja** | `+isolation_kofferdam` |
| **Chip wenn Nein** | `+isolation_relative` |
| **Default** | Nein → `+isolation_relative` |

---

### 6. anesthesia_type

| Eigenschaft | Wert |
|-------------|------|
| **Trigger** | `anesthesiaMentioned === true && anesthesiaType === undefined && toothRegion === 'side' && quadrant in [3,4]` |
| **Frage** | "Welche Anästhesie wurde durchgeführt?" |
| **Optionen** | Leitungsanästhesie, Infiltration |
| **Chip wenn Leitung** | `+anesthesia_block` |
| **Chip wenn Infiltration** | `+anesthesia_infiltration` |
| **Default** | Leitung (UK-Seitenzahn Standard) |

---

## Verbotene Askbacks

| Frage | Grund |
|-------|-------|
| "Welches Material?" | Muss aus Diktat extrahiert werden |
| "Wieviele Flächen?" | Muss aus Diktat extrahiert werden |
| "Welche Abrechnungsart?" | Aus insuranceTrack ableitbar |
| "Adhäsivtechnik?" bei PKV | Immer ja (Standard) |

---

## Zusammenfassung

| # | Askback | Blocking | Chip-Effekt |
|---|---------|----------|-------------|
| 1 | `insurance_type` | ✅ | +insurance_* |
| 2 | `mkv_confirmed` | ✅ | +insurance_gkv_mkv |
| 3 | `adhesive_technique` | ✅ | +filling_adhesive/basic |
| 4 | `capping_performed` | ✅ | +capping_* |
| 5 | `kofferdam_used` | ❌ | +isolation_* |
| 6 | `anesthesia_type` | ❌ | +anesthesia_* |

**Total:** 6 Askbacks, 4 blocking, 2 optional mit Defaults
