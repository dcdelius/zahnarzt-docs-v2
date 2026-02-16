import type { V10BundleInput, V10BundleOutput } from '../types';
import {
    runV10Bundle as runPipelineBundle,
    type RunV10BundleOptions,
} from '../pipeline/runV10Bundle';

export type MultiTreatmentRunV10BundleOptions = RunV10BundleOptions;

export async function runV10Bundle(
    input: V10BundleInput,
    opts?: MultiTreatmentRunV10BundleOptions
): Promise<V10BundleOutput> {
    return runPipelineBundle(input, opts);
}
