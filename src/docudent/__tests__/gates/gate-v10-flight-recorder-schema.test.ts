/**
 * gate-v10-flight-recorder-schema.test.ts
 * 
 * Validates that Flight Recorder bundles match the expected schema
 * and contain all required fields.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPRO_SAMPLES_DIR = path.join(__dirname, '../../../../docs/system-atlas/artifacts/m83/repro.samples');

interface ReproBundle {
    meta: {
        runId: string;
        version: string;
        sanitized: boolean;
        createdAt: string;
    };
    input: {
        dictation: string;
        treatmentId: string;
        insuranceType: string;
        textLength: string;
        hasMKV: boolean;
        answers: Record<string, unknown>;
    };
    captured: {
        extraction: unknown;
        facts: unknown;
        questions: Array<{ id: string; questionKey: string }>;
        chips: Array<{ id: string; source: string }>;
        billingCodes: Array<{ code: string; system: string }>;
        combinabilityVerdict: string;
        finalState: string;
        fullText: string;
    };
    buildInfo: {
        gitSha: string;
        timestamp: number;
        kbHashes: Record<string, string>;
    };
}

describe('gate-v10-flight-recorder-schema', () => {
    it('should have repro samples directory', () => {
        expect(fs.existsSync(REPRO_SAMPLES_DIR)).toBe(true);
    });

    it('should have at least 2 fixture bundles', () => {
        const files = fs.readdirSync(REPRO_SAMPLES_DIR).filter(f => f.endsWith('.json'));
        expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('R1 bundle should have valid schema', () => {
        const bundlePath = path.join(REPRO_SAMPLES_DIR, 'R1_fuellung_profunda_mkv.json');
        expect(fs.existsSync(bundlePath)).toBe(true);

        const bundle: ReproBundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        // Meta validation
        expect(bundle.meta).toBeDefined();
        expect(bundle.meta.runId).toBe('R1_fuellung_profunda_mkv');
        expect(bundle.meta.version).toBe('1.0');
        expect(bundle.meta.sanitized).toBe(true);

        // Input validation
        expect(bundle.input).toBeDefined();
        expect(bundle.input.treatmentId).toBe('fuellung');
        expect(bundle.input.dictation.length).toBeGreaterThan(10);
        expect(['GKV', 'PKV', 'MKV']).toContain(bundle.input.insuranceType);

        // Captured validation
        expect(bundle.captured).toBeDefined();
        expect(bundle.captured.finalState).toBe('output');
        expect(Array.isArray(bundle.captured.chips)).toBe(true);
        expect(Array.isArray(bundle.captured.billingCodes)).toBe(true);
        expect(['PASS', 'WARN', 'BLOCK']).toContain(bundle.captured.combinabilityVerdict);
    });

    it('R2 bundle should have valid schema', () => {
        const bundlePath = path.join(REPRO_SAMPLES_DIR, 'R2_endo_multi_wl.json');
        expect(fs.existsSync(bundlePath)).toBe(true);

        const bundle: ReproBundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        // Meta validation
        expect(bundle.meta).toBeDefined();
        expect(bundle.meta.runId).toBe('R2_endo_multi_wl');

        // Input validation
        expect(bundle.input.treatmentId).toBe('endo');

        // Captured validation - this one should be in questions state
        expect(bundle.captured.finalState).toBe('questions');
        expect(bundle.captured.questions.length).toBeGreaterThan(0);
    });

    it('all bundles should have consistent field ordering', () => {
        const files = fs.readdirSync(REPRO_SAMPLES_DIR).filter(f => f.endsWith('.json'));

        for (const file of files) {
            const bundlePath = path.join(REPRO_SAMPLES_DIR, file);
            const bundle: ReproBundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

            // Chips should be sorted by id
            const chipIds = bundle.captured.chips.map(c => c.id);
            const sortedChipIds = [...chipIds].sort();
            expect(chipIds).toEqual(sortedChipIds);

            // Billing codes should be sorted by code
            const codes = bundle.captured.billingCodes.map(b => b.code);
            const sortedCodes = [...codes].sort();
            expect(codes).toEqual(sortedCodes);
        }
    });
});
