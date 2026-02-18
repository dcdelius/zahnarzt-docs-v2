type QuestionOption = { value: string; label: string };

export interface ScenarioQuestion {
    id: string;
    ruleId?: string;
    options?: QuestionOption[];
}

export interface ScenarioAnswerContext {
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    hasMKV?: boolean;
    instanceFacts?: Record<string, unknown>;
}

const normalizeQuestionKey = (raw: string): string => {
    let key = raw.replace(/::tooth:\d+$/, '');
    if (key.includes('::')) {
        key = key.split('::').pop() ?? key;
    }
    const prefixMatch = key.match(/^(medical|forensic|rule|mkv|upsell)_(.+)$/);
    return prefixMatch ? prefixMatch[2] : key;
};

const pickOption = (options: QuestionOption[] | undefined, preferred: string[]): string | undefined => {
    if (!options || options.length === 0) return undefined;
    const preferredNormalized = preferred.map(value => value.toLowerCase());
    const tokenize = (value: string): string[] => value
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]+/gi, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const candidate of preferredNormalized) {
        const match = options.find(option => {
            const optionValue = String(option.value ?? '').toLowerCase();
            const optionLabel = String(option.label ?? '').toLowerCase();
            if (optionValue === candidate || optionLabel === candidate) return true;
            const valueTokens = tokenize(optionValue);
            const labelTokens = tokenize(optionLabel);
            if (valueTokens.includes(candidate) || labelTokens.includes(candidate)) return true;
            if (/^[a-z0-9äöüß]+$/i.test(candidate)) {
                const re = new RegExp(`\\b${escapeRegex(candidate)}`, 'i');
                return re.test(optionValue) || re.test(optionLabel);
            }
            return optionValue.includes(candidate) || optionLabel.includes(candidate);
        });
        if (match) return String(match.value);
    }
    return options[0] ? String(options[0].value) : undefined;
};

const normalizeDictation = (dictation: string): string => dictation.toLowerCase();

const guessAnesthesia = (dictation: string, facts: Record<string, unknown>): string[] => {
    const normalized = normalizeDictation(dictation);
    const anesthesia = facts.anesthesia as string | undefined;
    if (normalized.includes('leitung')) return ['leitung'];
    if (normalized.includes('infiltr')) return ['infiltr'];
    if (normalized.includes('ila')) return ['ila'];
    if (anesthesia) return [anesthesia];
    return ['infiltr', 'leitung'];
};

const guessIsolation = (dictation: string, facts: Record<string, unknown>): string[] => {
    const normalized = normalizeDictation(dictation);
    const kofferdamUsed = facts.kofferdamUsed === true
        || (facts.kofferdam as { present?: boolean } | undefined)?.present === true
        || (facts.endo as { kofferdam?: boolean } | undefined)?.kofferdam === true;
    if (normalized.includes('kofferdam') || kofferdamUsed) return ['kofferdam'];
    if (normalized.includes('relativ') || normalized.includes('relative')) return ['relativ'];
    return ['relativ', 'kofferdam'];
};

const guessCapping = (dictation: string, facts: Record<string, unknown>): string[] => {
    const normalized = normalizeDictation(dictation);
    const pulpaOpened = facts.pulpaOpened === true;
    const capping = facts.capping as { performed?: string } | undefined;
    if (normalized.includes('direkt') && !normalized.includes('indirekt')) return ['direkt'];
    if (normalized.includes('indirekt')) return ['indirekt'];
    if (pulpaOpened) return ['direkt'];
    if (capping?.performed === 'yes') return ['indirekt'];
    return ['keine'];
};

const guessCappingMaterial = (dictation: string): string[] => {
    const normalized = normalizeDictation(dictation);
    if (normalized.includes('mta')) return ['mta'];
    if (normalized.includes('biodentine')) return ['biodentine'];
    return ['ca', 'ca(oh)2', 'caoh'];
};

const guessMaterial = (dictation: string, facts: Record<string, unknown>): string[] => {
    const normalized = normalizeDictation(dictation);
    const materialMentioned = facts.materialMentioned as string | undefined;
    if (normalized.includes('giz') || normalized.includes('glas')) return ['giz'];
    if (normalized.includes('komposit') || normalized.includes('composite')) return ['komposit'];
    if (materialMentioned) return [materialMentioned];
    return ['komposit', 'giz'];
};

const guessLayering = (dictation: string, facts: Record<string, unknown>): string[] => {
    const normalized = normalizeDictation(dictation);
    const layeringMentioned = facts.layeringMentioned as string | undefined;
    if (normalized.includes('mehrschicht') || layeringMentioned === 'yes') return ['mehrschicht'];
    return ['einfach', 'basic', 'standard', 'nein'];
};

const guessAdhesive = (dictation: string): string[] => {
    const normalized = normalizeDictation(dictation);
    if (normalized.includes('adhäsiv') || normalized.includes('adhesiv')) return ['ja', 'adhäsiv'];
    return ['nein', 'kein'];
};

const guessMkvConfirmed = (dictation: string, context: ScenarioAnswerContext): string[] => {
    const normalized = normalizeDictation(dictation);
    if (normalized.includes('nur kasse') || normalized.includes('keine mehrkosten')) {
        return ['nur_kasse', 'nur kasse', 'nur', 'kasse', 'nein', 'keine'];
    }
    if (normalized.includes('mehrkosten') || context.insuranceType === 'MKV' || context.hasMKV) {
        return ['mehrkosten', 'ja'];
    }
    return ['nur_kasse', 'nur kasse', 'nur', 'kasse', 'nein', 'keine'];
};

const guessSurfaces = (facts: Record<string, unknown>): string | undefined => {
    const surfaces = facts.surfaces as string[] | undefined;
    if (Array.isArray(surfaces) && surfaces.length > 0) {
        return surfaces.join(',');
    }
    return 'o';
};

const guessEndoRubberDam = (dictation: string): string[] => {
    const normalized = normalizeDictation(dictation);
    if (
        normalized.includes('kein kofferdam')
        || normalized.includes('keinen kofferdam')
        || normalized.includes('ohne kofferdam')
        || normalized.includes('kofferdam nicht')
        || normalized.includes('no rubber dam')
    ) {
        return ['nein', 'no', 'false'];
    }
    return ['ja', 'yes', 'true'];
};

const guessEndoWorkingLengths = (dictation: string, facts: Record<string, unknown>): string => {
    const endo = facts.endo as { canalCount?: number } | undefined;
    const canalCount = endo?.canalCount;
    const normalized = normalizeDictation(dictation);

    if (normalized.includes('mb') || normalized.includes('ml') || normalized.includes('db') || normalized.includes('d ') || normalized.includes(' d')) {
        return JSON.stringify({ MB: 19, ML: 18, D: 20 });
    }
    if (typeof canalCount === 'number' && Number.isFinite(canalCount) && canalCount > 0) {
        const byK: Record<string, number> = {};
        for (let i = 1; i <= canalCount; i++) {
            byK[`K${i}`] = 18 + i;
        }
        return JSON.stringify(byK);
    }
    return JSON.stringify({ K1: 19, K2: 18, K3: 20 });
};

const guessEndoCanalCount = (dictation: string, facts: Record<string, unknown>): string[] => {
    const normalized = normalizeDictation(dictation);
    const mentioned = facts.endo as { canalCount?: number } | undefined;
    const known = mentioned?.canalCount;
    if (typeof known === 'number' && Number.isFinite(known) && known > 0) {
        return [String(known)];
    }
    if (normalized.includes('mb') && normalized.includes('ml') && normalized.includes('d')) return ['3', '4'];
    if (normalized.includes('einwurzelig') || normalized.includes('single canal')) return ['1'];
    return ['3', '2', '4', '1'];
};

const guessEndoTechnique = (dictation: string): string[] => {
    const normalized = normalizeDictation(dictation);
    if (normalized.includes('rotierend')) return ['rotierend', 'maschinell'];
    if (normalized.includes('maschinell') || normalized.includes('recip')) return ['maschinell', 'rotierend'];
    if (normalized.includes('manuell') || normalized.includes('hand')) return ['manuell'];
    return ['maschinell', 'rotierend', 'manuell'];
};

const guessEndoIrrigation = (dictation: string): string[] => {
    const normalized = normalizeDictation(dictation);
    if (normalized.includes('chx')) return ['chx', 'naocl', 'edta'];
    if (normalized.includes('edta') && normalized.includes('naocl')) return ['naocl + edta', 'naocl', 'edta'];
    if (normalized.includes('edta')) return ['edta', 'naocl', 'chx'];
    if (normalized.includes('naocl') || normalized.includes('naclo')) return ['naocl', 'edta', 'chx'];
    return ['naocl', 'edta', 'chx'];
};

const guessEndoMedication = (dictation: string): string[] => {
    const normalized = normalizeDictation(dictation);
    if (normalized.includes('ledermix')) return ['ledermix', 'ca(oh)2', 'kalzium'];
    if (normalized.includes('ca(oh)2') || normalized.includes('calcium') || normalized.includes('kalzium')) {
        return ['ca(oh)2', 'kalzium', 'ledermix'];
    }
    return ['ca(oh)2', 'kalzium', 'ledermix'];
};

export function resolveScenarioAnswer(question: ScenarioQuestion, context: ScenarioAnswerContext): string | undefined {
    const rawKey = (question.ruleId ?? question.id).toLowerCase();
    const key = normalizeQuestionKey(question.ruleId ?? question.id);
    const facts = context.instanceFacts ?? {};
    const hasFreeTextInput = !question.options || question.options.length === 0;

    // Free-text askbacks used by top20 treatment packs.
    if (hasFreeTextInput) {
        if (key.includes('untersuchung_anlass')) return 'Kontrolluntersuchung';
        if (key.includes('untersuchung_befunde')) return 'Befunde klinisch unauffaellig';
        if (key.includes('roentgen_indikation')) return 'Diagnostik und Therapieplanung';
        if (key.includes('roentgen_typ')) return 'OPG';
        if (key.includes('roentgen_befund')) return 'Apikale Auffaelligkeit regio 36 dokumentiert';
        if (key.includes('befund')) return 'Klinischer Befund dokumentiert';
        if (key.includes('anlass')) return 'Behandlungsanlass dokumentiert';
    }

    if (key.includes('vitality')) {
        return pickOption(question.options, ['+', 'pos', 'positiv']) ?? '+';
    }
    if (key.includes('percussion') || key.includes('perkussion')) {
        return pickOption(question.options, ['-', 'neg', 'negativ']) ?? '-';
    }
    if (key.includes('diagnose_confirmation')) {
        return pickOption(question.options, ['ja', 'confirmed', 'bestätigt']) ?? 'ja';
    }
    if (key.includes('ueberkappung_material')) {
        return pickOption(question.options, guessCappingMaterial(context.dictation)) ?? 'Ca(OH)2';
    }
    if (key.includes('ueberkappung')) {
        return pickOption(question.options, guessCapping(context.dictation, facts)) ?? 'keine';
    }
    if (key.includes('isolation')) {
        return pickOption(question.options, guessIsolation(context.dictation, facts)) ?? 'relativ';
    }
    if (key.includes('anesthesia') || key.includes('la_type')) {
        return pickOption(question.options, guessAnesthesia(context.dictation, facts)) ?? 'infiltr';
    }
    if (rawKey.includes('mkv_confirmed') || key.includes('mkv_confirmed')) {
        return pickOption(question.options, guessMkvConfirmed(context.dictation, context)) ?? 'nein';
    }
    if (rawKey.includes('mkv_betrag') || rawKey.includes('mkv_amount') || key.includes('mkv_betrag') || key.includes('mkv_amount')) {
        return pickOption(question.options, ['150', '100', '200']) ?? '150';
    }
    if (key.includes('layering')) {
        return pickOption(question.options, guessLayering(context.dictation, facts)) ?? 'einfach';
    }
    if (key.includes('adhesive')) {
        return pickOption(question.options, guessAdhesive(context.dictation)) ?? 'nein';
    }
    if (key.includes('material')) {
        return pickOption(question.options, guessMaterial(context.dictation, facts)) ?? 'komposit';
    }
    if (key.includes('surface')) {
        const surfaceValue = guessSurfaces(facts);
        if (question.options && question.options.length > 0) {
            return pickOption(question.options, surfaceValue ? [surfaceValue] : ['o']);
        }
        return surfaceValue;
    }
    if (key.includes('upsell_mehrschicht')) {
        return pickOption(question.options, ['nein', 'kein']) ?? 'nein';
    }
    if (key.includes('canal_count')) {
        return pickOption(question.options, guessEndoCanalCount(context.dictation, facts)) ?? '3';
    }
    if (key.includes('wf_technique') || key.includes('instrumentation_mode')) {
        return pickOption(question.options, guessEndoTechnique(context.dictation)) ?? 'maschinell';
    }
    if (key.includes('endo_irrigation') || key.includes('irrigation')) {
        return pickOption(question.options, guessEndoIrrigation(context.dictation)) ?? 'NaOCl + EDTA';
    }
    if (key.includes('endo_medication') || key.includes('medication')) {
        return pickOption(question.options, guessEndoMedication(context.dictation)) ?? 'Ca(OH)2';
    }

    // ── Endo question engine IDs (ENDO_*) ────────────────────────
    if (rawKey.startsWith('endo_') || rawKey.includes('endo_t1_') || rawKey.includes('endo_t2_') || rawKey.includes('endo_t3_')) {
        if (rawKey.includes('rubber_dam')) {
            return pickOption(question.options, guessEndoRubberDam(context.dictation)) ?? 'Ja';
        }
        if (rawKey.includes('working_length_method')) {
            return pickOption(question.options, ['apex', 'eal', 'apex locator', 'elektr', 'elektron']) ?? 'Apex Locator';
        }
        if (rawKey.includes('working_lengths')) {
            if (question.options && question.options.length > 0) {
                return pickOption(question.options, ['mb', 'ml', 'd', 'p', 'k1']) ?? question.options[0]?.value;
            }
            return guessEndoWorkingLengths(context.dictation, facts);
        }
        if (rawKey.includes('apical_size_iso')) {
            return pickOption(question.options, ['30', '35', '25']) ?? '30';
        }
        if (rawKey.includes('irrigation')) {
            return pickOption(question.options, ['naocl', 'edta', 'chx']) ?? 'NaOCl + EDTA';
        }
        if (rawKey.includes('instrumentation_mode')) {
            return pickOption(question.options, ['maschin', 'rotier', 'recip']) ?? 'maschinell';
        }
        if (rawKey.includes('medication')) {
            return pickOption(question.options, ['ca', 'ca(oh)2', 'kalzium', 'calcium']) ?? 'Ca(OH)2';
        }
        if (rawKey.includes('obturation_technique')) {
            return pickOption(question.options, ['warm', 'continuous', 'vertical', 'vertikal']) ?? 'warm vertikal';
        }
    }

    return question.options?.[0]?.value;
}
