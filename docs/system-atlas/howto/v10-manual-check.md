# V10 Manual Check Runbook

**Time:** 5 minutes  
**Prerequisite:** App running locally (`npm run dev`)

---

## Step 1: Navigate to V10 Page

1. Open browser: `http://localhost:5173/docudent/v10`
2. **Expected:** Warm gradient background, "V10" page loads

---

## Step 2: Basic Dictation Flow (Single Tooth)

1. Enter in dictation field:
   ```
   Füllung Zahn 36, okklusal, Caries profunda, Adhäsivtechnik
   ```
2. Click **"Run"** button (or press Enter)
3. **Expected:**
   - Loading spinner appears briefly
   - Output panel shows rendered documentation text
   - Billing codes visible (e.g., BEMA 13a/b)

---

## Step 3: Trigger Askbacks

1. Enter dictation (with unknown facts):
   ```
   Füllung 36 okklusal tiefe Karies
   ```
2. Click **"Run"**
3. **Expected:**
   - **Questions panel appears** (not output)
   - Questions like "Überkappung durchgeführt?" visible
   - Answer buttons (Ja/Nein) clickable

---

## Step 4: Answer and Verify Chip Delta

1. In questions panel, click **"Ja"** for Überkappung
2. **Expected:**
   - Question disappears or updates
   - If all required answered → Output appears
   - Output text includes "Überkappung" or related

---

## Step 5: Multi-Tooth Flow

1. Enter:
   ```
   Füllung 36 okklusal und 14 distal, Caries media
   ```
2. Click **"Run"**
3. **Expected:**
   - Multi-instance handling (questions per tooth or combined)
   - Output shows both teeth (36, 14)
   - Billing codes deduplicated correctly (session vs tooth scope)

---

## Step 6: Multi-Treatment Test Cases

### Case 1: Basic Multi-Tooth
```
36 okklusal Komposit, danach 14 distal
```
**Expected:** 2 separate instances, separate questions, separate output.

### Case 2: Shared Attribute
```
36 okklusal Komposit, 14 distal auch, beide adhäsiv
```
**Expected:** Both instances get adhesive chip.

### Case 3: Scoped Negation
```
36 okklusal Komposit ohne Kofferdam; 14 distal mit Kofferdam
```
**Expected:** 36 gets "ohne Kofferdam", 14 gets "mit Kofferdam" - NO leak.

---

## Step 7: Golden Mode (DEV only)

1. Add query param: `?golden=1`
2. Reload page
3. Enter any dictation and run
4. **Expected:**
   - Facts are pre-set to trigger askbacks
   - Questions appear regardless of extraction
   - Answers work normally

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No questions appear | Facts not unknown | Use golden mode or "tiefe Karies" |
| Build fails | V7 imports crept in | Run gate: `npx vitest run gate-v10-no-imports-from-v7` |
| Output blank | Renderer issue | Check console for SSOT errors |
| Questions stuck | Answer not applied | Check answerQuestion handler |

---

## Verification Summary

| Check | Pass Criteria |
|-------|---------------|
| Page loads | Warm gradient visible |
| Single dictation | Output appears with text + billing |
| Askbacks trigger | Questions panel for unknown facts |
| Answers work | Clicking Ja/Nein updates state |
| Multi-tooth | Both teeth in output |

---

## MVP Check ohne Browser (CLI)

**Time:** 2 minutes  
**No browser required**

### Quick Check

```bash
npm run v10:mvp-smoke
```

**Expected:** 12/12 tests pass (Füllung scenarios)

### Full Truth Run

```bash
npx vitest run src/docudent/__tests__/gates/gate-mvp-truth-run.test.ts
```

**Expected:** 12/12 pass with:
- All output states (no errors)
- No empty text in perInstance
- GKV has BEMA billing
- No GOZ in GKV cases
- perInstance present (no global fallback)

### 15 Scenario Matrix

| ID | Dictation | Insurance | Expected |
|----|-----------|-----------|----------|
| 1 | Füllung 36 okklusal Komposit | GKV | BEMA_13, text > 100 |
| 2 | Füllung 36 okklusal distal Komposit | GKV | BEMA_13, 2fl |
| 3 | Füllung 36 und 37 okklusal | GKV | 2 instances |
| 4 | Füllung 46 mod mit Kofferdam | GKV | BEMA_13 + BEMA_12 |
| 5 | Füllung 14 distal GIZ | GKV | BEMA_13, material=GIZ |
| 6 | Füllung 36 okklusal Bulkfill | GKV | BEMA_13, bulkfill |
| 7 | Füllung 36 okklusal adhäsiv | PKV | GOZ_2060 |
| 8 | Füllung 14 mod Mehrschicht Kofferdam | PKV | GOZ_2060 + GOZ_2040 |
| 9 | Füllung 24 und 25 okklusal | PKV | 2 instances, GOZ |
| 10 | Füllung 36 Mehrschichttechnik Mehrkosten | MKV | BEMA_13 |
| 11 | Füllung 36 mod Adhäsivtechnik MKV | MKV | BEMA_13 |
| 12 | Füllung 46 okklusal MKV Kofferdam | MKV | BEMA_13 + BEMA_12 |
| 13 | Füllung 36 ohne Kofferdam; 37 mit Kofferdam | GKV | Scoped negation |
| 14 | Füllung 36 profunda Ca(OH)2 | GKV | Cp askback |
| 15 | Füllung 36 okklusal 47 distal | GKV | 2 teeth, no leak |

### Hard Fails

- ❌ Empty text in output state
- ❌ Missing perInstance (global fallback used)
- ❌ GOZ code in GKV case
- ❌ Questions stuck (count > 0 with no pending)

### Report Artifacts

- `docs/system-atlas/artifacts/_latest/v10-mvp-truth/report.json`
- `docs/system-atlas/artifacts/_latest/v10-mvp-truth/summary.md`
