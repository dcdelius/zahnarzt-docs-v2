# Hosted V10 Audit 20 Cases

- Date: 2026-02-18T01:15:13.475Z
- Base URL: http://localhost:4173
- Auth Mode: localBypass=true, forceRealAuth=false
- Cases: 1
- Summary: extraction.llm=0/1, preanalysis.llm=0/1, preanalysis.fallback=1/1, preanalysis.loginRequired=1/1

## S1 — GKV Füllung MOD
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required
- Askbacks (erkannt): none
- Askbacks (beantwortet): 0
- Billing: BEMA_12B, BEMA_13C, BEMA_41A
- Output excerpt: [BEFUND] Zahn 36. MOD [AUFKLÄRUNG] Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert. [BEHANDLUNGSABLAUF] Zunächst Leitungsanästhesie N. alv. inf. (Ultracain D-S, A
- Output fulltext:
```text
[BEFUND]

Zahn 36. MOD

[AUFKLÄRUNG]

Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion). Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[BEHANDLUNGSABLAUF]

Zunächst Leitungsanästhesie N. alv. inf. (Ultracain D-S, Articain 4% + Adrenalin 1:200.000). Daraufhin Kofferdam angelegt. Im Weiteren Zahn 36 (MOD): Füllungstherapie. Anschließend Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Abschließend Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.

[DURCHGEFÜHRTE LEISTUNGEN]

• LA Leitung.
• Kofferdam.

[HINWEISE]

Der Patient wurde über Verhaltensregeln nach der Behandlung informiert. Aufgrund der lokalen Betäubung wurde der Patient auf die vorübergehende Taubheit hingewiesen sowie darauf, erst nach Abklingen der Betäubung zu essen.

[ABRECHNUNG]

Kassenleistung (BEMA):
  41a – Leitungsanästhesie, intraoral
  12 – Besondere Maßnahmen beim Präparieren oder Füllen (Separieren, Beseitigen störenden Zahnfleisches, Anlegen von Spanngummi, Stillung einer übermäßigen Papillenblutung), je Sitzung, je Kieferhälfte oder Frontzahnbereich
  13c – Füllung dreiflächig
```

