/**
 * Surface Extraction Module — Public Exports
 */

export {
    normalizeSurfaces,
    type SurfaceNormalizationResult,
    type SurfaceNormalizationInput,
    type SurfaceSource,
    type CanonicalSurface,
    ALL_CANONICAL_SURFACES,
} from './normalizeSurfaces';

export {
    UNAMBIGUOUS_TERMS,
    UNAMBIGUOUS_COMPOUNDS,
    AMBIGUOUS_TERMS,
    isAmbiguousTerm,
    sortCanonical,
} from './lexicon';
