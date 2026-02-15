## Legacy Medical KB (V7)

This folder contains the legacy Medical KB with **emit_chip** rules and concept emitters.

**Purpose:**
- Keep V7 behavior stable (V7 still relies on `medical_kb.v1.json` with chip emission).
- Provide an explicit legacy artifact for migration audits.

**V10 behavior:**
- V10 uses `medical_kb.v1.v10.json` (no chip emission).
- Chip emission is owned by Procedure nodes.
- Askbacks/defaults remain in the KB.

**Do not edit for V10 behavior.**
