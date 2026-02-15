# Askback Contract — Füllung (G2 Update)

**Version:** 1.1.0  
**Letzte Aktualisierung:** 2025-12-30

---

## Askback → Chip-Delta Matrix

| Askback ID | Trigger | Chip wenn JA | Chip wenn NEIN | Default |
|------------|---------|--------------|----------------|---------|
| `medical_ueberkappung` | cariesDepth=profunda | `+cp` | `+cp_not_required` | ❌ BLOCK |
| `medical_mkv_confirmed` | GKV+Side+Komposit+MKV=unknown | `+insurance_gkv_mkv` | ERROR | ❌ BLOCK |
| `medical_adhesive_technique` | mkvPresent=true+adhesive=unknown | `+filling_adhesive`, `+filling_layered` | `+filling_basic` + WARN | ❌ BLOCK |
| `medical_kofferdam` | kofferdamMentioned=true | `+isolation_kofferdam` | `+isolation_relative` | Nein (default) |

---

## Neue Regeln in medical_kb.v1.json

### MKV-Bestätigung
```json
{
    "id": "rule-mkv-required-for-side-composite",
    "when": ["insuranceTrack=gkv", "toothRegion=side", "material=komposit", "mkvPresent=unknown"],
    "then": [{"type": "require_askback", "target": "medical_mkv_confirmed"}]
}
```

### Adhäsivtechnik
```json
{
    "id": "rule-adhesive-technique-required-for-mkv",
    "when": ["mkvPresent=true", "adhesiveTechnique=unknown"],
    "then": [{"type": "require_askback", "target": "medical_adhesive_technique"}]
}
```

### Chip-Emission
```json
{
    "id": "rule-adhesive-yes-emits-filling-chips",
    "when": ["adhesiveTechnique=true"],
    "then": [{"type": "emit_chip", "target": "filling_adhesive"}, {"type": "emit_chip", "target": "filling_layered"}]
}
```

---

## Keine Billingcodes!

Diese Regeln emittieren NUR klinische Chips:
- `insurance_gkv_mkv`
- `filling_adhesive`
- `filling_layered`
- `filling_basic`
- `isolation_kofferdam`
- `isolation_relative`
- `cp`
- `cp_not_required`

Die Chips werden vom SSOT Renderer in unified.json auf BillingRefs gemappt.
