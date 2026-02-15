# GP4 — UI Playbook: Chips Visibility & Override

**Ziel:** Chips im normalen V10 Flow sichtbar und steuerbar machen

---

## Chips Summary Requirements

### Position
- Im Questions-Screen: unter der letzten Frage
- Im Output-Screen: oberhalb des Textes

### Darstellung
```
┌─────────────────────────────────────────┐
│  ACTIVE CHIPS                           │
│  ┌──────────────────────┐               │
│  │ fuellung_material_co │ ✓ Auto       │
│  │ Kompositfüllung      │              │
│  └──────────────────────┘               │
│  ┌──────────────────────┐               │
│  │ kofferdam           │ ✓ Manual     │
│  │ Kofferdam           │              │
│  └──────────────────────┘               │
└─────────────────────────────────────────┘
```

### Pro Chip anzeigen
- `chipId` (technisch)
- `name` (lesbar)
- `source`: Auto | Manual | Dictation
- `instanceScope` bei Multi-Tooth

---

## Chip Override (minimal)

### Erlaubt für diese 6 Kern-Chips
1. `fuellung_material_composite`
2. `fuellung_material_giz`
3. `kofferdam`
4. `fuellung_isolation_relative`
5. `fuellung_adhesivtechnik`
6. `fuellung_schichttechnik`
7. `fuellung_pulpaschutz`

### Override-States
- **Auto**: KB-Entscheidung
- **On**: Manuell aktiviert
- **Off**: Manuell deaktiviert

### Precedence-Regel
```
Dictation-Negation > Manual Override > Askback > Settings > Default
```

**NIEMALS** darf Manual Override eine Dictation-Negation überstimmen!

---

## Testids für E2E

| Element | data-testid |
|---------|-------------|
| Chips Container | `chips-summary` |
| Chip Item | `chip-{chipId}` |
| Chip Status | `chip-{chipId}-status` |
| Override Button | `chip-{chipId}-override` |

---

## Multi-Instance Scope

Bei Multi-Tooth muss jeder Chip seinen Scope zeigen:

```
┌─────────────────────────────────────────┐
│  CHIPS: Zahn 36                         │
│  [fuellung_material_composite] ✓        │
│  [kofferdam] ✓                          │
├─────────────────────────────────────────┤
│  CHIPS: Zahn 14                         │
│  [fuellung_material_composite] ✓        │
│  [fuellung_isolation_relative] ✓        │
└─────────────────────────────────────────┘
```

---

## Verifikation

### Smoke Test Checklist
- [ ] Chips Container erscheint im Output-Screen
- [ ] Mindestens 1 Chip wird angezeigt
- [ ] Chip-Name ist lesbar
- [ ] Chip-Source wird angezeigt

### Manueller Test
1. Dev Server starten
2. Golden Mode aktivieren
3. Diktat eingeben
4. Askbacks beantworten
5. Output-Screen → Chips Container prüfen
