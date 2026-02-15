# ExplainRun (V10) — HowTo

Generate a deterministic, end-to-end trace report for a single V10 run
extraction → facts → rules → chips → billing → text.

## Command

```bash
npm run v10:explain-run -- --dictation "Zahn 36 mo Komposit, Okklusion geprüft." --treatment fuellung --insurance GKV
```

## Output

Reports are written to:

```
docs/system-atlas/artifacts/_latest/v10-explain-run/
```

Files:
- `report.json` — full structured report
- `report.md` — human-readable markdown
- `summary.md` — quick overview (state + hash)

## Notes

- Use `--textLength kurz|mittel|lang` to mirror UI settings.
- If the run ends in `questions`, the report still includes extraction + facts + askbacks.
