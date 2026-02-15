/**
 * RegressGuard Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { pruefeRegeln, loadAllRules, hasBlockers } from '../docudent/core/billing/knowledgeBase/logic/regelEngine';

describe('RegressGuard: Regel-Engine', () => {

    it('should load all rules from kombinationen.json', () => {
        const rules = loadAllRules();
        expect(rules.length).toBeGreaterThan(10);
        console.log(`[Test] ${rules.length} Regeln geladen`);
    });

    it('should detect GOZ 2197 + GOZ 2060 exclusion (PKV)', () => {
        const ergebnisse = pruefeRegeln({
            codes: ['GOZ_2197', 'GOZ_2060'],
            dokumentation: 'MOD Komposit mit Adhäsiv',
            insuranceType: 'PKV'
        });

        // Sollte Ausschluss erkennen!
        const ausschluss = ergebnisse.find(e => e.regelId === 'regel_goz2197_nicht_neben_2060');
        expect(ausschluss).toBeDefined();
        expect(ausschluss?.severity).toBe('blocker');
        console.log('[Test] GOZ 2197 Ausschluss erkannt:', ausschluss?.message);
    });

    it('should detect BEMA 12 without Kofferdam documentation (GKV)', () => {
        const ergebnisse = pruefeRegeln({
            codes: ['BEMA_12', 'BEMA_13b'],
            dokumentation: 'MOD Kompositfüllung',  // Kein "Kofferdam"!
            insuranceType: 'GKV'
        });

        // Sollte fehlende Dokumentation erkennen
        const kofferdam = ergebnisse.find(e => e.regelId === 'regel_bema12_nur_kofferdam');
        expect(kofferdam).toBeDefined();
        expect(kofferdam?.severity).toBe('blocker');
        console.log('[Test] BEMA 12 ohne Kofferdam erkannt:', kofferdam?.message);
    });

    it('should NOT warn if Kofferdam is documented', () => {
        const ergebnisse = pruefeRegeln({
            codes: ['BEMA_12', 'BEMA_13b'],
            dokumentation: 'MOD Kompositfüllung unter Kofferdam',  // Mit "Kofferdam"!
            insuranceType: 'GKV'
        });

        const kofferdam = ergebnisse.find(e => e.regelId === 'regel_bema12_nur_kofferdam');
        expect(kofferdam).toBeUndefined();  // Keine Warnung!
    });

    it('should detect BEMA 25 (Cp) without profunda documentation', () => {
        const ergebnisse = pruefeRegeln({
            codes: ['BEMA_25', 'BEMA_13b'],
            dokumentation: 'MOD Füllung mit Überkappung',  // Kein "profunda" oder "pulpanah"!
            insuranceType: 'GKV'
        });

        const cp = ergebnisse.find(e => e.regelId === 'regel_bema25_tiefe_karies');
        expect(cp).toBeDefined();
        expect(cp?.dokumentationBenötigt).toBeDefined();
        console.log('[Test] BEMA 25 ohne Profunda erkannt:', cp?.message);
    });

    it('hasBlockers should return true for blocking violations', () => {
        const hasBlock = hasBlockers({
            codes: ['GOZ_2197', 'GOZ_2060'],
            dokumentation: 'Test',
            insuranceType: 'PKV'
        });

        expect(hasBlock).toBe(true);
    });
});
