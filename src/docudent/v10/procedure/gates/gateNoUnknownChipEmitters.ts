export interface FinalChip {
    id: string;
    emitter?: string;
}

export interface GateNoUnknownChipEmittersResult {
    ok: boolean;
    warnings: string[];
    trace: {
        unknownEmitters: FinalChip[];
    };
}

export function gateNoUnknownChipEmitters(
    finalChips: FinalChip[],
    options?: { logger?: (message: string, payload: unknown) => void }
): GateNoUnknownChipEmittersResult {
    const unknown = finalChips.filter(
        (chip) => chip.emitter !== 'manualOverride' && !chip.emitter?.startsWith('node:')
    );

    const warnings = unknown.map((chip) => `Missing emitter for chip "${chip.id}"`);

    if (unknown.length > 0) {
        const logger = options?.logger ?? ((message, payload) => console.warn(message, payload));
        logger('[GATE][WARN] Unknown chip emitters detected', {
            count: unknown.length,
            chips: unknown,
        });
    }

    return {
        ok: unknown.length === 0,
        warnings,
        trace: { unknownEmitters: unknown },
    };
}
