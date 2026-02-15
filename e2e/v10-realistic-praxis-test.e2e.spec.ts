/**
 * DEPRECATED: This E2E test is not canonical.
 * Use scenario-run summaries in docs/system-atlas/artifacts/_latest/.
 *
 * V10 Realistischer Praxis-Test - Final Version
 * 
 * Testet einen typischen Praxis-Workflow:
 * - Zahn 26 MOD (3flächig) mit Komposit
 * - Zahn 36 okklusal (1flächig) mit Bulk-Fill
 * - GKV mit Mehrkostenvereinbarung
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

const TEST_SZENARIO = {
    titel: "Doppelte Füllungstherapie: Zahn 26 MOD + Zahn 36 okklusal",
    diktat: `Patientin hat an Zahn 26 MOD eine tiefe Karies. 
    Füllungstherapie mit Komposit in Mehrschichttechnik, 
    Kofferdam angelegt, Leitungsanästhesie. 
    An Zahn 36 okklusal eine kleine Karies, 
    mit Bulk-Fill in Einfülltechnik ohne Kofferdam, 
    Infiltrationsanästhesie. 
    Mehrkostenvereinbarung für Komposit liegt vor.`,
    versicherung: 'GKV' as const,
    mkv: true,
};

async function setupPage(page: Page): Promise<void> {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
    
    await page.route('**/firestore.googleapis.com/**', route => route.abort());
    await page.route('**/firebaseio.com/**', route => route.abort());
    
    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 15000 });
}

async function beantworteFragen(page: Page): Promise<void> {
    console.log('\n📋 BEANTWORTE RÜCKFRAGEN:\n');
    
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/01-fragen-start.png' });
    
    // Wir beantworten bis zu 15 Fragen
    for (let i = 0; i < 15; i++) {
        // Prüfe ob wir beim Output sind
        const outputPanel = page.locator('[data-testid="v10-output-panel"]');
        if (await outputPanel.isVisible({ timeout: 500 }).catch(() => false)) {
            console.log('✅ Output erreicht!');
            return;
        }
        
        // Aktuellen Status loggen
        const pageText = await page.locator('body').textContent().catch(() => '');
        const erforderlichMatch = pageText.match(/Noch (\d+) erforderlich/i);
        if (erforderlichMatch) {
            console.log(`  Fortschritt: Noch ${erforderlichMatch[1]} erforderlich`);
        }
        
        // Suche nach allen klickbaren Buttons mit Optionen
        // Die Buttons haben Text wie "Perk −", "Perk +", "Ja, indirekt (Cp)", "Nein", etc.
        const buttons = page.locator('button');
        const count = await buttons.count();
        
        let geklickt = false;
        
        for (let b = 0; b < count && !geklickt; b++) {
            const btn = buttons.nth(b);
            const text = await btn.textContent().catch(() => '');
            const isVisible = await btn.isVisible().catch(() => false);
            const isEnabled = await btn.isEnabled().catch(() => false);
            
            if (!isVisible || !isEnabled || !text) continue;
            
            const textClean = text.trim();
            
            // Perkussionsprobe: negativ (normaler Befund)
            if (textClean === 'Perk −' || textClean.includes('Perk -')) {
                await btn.click();
                console.log(`  [${i+1}] Perkussionsprobe: negativ`);
                geklickt = true;
            }
            // Sensibilitätsprobe: negativ
            else if (textClean === 'ViPr −' || textClean.includes('ViPr -') || textClean.includes('negativ')) {
                await btn.click();
                console.log(`  [${i+1}] Sensibilitätsprobe: negativ`);
                geklickt = true;
            }
            // Überkappung: Nein (nicht erwähnt im Diktat)
            else if (textClean === 'Nein' && pageText.includes('Überkappung')) {
                await btn.click();
                console.log(`  [${i+1}] Überkappung: Nein`);
                geklickt = true;
            }
            // Material: Komposit für 26, Bulk für 36
            else if (textClean.includes('Komposit') || textClean.includes('Bulk')) {
                await btn.click();
                console.log(`  [${i+1}] Material: ${textClean}`);
                geklickt = true;
            }
            // Adhäsiv: Ja
            else if (textClean === 'Ja' && pageText.includes('Adhäsiv')) {
                await btn.click();
                console.log(`  [${i+1}] Adhäsiv: Ja`);
                geklickt = true;
            }
            
            if (geklickt) {
                await page.waitForTimeout(400);
                break;
            }
        }
        
        // Wenn kein Options-Button geklickt wurde, versuche Fertigstellen/Weiter
        if (!geklickt) {
            const fertigBtn = page.locator('button:has-text("Fertigstellen"):not([disabled])');
            if (await fertigBtn.isVisible({ timeout: 500 }).catch(() => false)) {
                await fertigBtn.click();
                console.log('  → Fertigstellen geklickt');
                await page.waitForTimeout(1000);
                continue;
            }
            
            const weiterBtn = page.locator('button:has-text("Weiter"):not([disabled])');
            if (await weiterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
                await weiterBtn.click();
                console.log('  → Weiter geklickt');
                await page.waitForTimeout(800);
                continue;
            }
        }
        
        await page.waitForTimeout(300);
    }
    
    console.log('⚠️ Timeout beim Beantworten der Fragen');
}

test.describe('🦷 Realistischer Praxis-Test', () => {
    
    test('Doppelte Füllungstherapie: Zahn 26 MOD + Zahn 36', async ({ page }) => {
        console.log('\n' + '='.repeat(70));
        console.log('🦷 DOCUDENT V10 - REALISTISCHER PRAXIS-TEST');
        console.log('='.repeat(70));
        console.log(`\n📋 SZENARIO: ${TEST_SZENARIO.titel}\n`);
        console.log('📝 DIKTAT:');
        console.log(TEST_SZENARIO.diktat);
        console.log('\n' + '-'.repeat(70));
        
        // 1. Setup
        console.log('\n⏳ 1. App wird geladen...');
        await setupPage(page);
        console.log('✅ App geladen');
        
        // 2. Versicherung
        console.log('\n⏳ 2. Versicherung: GKV + MKV...');
        await page.locator('[data-testid="v10-insurance-select"] button:has-text("GKV")').click();
        const mkvToggle = page.locator('[data-testid="v10-mkv-toggle"]');
        if (await mkvToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
            await mkvToggle.click();
        }
        console.log('✅ GKV + MKV aktiviert');
        
        // 3. Diktat
        console.log('\n⏳ 3. Diktat wird eingegeben...');
        await page.fill('[data-testid="v10-dictation-input"]', TEST_SZENARIO.diktat);
        console.log('✅ Diktat eingegeben');
        
        // 4. Pipeline starten
        console.log('\n⏳ 4. Pipeline wird gestartet...');
        await page.click('[data-testid="v10-run-button"]');
        
        // Warte auf Fragen oder Output
        const questionsPanel = page.locator('[data-testid="v10-questions-panel"]');
        const outputPanel = page.locator('[data-testid="v10-output-panel"]');
        
        await Promise.race([
            expect(questionsPanel).toBeVisible({ timeout: 20000 }),
            expect(outputPanel).toBeVisible({ timeout: 20000 })
        ]);
        
        const isQuestions = await questionsPanel.isVisible().catch(() => false);
        console.log(`✅ Pipeline Phase: ${isQuestions ? 'QUESTIONS' : 'OUTPUT'}`);
        
        // 5. Fragen beantworten
        if (isQuestions) {
            await beantworteFragen(page);
        }
        
        // 6. Output analysieren
        console.log('\n' + '='.repeat(70));
        console.log('📊 ERGEBNIS');
        console.log('='.repeat(70));
        
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/02-output-final.png', fullPage: true });
        
        // Extrahiere Text
        const outputText = await page.locator('[data-testid="v10-output-panel"]').textContent().catch(() => '');
        
        console.log('\n📄 GENERIERTER TEXT:');
        console.log('-'.repeat(50));
        if (outputText) {
            // Zeige nur den relevanten Teil
            const lines = outputText.split('\n').filter(l => l.trim());
            for (const line of lines.slice(0, 30)) {
                console.log(line);
            }
        }
        console.log('-'.repeat(50));
        
        // Öffne Debug-Panel für Billing-Codes
        const debugBtn = page.locator('button:has-text("Debug")');
        let billingCodes: string[] = [];
        
        if (await debugBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await debugBtn.click();
            await page.waitForTimeout(500);
            
            // Klicke auf Billing-Tab
            const billingTab = page.locator('button:has-text("Billing"), button:has-text("Abrechnung")');
            if (await billingTab.isVisible({ timeout: 1000 }).catch(() => false)) {
                await billingTab.click();
                await page.waitForTimeout(500);
            }
            
            const debugText = await page.locator('body').textContent().catch(() => '');
            const bemaMatches = debugText.match(/BEMA[_-]?\d+[a-z]?/gi) || [];
            const gozMatches = debugText.match(/GOZ[_-]?\d+/gi) || [];
            billingCodes = [...bemaMatches, ...gozMatches].map(c => c.toUpperCase());
            
            await page.keyboard.press('Escape');
        }
        
        // Zeige Billing-Codes
        console.log('\n💶 ABRECHNUNGSCODES:');
        console.log('-'.repeat(50));
        if (billingCodes.length > 0) {
            billingCodes.forEach((code, i) => console.log(`  ${i + 1}. ${code}`));
        } else {
            console.log('  (Keine Codes im Debug-Panel gefunden)');
        }
        console.log('-'.repeat(50));
        
        // Validierung
        console.log('\n✅ VALIDIERUNG:');
        
        const checks = [
            { name: 'Text generiert', test: outputText.length > 100 },
            { name: 'Zahn 26 erwähnt', test: outputText.toLowerCase().includes('zahn 26') || outputText.includes('26') },
            { name: 'Zahn 36 erwähnt', test: outputText.toLowerCase().includes('zahn 36') || outputText.includes('36') },
            { name: 'Komposit erwähnt', test: outputText.toLowerCase().includes('komposit') },
            { name: 'BEMA-Codes gefunden', test: billingCodes.some(c => c.includes('BEMA')) },
            { name: 'GOZ-Codes gefunden', test: billingCodes.some(c => c.includes('GOZ')) },
        ];
        
        let passed = 0;
        for (const check of checks) {
            const icon = check.test ? '✅' : '❌';
            console.log(`   ${icon} ${check.name}`);
            if (check.test) passed++;
        }
        
        const successRate = (passed / checks.length) * 100;
        
        console.log('\n' + '='.repeat(70));
        console.log(`📋 ERGEBNIS: ${passed}/${checks.length} (${Math.round(successRate)}%)`);
        console.log('='.repeat(70) + '\n');
        
        // Soft assertion
        expect(outputText.length).toBeGreaterThan(50);
    });
});
