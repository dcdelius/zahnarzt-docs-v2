/**
 * Gate: Mehrkosten Policy
 * 
 * Validates the configurable Mehrkosten pricing system:
 * - Per-canal endo pricing
 * - Add-on surcharges (microscope, NiTi, irrigation)
 * - Filling MKV pricing
 * - Deterministic output
 */
import { describe, it, expect } from 'vitest';
import {
    getDefaultMehrkostenPolicy,
    calculateMehrkosten,
    formatCurrency,
    validatePolicy,
    type MehrkostenContext,
    type MehrkostenPolicy
} from '../../core/billing/knowledgeBase/logic/mehrkostenPolicy';

// ═══════════════════════════════════════════════════════════════
// A) DEFAULT POLICY
// ═══════════════════════════════════════════════════════════════

describe('GATE: Mehrkosten Policy', () => {
    describe('A) Default Policy', () => {
        it('returns a valid default policy', () => {
            const policy = getDefaultMehrkostenPolicy();
            expect(policy.version).toBe('2025-01');
            expect(policy.endo.perCanalAmount).toBe(100.00);
            expect(policy.currency.symbol).toBe('€');
        });

        it('default policy passes validation', () => {
            const policy = getDefaultMehrkostenPolicy();
            const result = validatePolicy(policy);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // B) ENDO CALCULATION
    // ═══════════════════════════════════════════════════════════

    describe('B) Endo Per-Canal Calculation', () => {
        it('calculates 3 canals at 100€ each = 300€', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 3 }
            };
            const result = calculateMehrkosten(context);

            expect(result.total).toBe(300.00);
            expect(result.items).toHaveLength(1);
            expect(result.items[0].label).toContain('3 Kanäle');
            expect(result.labelMode).toBe('zusatzleistung');
        });

        it('1 canal uses singular "Kanal"', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 1 }
            };
            const result = calculateMehrkosten(context);

            expect(result.items[0].label).toContain('1 Kanal');
            expect(result.items[0].label).not.toContain('Kanäle');
        });

        it('defaults to 1 canal if not specified', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo'
            };
            const result = calculateMehrkosten(context);

            expect(result.total).toBe(100.00);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // C) ENDO ADD-ONS
    // ═══════════════════════════════════════════════════════════

    describe('C) Endo Add-Ons', () => {
        it('microscope adds 50€', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 1 },
                flags: { microscope: true }
            };
            const result = calculateMehrkosten(context);

            expect(result.total).toBe(150.00); // 100 + 50
            expect(result.items).toHaveLength(2);
            expect(result.items[1].label).toBe('OP-Mikroskop');
        });

        it('NiTi adds 30€', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 1 },
                flags: { niti: true }
            };
            const result = calculateMehrkosten(context);

            expect(result.total).toBe(130.00);
        });

        it('irrigation protocol adds 20€', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 1 },
                flags: { irrigationProtocol: true }
            };
            const result = calculateMehrkosten(context);

            expect(result.total).toBe(120.00);
        });

        it('all add-ons combined: 3 canals + all options = 400€', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 3 },
                flags: { microscope: true, niti: true, irrigationProtocol: true }
            };
            const result = calculateMehrkosten(context);

            // 300 (canals) + 50 (microscope) + 30 (niti) + 20 (irrigation) = 400
            expect(result.total).toBe(400.00);
            expect(result.items).toHaveLength(4);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D) FILLING CALCULATION
    // ═══════════════════════════════════════════════════════════

    describe('D) Filling MKV Calculation', () => {
        it('uses fixed amount from policy', () => {
            const context: MehrkostenContext = {
                treatmentType: 'filling'
            };
            const result = calculateMehrkosten(context);

            expect(result.total).toBe(68.00);
            expect(result.labelMode).toBe('mkv');
            expect(result.disclosureText).toContain('Mehrkostenvereinbarung');
        });

        it('supports percentage mode', () => {
            const policy = getDefaultMehrkostenPolicy();
            policy.filling.mode = 'percentage';
            policy.filling.percentageOfGOZ = 50;

            const context: MehrkostenContext = {
                treatmentType: 'filling',
                filling: { gozBaseAmount: 100.00 }
            };
            const result = calculateMehrkosten(context, policy);

            expect(result.total).toBe(50.00);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E) CURRENCY FORMATTING
    // ═══════════════════════════════════════════════════════════

    describe('E) Currency Formatting', () => {
        it('formats with 2 decimals and € symbol', () => {
            const policy = getDefaultMehrkostenPolicy();
            const formatted = formatCurrency(123.45, policy);

            expect(formatted).toContain('€');
            expect(formatted).toMatch(/123[,.]45/);
        });

        it('formats whole numbers with .00', () => {
            const policy = getDefaultMehrkostenPolicy();
            const formatted = formatCurrency(100, policy);

            expect(formatted).toMatch(/100[,.]00/);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // F) DETERMINISM
    // ═══════════════════════════════════════════════════════════

    describe('F) Determinism', () => {
        it('same input produces identical output', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 3 },
                flags: { microscope: true }
            };

            const result1 = calculateMehrkosten(context);
            const result2 = calculateMehrkosten(context);

            expect(result1.total).toBe(result2.total);
            expect(result1.items.length).toBe(result2.items.length);
            expect(result1.formattedTotal).toBe(result2.formattedTotal);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // G) DISCLOSURE TEXT
    // ═══════════════════════════════════════════════════════════

    describe('G) Disclosure Text', () => {
        it('endo uses Zusatzleistung disclosure', () => {
            const context: MehrkostenContext = {
                treatmentType: 'endo',
                endo: { canals: 1 }
            };
            const result = calculateMehrkosten(context);

            expect(result.disclosureText).toContain('Zusatzleistungen');
        });

        it('filling uses MKV disclosure', () => {
            const context: MehrkostenContext = {
                treatmentType: 'filling'
            };
            const result = calculateMehrkosten(context);

            expect(result.disclosureText).toContain('Mehrkostenvereinbarung');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // H) VALIDATION
    // ═══════════════════════════════════════════════════════════

    describe('H) Policy Validation', () => {
        it('rejects negative per-canal amount', () => {
            const policy = getDefaultMehrkostenPolicy();
            policy.endo.perCanalAmount = -50;

            const result = validatePolicy(policy);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Per-canal amount cannot be negative');
        });
    });
});
