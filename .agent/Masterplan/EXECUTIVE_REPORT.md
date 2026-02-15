# Executive Report — Masterplan Status

> **Datum:** 2025-12-12  
> **Gate-Status:** 361 Tests PASS

---

## 🟢 WAS IST STABIL (PROVEN)

| Komponente | Tests | Nicht anfassen |
|------------|-------|----------------|
| **TreatmentEngine** | 361 | Core Billing Logic |
| **OutputComposer** | 147 | Template Rendering |
| **SSOT Database** | SSOT Scanner | JSON-Struktur |
| **Tooth Normalizer** | 58 | Normalisierung |
| **Golden Output** | 147 | Evidence + Style |
| **V6 UI Flow** | E2E | 3-Step Flow |
| **Insurance Routing** | 23 | GKV/PKV/MKV |

### Gate-Kommando
```bash
npm run proof-pack   # 361 Tests, Exit 0 = PASS
```

---

## 🟡 WAS IST PARTIAL (Vorsicht)

| Komponente | Status | Risiko |
|------------|--------|--------|
| Kombinationsregeln | 32 Regeln, ~10 getestet | Regress unentdeckt |
| Audit-Engine | Basis ok, nicht vollständig | Warnungen fehlen |
| Upsell-Logik | Engine ok, UI basic | Revenue-Loss |

---

## 🔴 WAS FEHLT (NOT TESTED / NOT STARTED)

| Feature | Status | Priorität |
|---------|--------|-----------|
| Endo JSON | NOT STARTED | **HOCH** |
| Chirurgie JSON | NOT STARTED | **HOCH** |
| Multi-Treatment UI | NOT TESTED | POST-MVP |
| Prophylaxe | NOT STARTED | Mittel |
| ZE (Zahnersatz) | NOT STARTED | Mittel |
| Kinderlogik | NOT STARTED | Niedrig |

---

## ⏭️ NÄCHSTER LOGISCHER SCHRITT

### Option A: Horizontal (mehr Behandlungen)
```
1. endo_unified.json erstellen (10 Chips)
2. endo_regeln.json erstellen (5 Regeln)
3. 5 Endo Golden Fixtures
4. Tests auf 400+ bringen
```

### Option B: Vertikal (Füllung härten)
```
1. Alle 32 Regeln testen
2. Dedizierte Kombinationsregel-Suite
3. Regress-Szenarien als Fixtures
```

**Empfehlung:** Option A (Endo) für Produktbreite, dann Option B.

---

## 🚫 NICHT ANFASSEN

| Komponente | Grund |
|------------|-------|
| `treatmentEngine.ts` | 361 Tests hängen davon ab |
| `outputComposer.ts` | 147 Evidence Tests |
| `fuellung_unified.json` | Produktiv-Chips |
| `kataloge/*.json` | SSOT für Codes |
| `toothNormalizer.ts` | 58 Tests |

**Regel:** Änderungen an diesen Dateien → `npm run proof-pack` MUSS 0 bleiben.

---

## ZUSAMMENFASSUNG

| Metrik | Wert |
|--------|------|
| Tests | 361 |
| PROVEN Features | 12 |
| PARTIAL Features | 3 |
| NOT TESTED | 6 |
| Behandlungstypen | 1 (Füllung) |
| Nächster Schritt | Endo JSON |
