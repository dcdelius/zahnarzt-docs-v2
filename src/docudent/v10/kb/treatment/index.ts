/**
 * Treatment KB Module
 */

export * from './types';
export { jsonTreatmentKbProvider, clearTreatmentKbCache } from './providers/jsonProvider';
export { firestoreTreatmentKbProvider, isFirestoreEnabled, preloadTreatmentKbFromFirestore } from './providers/firestoreProvider';

// Default provider
import { jsonTreatmentKbProvider } from './providers/jsonProvider';
import { firestoreTreatmentKbProvider, isFirestoreEnabled } from './providers/firestoreProvider';

export const defaultTreatmentKbProvider = isFirestoreEnabled()
    ? firestoreTreatmentKbProvider
    : jsonTreatmentKbProvider;
