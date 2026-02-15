# Repro Playbook

Bug melden in 30 Sekunden.

## 1. Copy Repro JSON

Im Debug Drawer → Explain Tab → **Copy Repro JSON**

## 2. Paste in Bug Report

```
Diktat: "Endo 14 WF"
Erwartet: LA-Code
Actual: kein LA

Repro:
{paste JSON here}
```

## 3. Run Repro (Empfänger)

Debug Drawer → **Paste Repro JSON** → **Import & Run**

→ Exakt gleicher State + gleicher Explain Hash

---

## Explain Hash

Der Hash am Ende zeigt ob Output deterministisch war:

- Gleicher Hash = gleicher Output ✅
- Anderer Hash = was hat sich geändert? 🔍

---

## Minimal Repro

**Copy Minimal** entfernt KB-Meta und testOnly flags.
