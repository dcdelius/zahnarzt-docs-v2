/**
 * V10 Documentation Composer — KZV-Style Clinical Documentation
 *
 * ═══════════════════════════════════════════════════════════════
 * Composes structured clinical documentation from perInstance data.
 * Uses canonical vocab for German labels - never reads raw dictation.
 *
 * SSOT Rules:
 * - All text comes from facts/chips/KB, not dictation
 * - No hardcoded billing codes (only BillingRef IDs)
 * - No raw booleans in output text
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface PerInstanceData {
    instanceId: string;
    teeth: string[];
    text: string;
    billingRefs: string[];
    chips: string[];
    facts?: Record<string, unknown>;
}

export interface ComposedSection {
    id: 'dokumentation' | 'abrechnung' | 'mkv' | 'hinweise' | 'befund' | 'aufklaerung' | 'behandlung' | 'leistungen';
    label: string;
    content: string;
}

export interface ComposedDocumentV10 {
    sections: ComposedSection[];
    fullText: string;
    billingCodes: string[];
}

export interface ComposeInputV10 {
    perInstance: Record<string, PerInstanceData>;
    answers: Map<string, unknown>;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
    mkvAmount?: number;
    mkvJustification?: string;  // GIGAPROMPT 7: From signals or askback
    nurKasse?: boolean;         // GIGAPROMPT 7: Explicit rejection
}

// ═══════════════════════════════════════════════════════════════
// Label Helpers (German Documentation Style)
// ═══════════════════════════════════════════════════════════════

function formatSurfaces(surfaces: string[]): string {
    if (!surfaces || surfaces.length === 0) return '';
    return surfaces.join('').toUpperCase();
}

function formatAnesthesiaLabel(anesthesia: string | undefined): string {
    switch (anesthesia) {
        case 'infiltr': return 'Infiltrationsanästhesie';
        case 'leitung': return 'Leitungsanästhesie';
        case 'none': return '';
        default: return '';
    }
}

function formatDepthLabel(depth: string | undefined): string {
    switch (depth) {
        case 'profunda': return 'Caries profunda';
        case 'pulp_near': return 'pulpanah';
        case 'normal': return 'Caries media';
        default: return '';
    }
}

function formatIsolationLabel(kofferdamUsed?: boolean): string {
    if (kofferdamUsed === true) return 'Kofferdam';
    if (kofferdamUsed === false) return 'relative Trockenlegung';
    return '';
}

function formatCappingLabel(
    capping?: { performed?: string; material?: string },
    pulpaOpened?: boolean
): string {
    if (!capping || capping.performed !== 'yes') return '';
    const material = capping.material || 'Ca(OH)₂';
    if (pulpaOpened === true) {
        return `direkte Überkappung (P) mit ${material}`;
    }
    if (pulpaOpened === false) {
        return `indirekte Überkappung (Cp) mit ${material}`;
    }
    return `Überkappung mit ${material}`;
}

function formatMaterialLabel(material?: string): string {
    switch (material?.toLowerCase()) {
        case 'komposit':
        case 'composite': return 'Kompositfüllung';
        case 'giz':
        case 'gic': return 'Glasionomerfüllung';
        case 'amalgam': return 'Amalgamfüllung';
        default: return 'Füllungstherapie';
    }
}

// ═══════════════════════════════════════════════════════════════
// Section Builders
// ═══════════════════════════════════════════════════════════════

function buildDokumentationSection(
    instances: PerInstanceData[],
    textLength: 'kurz' | 'mittel' | 'lang'
): ComposedSection {
    const lines: string[] = [];

    for (const instance of instances) {
        const facts = instance.facts || {};
        const tooth = instance.teeth[0] || '?';
        const surfaces = facts.surfaces as string[] || [];
        const surfaceStr = formatSurfaces(surfaces);
        const material = facts.materialMentioned as string;
        const anesthesia = facts.anesthesia as string;
        const depth = facts.cariesDepth as string;
        const kofferdamUsed = facts.kofferdamUsed as boolean | undefined;
        const capping = facts.capping as { performed?: string; material?: string } | undefined;
        const pulpaOpened = facts.pulpaOpened as boolean | undefined;
        const fluoridation = (facts.fuellung as { fluoridation?: boolean } | undefined)?.fluoridation;

        // Header line
        const treatmentLabel = formatMaterialLabel(material);
        if (surfaceStr) {
            lines.push(`Zahn ${tooth} (${surfaceStr}): ${treatmentLabel}.`);
        } else {
            lines.push(`Zahn ${tooth}: ${treatmentLabel}.`);
        }

        // Depth line
        const depthLabel = formatDepthLabel(depth);
        if (depthLabel && textLength !== 'kurz') {
            lines.push(`Diagnose: ${depthLabel}.`);
        }

        // Anesthesia line
        const anesthesiaLabel = formatAnesthesiaLabel(anesthesia);
        if (anesthesiaLabel) {
            lines.push(`Lokalanästhesie: ${anesthesiaLabel}.`);
        }

        // Isolation line
        const isolationLabel = formatIsolationLabel(kofferdamUsed);
        if (isolationLabel && textLength !== 'kurz') {
            lines.push(`Trockenlegung: ${isolationLabel}.`);
        }

        // Capping line
        const cappingLabel = formatCappingLabel(capping, pulpaOpened);
        if (cappingLabel) {
            lines.push(cappingLabel + '.');
        }

        // GIGAPROMPT 10: Adhäsiv/Mehrschicht line when applicable
        // ACCURACY FIX: Only show when adhesiveTechnique=true OR mkvJustification present
        // Do NOT show just because material='komposit'
        const hasAdhesive = facts.adhesiveTechnique === true ||
            (facts.mkvJustification !== undefined && facts.mkvJustification !== null);
        if (hasAdhesive && textLength !== 'kurz') {
            lines.push('Adhäsive Füllungstechnik in Mehrschichttechnik.');
        }

        // Fluoridation
        if (fluoridation && textLength !== 'kurz') {
            lines.push('Abschließende Fluoridierung.');
        }

        // Finishing (only for lang)
        if (textLength === 'lang') {
            lines.push('Okklusions- und Artikulationskontrolle, Politur.');
        }
    }

    return {
        id: 'dokumentation',
        label: 'Dokumentation',
        content: lines.join('\n'),
    };
}

function buildAbrechnungSection(
    billingCodes: string[],
    insuranceType: string
): ComposedSection {
    // Group by system
    const bema = billingCodes.filter(c => c.startsWith('BEMA_'));
    const goz = billingCodes.filter(c => c.startsWith('GOZ_'));

    const lines: string[] = [];

    if (bema.length > 0) {
        lines.push('Kassenleistung (BEMA):');
        for (const code of bema) {
            lines.push(`  • ${code.replace('BEMA_', '')}`);
        }
    }

    if (goz.length > 0) {
        lines.push('Privatleistung (GOZ):');
        for (const code of goz) {
            lines.push(`  • ${code.replace('GOZ_', '')}`);
        }
    }

    return {
        id: 'abrechnung',
        label: 'Abrechnung',
        content: lines.join('\n'),
    };
}

function buildMkvSection(
    insuranceType: string,
    mkvAmount?: number,
    instances?: PerInstanceData[],
    mkvJustification?: string
): ComposedSection | null {
    if (insuranceType !== 'MKV') return null;

    // GIGAPROMPT 7: Check nurKasse - if any instance has nurKasse, suppress MKV section
    const hasNurKasse = instances?.some(i => i.facts?.nurKasse === true);
    if (hasNurKasse) {
        return null;  // MKV section suppressed, line added to Dokumentation/Abrechnung instead
    }

    const lines: string[] = [];
    lines.push('Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V');

    if (mkvAmount && mkvAmount > 0) {
        lines.push(`Mehrkostenbetrag: ${mkvAmount} €`);
    }

    // GIGAPROMPT 7: Justification from signals or askback
    if (mkvJustification) {
        lines.push(`Begründung: ${mkvJustification}`);
    } else {
        // Infer from facts
        const hasMehrschicht = instances?.some(i =>
            i.facts?.mehrkostenConfirmed === true ||
            i.facts?.mehrkostenMentioned === true ||
            i.facts?.adhesiveTechnique === true
        );
        if (hasMehrschicht) {
            lines.push('Begründung: Adhäsivtechnik/Mehrschichttechnik');
        }
    }

    // Check if any instance has MKV facts
    const hasMkvConfirmed = instances?.some(i =>
        (i.facts?.mehrkostenConfirmed === true) ||
        (i.facts?.mehrkostenMentioned === true)
    );

    if (hasMkvConfirmed) {
        lines.push('Patient wurde über Mehrkosten aufgeklärt und hat zugestimmt.');
    }

    return {
        id: 'mkv',
        label: 'Mehrkostenvereinbarung',
        content: lines.join('\n'),
    };
}

function buildHinweiseSection(hasAnesthesia: boolean): ComposedSection {
    const lines: string[] = [];

    if (hasAnesthesia) {
        lines.push('Nach Lokalanästhesie: Bis zum Abklingen der Betäubung nicht essen oder heiße Getränke zu sich nehmen.');
    }

    lines.push('Bei Beschwerden bitte zeitnah in der Praxis melden.');

    return {
        id: 'hinweise',
        label: 'Hinweise',
        content: lines.join('\n'),
    };
}

// ═══════════════════════════════════════════════════════════════
// Main Compose Function
// ═══════════════════════════════════════════════════════════════

export function composeDocumentationV10(input: ComposeInputV10): ComposedDocumentV10 {
    const { perInstance, insuranceType, textLength, mkvAmount, mkvJustification, nurKasse } = input;
    const instances = Object.values(perInstance);

    // Collect all billing codes
    const allBillingCodes = instances.flatMap(i => i.billingRefs);

    // Check for anesthesia
    const hasAnesthesia = instances.some(i =>
        i.chips.includes('la_infiltr') ||
        i.chips.includes('la_leitung') ||
        (i.facts?.anesthesia && i.facts.anesthesia !== 'none' && i.facts.anesthesia !== 'unknown')
    );

    // GIGAPROMPT 7: Check nurKasse from input OR from any instance facts
    const effectiveNurKasse = nurKasse ?? instances.some(i => i.facts?.nurKasse === true);

    // Build sections
    const sections: ComposedSection[] = [];

    // 1. Dokumentation
    sections.push(buildDokumentationSection(instances, textLength));

    // 2. Abrechnung
    if (allBillingCodes.length > 0) {
        const abrechnungSection = buildAbrechnungSection(allBillingCodes, insuranceType);

        // GIGAPROMPT 7: If nurKasse, add clarification line after Abrechnung
        if (effectiveNurKasse && insuranceType === 'MKV') {
            abrechnungSection.content += '\n\nMehrkosten: nur Kassenleistung gewählt.';
        }

        sections.push(abrechnungSection);
    }

    // 3. MKV (optional) - suppressed if nurKasse
    if (!effectiveNurKasse) {
        const mkvSection = buildMkvSection(insuranceType, mkvAmount, instances, mkvJustification);
        if (mkvSection) {
            sections.push(mkvSection);
        }
    }

    // 4. Hinweise
    sections.push(buildHinweiseSection(hasAnesthesia));

    // Compose fullText
    const fullText = sections
        .map(s => `[${s.label}]\n${s.content}`)
        .join('\n\n');

    return {
        sections,
        fullText,
        billingCodes: allBillingCodes,
    };
}

// ═══════════════════════════════════════════════════════════════
// MKV Amount Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Detect MKV amount from dictation.
 * Patterns: "120€", "120 Euro", "150,- €"
 */
export function detectMkvAmount(rawDictation: string): number | undefined {
    const patterns = [
        /(\d+(?:[.,]\d{2})?)\s*€/,              // 120€, 150,50€
        /(\d+(?:[.,]\d{2})?)\s*euro/i,          // 120 Euro
        /(\d+(?:[.,]\d{2})?)\s*,-\s*€/,         // 150,- €
        /mehrkosten[:\s]+(\d+(?:[.,]\d{2})?)/i, // Mehrkosten: 120
        /betrag[:\s]+(\d+(?:[.,]\d{2})?)/i,     // Betrag: 150
    ];

    for (const pattern of patterns) {
        const match = rawDictation.match(pattern);
        if (match) {
            const numStr = match[1].replace(',', '.');
            const amount = parseFloat(numStr);
            if (!isNaN(amount) && amount > 0 && amount < 10000) {
                return amount;
            }
        }
    }

    return undefined;
}

export default {
    composeDocumentationV10,
    detectMkvAmount,
};
