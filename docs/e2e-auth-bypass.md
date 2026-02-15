# E2E Auth Bypass - Technical Documentation

## Problem: Firebase Auth + Playwright storageState

Firebase Auth speichert Tokens in **IndexedDB**, nicht in cookies/localStorage.
Playwright's `storageState` kann nur cookies + localStorage persistieren → Auth geht bei jedem Test-Reload verloren.

**Symptom:** Tests müssen sich jedes Mal neu einloggen → Login-Latenz → Timeouts.

---

## Lösung: App-seitiger Auth Bypass

Statt echtem Login: Mock-User direkt im AuthContext setzen.

**Location:** `src/contexts/AuthContext.jsx`

### Aktivierung

Der Bypass wird **nur aktiviert wenn ALLE Bedingungen erfüllt sind:**

| Guard | Check |
|-------|-------|
| 1. Build-Flag | `VITE_E2E_BYPASS_AUTH=1` |
| 2. Localhost | `window.location.hostname === 'localhost'` |
| 3. Automated | `navigator.webdriver === true` |
| 4. Handshake | `window.__DOCUDENT_E2E_BYPASS_AUTH === true` |

Wenn Flag gesetzt aber Guards fehlen → normaler Auth-Flow, einmaliges `console.warn`.

### Mock User

```javascript
{
  uid: 'e2e-test-user',
  email: 'e2e@local.test',
  displayName: 'E2E Test User'
}
```

---

## Playwright Setup

### Handshake setzen (VOR Navigation)

```typescript
async function setE2EHandshake(page: Page): Promise<void> {
    await page.addInitScript(() => {
        window.__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
}
```

### In playwright.config.ts

```typescript
webServer: {
    command: 'VITE_E2E_BYPASS_AUTH=1 npm run build && npm run preview -- --port 4173',
    // ...
}
```

---

## Lokale Ausführung

```bash
# E2E Suite (10 Tests)
npm run e2e:v10:wiring

# Full confidence check (build + gates + E2E)
npm run e2e:full
```

---

## Troubleshooting

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Login-Page erscheint | Handshake fehlt | `setE2EHandshake(page)` vor `page.goto()` |
| "guards failed" Warning | Nicht localhost | Tests nur auf localhost:4173 ausführen |
| Bypass funktioniert nicht | Flag fehlt | `VITE_E2E_BYPASS_AUTH=1` in webServer command |

---

## Sicherheit

- **Production:** Vite stripped VITE_* env vars in prod builds (wenn nicht explizit gesetzt)
- **Even if flag leaks:** Guards verhindern Bypass außerhalb von localhost + Playwright
- **Kill-Switch Test:** `e2e/v10-wiring.e2e.spec.ts` Test 10 verifiziert Guards
