# Extraction Keywords v3 — Dictation → Facts Mapping

**GP3: Welche Wörter mappen auf welche Facts**

---

## Keyword → Fact Mapping

| Keyword (DE) | Fact Field | Value | Confidence |
|--------------|------------|-------|------------|
| Kassenpatient | insurance_context | gkv_regelversorgung | high |
| GKV | insurance_context | gkv_regelversorgung | high |
| Mehrkosten | insurance_context | gkv_mehrkosten | high |
| MKV | insurance_context | gkv_mehrkosten | high |
| Privatpatient | insurance_context | pkv | high |
| PKV, privat | insurance_context | pkv | high |
| --- | --- | --- | --- |
| Glasionomerzement, GIZ, Ketac | restoration_material | giz | high |
| selbstadhäsiv, RMGI | restoration_material | self_adhesive | high |
| Bulk-Fill, Bulkfill | restoration_material | bulk_fill | high |
| Komposit, Composite | restoration_material | composite | high |
| --- | --- | --- | --- |
| Seitenzahn, Molar, Prämolar, 14-17, 24-27, 34-37, 44-47 | tooth_region | posterior | derived |
| Frontzahn, Schneidezahn, 11-23, 31-33, 41-43 | tooth_region | anterior | derived |
| --- | --- | --- | --- |
| klein, kleine Kavität | cavity_extent_hint | small | medium |
| mittel, mittlere | cavity_extent_hint | medium | medium |
| groß, großflächig, ausgedehnt | cavity_extent_hint | large | medium |
| --- | --- | --- | --- |
| mesial, distal, approximal | approx_contact_involved | yes | high |
| rein okklusal, nur o | approx_contact_involved | no | medium |
| --- | --- | --- | --- |
| Adhäsiv, Ätzung, Primer, Bond | adhesive_technique | yes | high |
| kein Adhäsiv, ohne Ätzung | adhesive_technique | no | high |
| --- | --- | --- | --- |
| Schichttechnik, inkrementell, Mehrschicht | layering_technique | yes | high |
| einfach, bulk (aber nicht Bulk-Fill) | layering_technique | no | medium |
| --- | --- | --- | --- |
| Kofferdam, absolute Trockenlegung | isolation_level | kofferdam | high |
| relativ, Watterollen | isolation_level | relative | high |
| --- | --- | --- | --- |
| tief, tiefe Karies, pulpanah, caries profunda | caries_depth | deep | high |
| oberflächlich, klein | caries_depth | shallow | medium |
| --- | --- | --- | --- |
| Liner, CaOH | pulp_protection | liner | high |
| Unterfüllung, Base | pulp_protection | base | high |
| --- | --- | --- | --- |
| subgingival, gingival | subgingival_margin | yes | high |
| feucht, schwierig, Speichel | moisture_control_difficulty | difficult | medium |
| --- | --- | --- | --- |
| Kind, Milchzahn, pädiatrisch | patient_group | pediatric | high |
| schwanger, stillend | patient_group | pregnancy_lactation | high |
| --- | --- | --- | --- |
| Teilmatrize, Sektionalmatrize | matrix_used | sectional | high |
| Tofflemire, Ringmatrize | matrix_used | tofflemire | high |

---

## NICHT-Ableitungen (Forbidden)

| Keyword | NICHT ableiten | Warum |
|---------|----------------|-------|
| Komposit | adhesive=yes | Muss bestätigt werden |
| GKV | material=self_adhesive | MKV-Option |
| tief | pulp_protection=yes | Behandler-Entscheidung |
| (kein Keyword) | isolation=relative | Askback nötig |

---

## Stub Mode Verhalten

```typescript
if (stubMode && dictation.includes('Füllung')) {
    // Set unknowns for askback triggering
    facts.insurance_context = 'unknown';
    facts.restoration_material = 'unknown';
    facts.adhesive_technique = 'unknown';
    // ... more unknowns
}
```

---

## LLM Adapter Validation

```typescript
// Wenn "Komposit Seitenzahn" und adhesive fehlt:
if (facts.restoration_material === 'composite' 
    && facts.tooth_region === 'posterior'
    && facts.adhesive_technique === undefined) {
    facts.adhesive_technique = 'unknown'; // NOT false!
}
```
