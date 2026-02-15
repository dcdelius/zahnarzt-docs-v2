/**
 * Medical KB Module
 */

export * from './types';
export { jsonMedicalKbProvider, clearMedicalKbCache } from './providers/jsonProvider';

// Default provider
import { jsonMedicalKbProvider } from './providers/jsonProvider';
export const defaultMedicalKbProvider = jsonMedicalKbProvider;
