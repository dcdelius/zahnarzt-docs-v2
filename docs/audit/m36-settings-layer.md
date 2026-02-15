# M36 Settings Layer

## Summary

| Metric | Value |
|--------|-------|
| Settings Types | 2 (Practice, User) |
| UI Components | 3 |
| Gates | 3 |

---

## Settings Types

[settingsTypes.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/settings/settingsTypes.ts)

### PracticeSettings (Praxisweit)
- `defaultIsolation`: kofferdam | relative | none
- `defaultWLMethod`: elektrisch | roentgen | both
- `defaultWFTechnique`: kalt | warm | einzel
- `defaultIrrigationProtocol`: naocl_edta | naocl_only | none

### UserSettings (Pro User)
- `defaultLAType`: infiltration | leitung | none
- `defaultCappingMaterial`: caoh2 | mta | biodentin
- `preferredTextLength`: kurz | mittel | lang
- `skipAskbacks`: string[]

---

## Askback Policy

```typescript
// Priority: dictation > user > practice > default
// If settings provide value → no askback
// If dictation contradicts → askback

getSettingsValueForAskback(askbackId, settings)
// Returns: value | '__skip__' | undefined
```

---

## Components

| Component | Purpose |
|-----------|---------|
| [V10SettingsDrawer](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10SettingsDrawer.tsx) | Modal with Practice/User tabs |
| [V10ChipsPanel](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10ChipsPanel.tsx) | Editable chips with source badges |
| [useSettings](file:///Users/david/dokumaster-ui/src/docudent/v10/settings/useSettings.ts) | Hook with localStorage persistence |

---

## Gates

| Gate | Purpose |
|------|---------|
| gate-m36-settings-reduce-askbacks | Settings provide values for askbacks |
| gate-m36-settings-are-billing-eligible | Settings sources generate billing |
| gate-m36-settings-provenance-present | Hash + version tracking |

---

## Commands

```bash
# M36 only
npx vitest run src/docudent/__tests__/gates/gate-m36*.test.ts --reporter=verbose

# All M-gates
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

---

## Files

```
src/docudent/v10/settings/settingsTypes.ts
src/docudent/v10/settings/useSettings.ts
src/docudent/v10/components/V10SettingsDrawer.tsx
src/docudent/v10/components/V10SettingsDrawer.css
src/docudent/v10/components/V10ChipsPanel.tsx
src/docudent/v10/components/V10ChipsPanel.css
src/docudent/__tests__/gates/gate-m36-*.test.ts (3 files)
docs/audit/m36-settings-layer.md
```
