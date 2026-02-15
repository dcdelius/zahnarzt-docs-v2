/**
 * Gate M13.1: V10 Renderer Uses Injected KB
 *
 * GATE DEFINITION:
 * V10 pipeline must pass the pre-loaded treatmentKb to renderFromKbChips.
 * This ensures the renderer uses the KB provider layer, not its internal loader.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

// Import the renderer module so we can spy on it
import * as rendererModule from '../../output/renderFromKbChips';

describe('Gate M13.1: V10 Renderer Uses Injected KB', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('V10 passes treatmentKb to main render call', async () => {
        // Spy on renderFromKbChips
        const renderSpy = vi.spyOn(rendererModule, 'renderFromKbChips');

        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'nein'],
            ]),
        };

        const result = await runV10(input);

        // Should reach output state (all required questions answered)
        expect(result.state).toBe('output');

        // renderFromKbChips should have been called
        expect(renderSpy).toHaveBeenCalled();

        // At least one call should have treatmentKb injected
        const callsWithInjectedKb = renderSpy.mock.calls.filter(
            call => call[0].treatmentKb !== undefined
        );

        expect(callsWithInjectedKb.length).toBeGreaterThan(0);
    });

    it('all V10 render calls receive treatmentKb', async () => {
        const renderSpy = vi.spyOn(rendererModule, 'renderFromKbChips');

        const input: V10PipelineInput = {
            dictation: 'Zahn 16 tiefe Karies Kompositfüllung pulpennah',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'nein'],
            ]),
        };

        await runV10(input);

        // All render calls should have treatmentKb
        const allCalls = renderSpy.mock.calls;
        const callsWithoutKb = allCalls.filter(
            call => call[0].treatmentKb === undefined
        );

        expect(callsWithoutKb).toHaveLength(0);
    });

    it('injected KB has expected structure', async () => {
        const renderSpy = vi.spyOn(rendererModule, 'renderFromKbChips');

        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Karies',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'nein'],
            ]),
        };

        await runV10(input);

        const calls = renderSpy.mock.calls;
        expect(calls.length).toBeGreaterThan(0);

        const firstCallKb = calls[0][0].treatmentKb;
        expect(firstCallKb).toBeDefined();
        expect(firstCallKb?._meta).toBeDefined();
        expect(firstCallKb?._meta.id).toBe('fuellung');
        expect(firstCallKb?.chips).toBeInstanceOf(Array);
        expect(firstCallKb?.chips.length).toBeGreaterThan(0);
    });

    it('endo treatment also receives injected KB', async () => {
        const renderSpy = vi.spyOn(rendererModule, 'renderFromKbChips');

        const input: V10PipelineInput = {
            dictation: 'Zahn 36 Wurzelbehandlung',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        // Either output or questions state is fine
        if (result.state === 'output') {
            const calls = renderSpy.mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            const callsWithKb = calls.filter(
                call => call[0].treatmentKb !== undefined
            );
            expect(callsWithKb.length).toBe(calls.length);

            // Verify endo KB structure
            const firstCallKb = calls[0][0].treatmentKb;
            expect(firstCallKb?._meta.id).toBe('endo');
        }
    });
});
