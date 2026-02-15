export type PredicateFunction = (data: any, insuranceType: string) => boolean;

// Helper to detect filling context
const hasFillingContext = (data: any): boolean => {
    const procedures = data.procedures || [];
    const explicitFilling = procedures.some((p: string) =>
        p.toLowerCase().includes('füllung') ||
        p.toLowerCase().includes('komposit') ||
        p.toLowerCase().includes('restauration')
    );
    if (explicitFilling) return true;

    // Infer from fields
    return !!(data.tooth && (data.surfaces || data.material));
};

export const PREDICATES: Record<string, PredicateFunction> = {
    'isDeepCaries': (data) => {
        const str = (typeof data.caries_depth === 'string' ? data.caries_depth : (typeof data.excavation === 'string' ? data.excavation : '')).toLowerCase();
        return str.includes('tief') ||
            str.includes('profunda') ||
            str.includes('dentinnahe') ||
            str.includes('cp') ||
            str.includes('pulpana');
    },

    'isPosteriorTooth': (data) => {
        const toothStr = data.tooth || '';
        // Check for 4, 5, 6, 7, 8 in the tooth string
        return ['4', '5', '6', '7', '8'].some(n => toothStr.includes(n));
    },

    'hasApproximalSurface': (data) => {
        if (!data.surfaces || !Array.isArray(data.surfaces)) return false;
        return data.surfaces.some((s: string) =>
            s.toLowerCase().includes('mesial') ||
            s.toLowerCase().includes('distal') ||
            s.toLowerCase() === 'm' ||
            s.toLowerCase() === 'd'
        );
    },

    'isRelativeIsolation': (data) => {
        const str = (typeof data.isolation === 'string' ? data.isolation : (typeof data.dryField === 'string' ? data.dryField : '')).toLowerCase();
        return str.includes('relativ') || str.includes('watterolle');
    },

    'isComposite': (data) => {
        const str = typeof data.material === 'string' ? data.material.toLowerCase() : '';
        return str.includes('komposit') ||
            str.includes('tetric') ||
            str.includes('filtek') ||
            str.includes('admira');
    },

    'isEndo': (data) => {
        const procedures = data.procedures || [];
        return procedures.some((p: string) =>
            p.toLowerCase().includes('wurzelkanal') ||
            p.toLowerCase().includes('endodont') ||
            p.toLowerCase().includes('wkb')
        );
    },

    // "Needs" Checks (Encapsulate Logic: Condition + Missing)

    // --- ELIGIBILITY PREDICATES (Condition only) ---
    'isEligibleForInjection': (data, _insuranceType) => {
        return hasFillingContext(data);
    },

    'isEligibleForKofferdam': (data, _insuranceType) => {
        return hasFillingContext(data);
    },

    'isEligibleForConditioning': (data, _insuranceType) => {
        const mat = typeof data.material === 'string' ? data.material.toLowerCase() : '';
        const isComposite = mat.includes('komposit') || mat.includes('tetric') || mat.includes('filtek') || mat.includes('admira');
        return isComposite && hasFillingContext(data);
    },

    'isEligibleForBiteRegistration': (data, _insuranceType) => {
        const surfaces = data.surfaces || [];
        const surfaceCount = surfaces.length;
        return hasFillingContext(data) && surfaceCount >= 3;
    },

    'isEligibleForFluoridation': (data, _insuranceType) => {
        return hasFillingContext(data);
    },

    'isEligibleForLayering': (data, _insuranceType) => {
        const mat = typeof data.material === 'string' ? data.material.toLowerCase() : '';
        const isComposite = mat.includes('komposit') || mat.includes('tetric') || mat.includes('filtek') || mat.includes('admira');
        return isComposite && hasFillingContext(data);
    },

    'isEligibleForXray': (data, _insuranceType) => {
        const caries = (typeof data.caries_depth === 'string' ? data.caries_depth : (typeof data.excavation === 'string' ? data.excavation : '')).toLowerCase();
        const procedures = data.procedures || [];
        const procStr = Array.isArray(procedures) ? procedures.join(' ').toLowerCase() : '';

        const isDeep = caries.includes('tief') || caries.includes('profunda') || caries.includes('dentinnahe') ||
            procStr.includes('tief') || procStr.includes('profunda') || procStr.includes('dentinnahe');
        return !!isDeep;
    },

    'isEligibleForUnderfilling': (data, _insuranceType) => {
        const caries = (typeof data.caries_depth === 'string' ? data.caries_depth : (typeof data.excavation === 'string' ? data.excavation : '')).toLowerCase();
        const procedures = data.procedures || [];
        const procStr = Array.isArray(procedures) ? procedures.join(' ').toLowerCase() : '';

        const isDeep = caries.includes('tief') || caries.includes('profunda') || caries.includes('dentinnahe') ||
            procStr.includes('tief') || procStr.includes('profunda') || procStr.includes('dentinnahe');

        if (!isDeep) return false;
        return hasFillingContext(data);
    },

    'isEligibleForMatrix': (data, _insuranceType) => {
        const mat = typeof data.material === 'string' ? data.material.toLowerCase() : '';
        const isComposite = mat.includes('komposit') || mat.includes('tetric') || mat.includes('filtek') || mat.includes('admira');
        if (!isComposite) return false;

        const hasApproximal = data.surfaces?.some((s: string) =>
            s.toLowerCase().includes('mesial') || s.toLowerCase().includes('distal') || s.toLowerCase() === 'm' || s.toLowerCase() === 'd'
        );
        return !!hasApproximal;
    },

    'isEligibleForBmf': (data, _insuranceType) => {
        if (!hasFillingContext(data)) return false;

        const caries = (typeof data.caries_depth === 'string' ? data.caries_depth : (typeof data.excavation === 'string' ? data.excavation : '')).toLowerCase();
        const procedures = data.procedures || [];
        const procStr = Array.isArray(procedures) ? procedures.join(' ').toLowerCase() : '';

        const isDeep = caries.includes('tief') || caries.includes('profunda') || caries.includes('dentinnahe') ||
            procStr.includes('tief') || procStr.includes('profunda') || procStr.includes('dentinnahe');

        const hasApproximal = data.surfaces?.some((s: string) =>
            s.toLowerCase().includes('mesial') || s.toLowerCase().includes('distal') || s.toLowerCase() === 'm' || s.toLowerCase() === 'd'
        );

        const toothStr = data.tooth || '';
        const isPosterior = ['4', '5', '6', '7', '8'].some(n => toothStr.includes(n));

        return !!(isDeep || hasApproximal || isPosterior);
    },

    'isEligibleForCariesDetector': (data, _insuranceType) => {
        const caries = (typeof data.caries_depth === 'string' ? data.caries_depth : (typeof data.excavation === 'string' ? data.excavation : '')).toLowerCase();
        const procedures = data.procedures || [];
        const procStr = Array.isArray(procedures) ? procedures.join(' ').toLowerCase() : '';

        const isDeep = caries.includes('tief') || caries.includes('profunda') || caries.includes('dentinnahe') ||
            procStr.includes('tief') || procStr.includes('profunda') || procStr.includes('dentinnahe');

        if (!isDeep) return false;
        return hasFillingContext(data);
    },

    'isEligibleForLengthMeasurement': (data, _insuranceType) => {
        const procedures = data.procedures || [];
        const hasEndo = procedures.some((p: string) => p.toLowerCase().includes('wurzel') || p.toLowerCase().includes('wb'));
        return !!hasEndo;
    },

    'isEligibleForMachinePrep': (data, _insuranceType) => {
        const procedures = data.procedures || [];
        const hasEndo = procedures.some((p: string) => p.toLowerCase().includes('wurzel') || p.toLowerCase().includes('wb'));
        return !!hasEndo;
    },

    'isEligibleForCp': (data, _insuranceType) => {
        const caries = (typeof data.caries_depth === 'string' ? data.caries_depth : (typeof data.excavation === 'string' ? data.excavation : '')).toLowerCase();
        const procedures = data.procedures || [];
        const procStr = Array.isArray(procedures) ? procedures.join(' ').toLowerCase() : '';

        const suggestsCp = caries.includes('cp') || caries.includes('profunda') || caries.includes('tief') ||
            procStr.includes('cp') || procStr.includes('profunda') || procStr.includes('tief');

        if (!suggestsCp) return false;
        return hasFillingContext(data);
    },

    'isEligibleForP': (data, _insuranceType) => {
        const caries = (typeof data.caries_depth === 'string' ? data.caries_depth : (typeof data.excavation === 'string' ? data.excavation : '')).toLowerCase();
        const procedures = data.procedures || [];
        const procStr = Array.isArray(procedures) ? procedures.join(' ').toLowerCase() : '';

        const suggestsP = caries.includes('pulpana') || caries.includes('eröffnet') || caries.includes('direkt') ||
            procStr.includes('pulpana') || procStr.includes('eröffnet') || procStr.includes('direkt');

        if (!suggestsP) return false;
        return hasFillingContext(data);
    },

    'isEligibleForILA': (data, _insuranceType) => {
        if (!hasFillingContext(data)) return false;

        const anesth = typeof data.anesthesia === 'string' ? data.anesthesia.toLowerCase() : '';
        if (anesth) {
            return anesth.includes('infil') || anesth.includes('ila') || anesth.includes('oberkiefer') || anesth.includes('ok');
        }
        return false; // Strict mode: no text match -> not eligible
    },

    'isEligibleForLeit': (data, _insuranceType) => {
        if (!hasFillingContext(data)) return false;

        const anesth = typeof data.anesthesia === 'string' ? data.anesthesia.toLowerCase() : '';
        if (anesth) {
            return anesth.includes('leit') || anesth.includes('mandibul') || anesth.includes('uk') || anesth.includes('unterkiefer');
        }
        return false;
    },

    'isEligibleForPulpCapping': (data, _insuranceType) => {
        // Fallback or Union
        return PREDICATES.isEligibleForCp(data, _insuranceType) || PREDICATES.isEligibleForP(data, _insuranceType);
    },


    // --- NEEDS PREDICATES (Condition + Missing) ---
    'needsInjection': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForInjection(data, insuranceType)) return false;
        const str = typeof data.anesthesia === 'string' ? data.anesthesia.toLowerCase() : '';
        const hasInjection = str.includes('infil') || str.includes('leitung') || str.includes('intralig') || str.includes('spritze') || (str.includes('anästhesie') && !str.includes('oberflächen'));
        return !hasInjection;
    },

    'needsKofferdam': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForKofferdam(data, insuranceType)) return false;

        // Check if Kofferdam is already present in any isolation field
        const isolation = (typeof data.isolation === 'string' ? data.isolation : '').toLowerCase();
        const dryField = (typeof data.dryField === 'string' ? data.dryField : '').toLowerCase();
        const kofferdamField = (typeof data.kofferdam === 'boolean' ? data.kofferdam : false);

        const hasKofferdam = isolation.includes('kofferdam') ||
            dryField.includes('kofferdam') ||
            isolation.includes('spanngummi') ||
            kofferdamField === true;

        return !hasKofferdam;
    },

    'needsConditioning': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForConditioning(data, insuranceType)) return false;
        return !data.conditioning && !data.bonding;
    },

    'needsBiteRegistration': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForBiteRegistration(data, insuranceType)) return false;
        return !data.bite_registration;
    },

    'needsFluoridation': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForFluoridation(data, insuranceType)) return false;
        return !data.fluoridation;
    },

    'needsLayering': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForLayering(data, insuranceType)) return false;
        return !data.technique && !data.schichttechnik;
    },

    'needsXray': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForXray(data, insuranceType)) return false;
        return !data.xray && !data.imaging;
    },

    'needsUnderfilling': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForUnderfilling(data, insuranceType)) return false;
        return !data.underfilling && !data.base_lining;
    },

    'needsMatrix': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForMatrix(data, insuranceType)) return false;
        return !data.matrix_system && !data.matrizenband;
    },

    'needsBmf': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForBmf(data, insuranceType)) return false;
        return !data.bmf && !data.special_measures;
    },

    'needsCariesDetector': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForCariesDetector(data, insuranceType)) return false;
        return !data.caries_detector;
    },

    'needsPulpCapping': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForPulpCapping(data, insuranceType)) return false;
        return !data.pulp_capping && !data.ueberkappung;
    },

    'needsLengthMeasurement': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForLengthMeasurement(data, insuranceType)) return false;
        return !data.length_measurement;
    },

    'needsMachinePrep': (data, insuranceType) => {
        if (!PREDICATES.isEligibleForMachinePrep(data, insuranceType)) return false;
        return !data.machine_preparation;
    }
};
