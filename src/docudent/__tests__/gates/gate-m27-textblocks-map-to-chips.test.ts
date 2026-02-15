/**
 * Gate M27: Text Blocks Map to Chips
 *
 * Ensures every text block in output has sourceChipIds.
 */

import { describe, it, expect } from 'vitest';
import { explainRunV10 } from '../../v10/qa/explainRunV10';
import type { V10PipelineInput, V10PipelineOutput } from '../../v10/pipeline/runV10';

describe('gate-m27-textblocks-map-to-chips', () => {
    const mockInput: V10PipelineInput = {
        dictation: 'Füllung Zahn 36',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
    };

    const mockOutput: V10PipelineOutput = {
        state: 'output',
        output: {
            fullText: 'Test text',
            billingCodes: ['BEMA_25'],
            perInstance: {
                'fuellung-36-1': {
                    instanceId: 'fuellung-36-1',
                    teeth: ['36'],
                    text: 'Test text',
                    billingRefs: ['BEMA_25'],
                    chips: ['cp'],
                },
            },
        },
        meta: {
            traceLines: [],
            combinability: { verdict: 'pass', conflicts: [] },
        },
    };

    it('every text block has sourceChipIds array', () => {
        const result = explainRunV10(mockInput, mockOutput);

        for (const block of result.reportJson.textBlocks) {
            expect(block.sourceChipIds, `Block ${block.blockIndex} missing sourceChipIds`).toBeDefined();
            expect(Array.isArray(block.sourceChipIds), `Block ${block.blockIndex} sourceChipIds not array`).toBe(true);
        }
    });

    it('text blocks with content have at least one chip reference', () => {
        const result = explainRunV10(mockInput, mockOutput);

        for (const block of result.reportJson.textBlocks) {
            if (block.text && block.text.length > 0) {
                expect(
                    block.sourceChipIds.length,
                    `Block ${block.blockIndex} has text but no chip references`
                ).toBeGreaterThan(0);
            }
        }
    });

    it('all referenced chip IDs exist in chips array', () => {
        const result = explainRunV10(mockInput, mockOutput);
        const chipIds = new Set(result.reportJson.chips.map(c => c.chipId));

        for (const block of result.reportJson.textBlocks) {
            for (const chipId of block.sourceChipIds) {
                expect(
                    chipIds.has(chipId),
                    `Block ${block.blockIndex} references unknown chip: ${chipId}`
                ).toBe(true);
            }
        }
    });
});
