# Billing Staging Database

Temporäre Datenbank für kuratierte Abrechnungsdaten.

## Workflow
1. **Sammeln** - Daten aus 3 Arbeitsaufträgen hier ablegen
2. **Strukturieren** - Einheitliches Schema anwenden
3. **Merge** - Mit `knowledgeBase/` abgleichen und vervollständigen

## Dateien
| Datei | Beschreibung |
|-------|--------------|
| `bema_codes.json` | BEMA Leistungspositionen |
| `goz_codes.json` | GOZ Leistungspositionen |
| `regeln.json` | Frequenz-, Kombinations-, Ausschlussregeln |
| `behandlungen.json` | Behandlungsabläufe |

## Status
- [ ] Arbeitsauftrag 1
- [ ] Arbeitsauftrag 2
- [ ] Arbeitsauftrag 3
- [ ] Finale Merge mit knowledgeBase
