/**
 * Logic Module Export
 * 
 * Zentrale Exports für die Abrechnungs-Logik-Schicht
 */

export {
    // Types
    ZahnSituation,
    LueckenSituation,
    Befundklasse,
    BefundResult,

    // Functions
    istImVerblendbereich,
    getVerblendbereichZaehne,
    ermittleBefundklasse,
    getBefundeFuerZahn,
    getBefundeFuerBruecke,
    getBefundeFuerProthese
} from './befundLogic';

export {
    // Types
    BonusStatus,
    FestzuschussResult,

    // Functions
    berechneFestzuschuss,
    berechneFZFuerZahn,
    berechneFZFuerBruecke,
    berechneFZFuerProthese
} from './festzuschussMapper';

export {
    // Types
    Versorgungsart,
    BEMAPosition,
    GOZPosition,
    LaborKosten,
    GleichartResult,

    // Functions
    findeSplittingRegel,
    berechneGleichartVersorgung,
    istGOZBerechenbar
} from './gleichartigCalculator';

export {
    // Types
    BegruendungsResult,
    IndikatorKategorie,
    IndikatorMapping,

    // Functions
    generiereBegruendung,
    generiereStandardBegruendung,
    findeIndikatoren,
    berechneEmpfohlenenFaktor,
    ALLE_INDIKATOREN
} from './begruendungsGenerator';

export {
    // Types
    PatientData,
    PraxisData,
    MKVPosition,
    MKVResult,

    // Functions
    generiereMKV,
    generiereMKVFuerKrone
} from './mkvTemplateGenerator';

export {
    // Types
    Therapieart,
    HKPZahn,
    HKPPosition,
    LaborPosition,
    HKPResult,

    // Functions
    generiereHKPKrone,
    generiereHKPBruecke,
    formatHKPSummary
} from './hkpGenerator';

export {
    // Types
    BillingCode,
    SearchableCodeResult,

    // Functions
    generateSearchableText,
    processCodeCatalog,
    enrichCodesWithSearchable,
    normalizeText,
    extractKeywords,
    findSynonyme,
    fuzzySearch,
    levenshteinDistance
} from './searchableTextGenerator';

export {
    // Types
    BillingRule,
    LinkedCode,
    RegelIndex,
    KonfliktPruefung,
    CodeEmpfehlung,

    // Functions
    buildRegelIndex,
    getRegelnFuerCode,
    getCodesFuerRegel,
    habenGemeinsameRegel,
    pruefeKonflikte,
    generiereEmpfehlungen,
    enrichCodesWithRegelIds
} from './regelLinker';

export {
    // Types
    InsuranceType,
    ExtractedData,
    BillingSuggestion,
    BillingInferenceResult,

    // Functions
    inferBilling,
    inferBillingForTooth,
    inferBillingForFilling
} from './billingInference';

export {
    // Types
    ValidationResult,

    // Functions
    validateBillingCodes,
    sindCodesKompatibel,
    getRegelnFuerCode as getValidationRegelnFuerCode,
    loadBillingRules,
    getRegelIndex
} from './billingValidation';

export {
    // Types
    type Bel2Entry,
    type Bel2PageRange,
    type Bel2Meta,
    type Bel2Catalog,

    // Functions
    loadBel2Catalog,
    getBel2Meta,
    getBel2Entries,
    lookupBel2,
    normalizeBel2Code,
    hasBel2Code,
    searchBel2ByKurztext
} from './bel2Catalog';

