# 10 — MVP Scope

> **Stand:** 2025-12-12  
> **Source of Truth:** Test-Gates + Code

---

## MVP Definition

### ✅ Implementiert & Getestet

| Feature | Status | Gate |
|---------|--------|------|
| **Versicherungsmodi** | | |
| GKV | ✅ | Golden Master, Golden Output |
| PKV | ✅ | Golden Master, Golden Output |
| GKV + MKV | ✅ | Golden Master, Golden Output |
| **Behandlungstypen** | | |
| Füllung | ✅ | 147 Golden Output Tests |
| Endo | ❌ | JSON nicht vorhanden |
| Chirurgie | ❌ | JSON nicht vorhanden |
| **Engine-Features** | | |
| Chip-based Billing | ✅ | SSOT Compliance |
| Rule-driven Questions | ✅ | Golden Master |
| SSOT Output System | ✅ | Golden Output v2 |
| Kombinationsregeln | ✅ | Conflict Fuzzer |
| EvidenceRefs | ✅ | Golden Output Evidence Gate |
| **UI-Features** | | |
| Dictation Step | ✅ | E2E Smoke |
| Questions Step | ✅ | E2E Smoke |
| Output Step | ✅ | E2E Smoke |

---

## Gate-Nachweis

```bash
npm run proof-pack     # 363 Tests, Exit 0 = PASS
```

| Gate | Tests | Status |
|------|-------|--------|
| SSOT Compliance | 1 | ✅ |
| Golden Master | 62 | ✅ |
| Golden Output v2 | 147 | ✅ |
| Property Tests | 20 | ✅ |
| Gesamt | 363 | ✅ |

---

## ❌ Post-MVP (nicht implementiert)

| Feature | Priorität |
|---------|-----------|
| Endo JSON + Regeln | Hoch |
| Chirurgie JSON | Hoch |
| Prophylaxe | Mittel |
| ZE (Zahnersatz) | Mittel |
| Kinderlogik | Niedrig |
| BG (Berufsgenossenschaft) | Niedrig |
| Multi-Tooth in einem Diktat | Mittel |

---

## Timeline

| Phase | Inhalt | Status |
|-------|--------|--------|
| Phase 1 | Füllung komplett | ✅ (363 Tests) |
| Phase 2 | Endo + Chirurgie | 🔜 Next |
| Phase 3 | Prophylaxe + Schmerz | Planned |
