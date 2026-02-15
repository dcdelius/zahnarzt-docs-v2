/**
 * V10 UI Components Barrel
 * 
 * All components are now V10-native (copied from V7).
 * NO V7 IMPORTS.
 */

// Visual components (V10-native)
export { SoftGradientBackground } from './SoftGradientBackground';
export { HeroSculpture } from './HeroSculpture';

// Flow components (V10-native)
export { QuestionsFlowV2 } from './QuestionsFlowV2';
export { OutputFlow } from './OutputFlow';
export { MultiOutputRenderer } from './MultiOutputRenderer';
export { MultiInstancePanel } from './MultiInstancePanel';

// V10 Native Components
export { V10TreatmentSelector } from './V10TreatmentSelector';
export { V10TextLengthSelector } from './V10TextLengthSelector';
export { V10InsuranceSelector } from './V10InsuranceSelector';
export { V10DebugDrawer } from './V10DebugDrawer';
export { V10ReviewStep } from './V10ReviewStep';
export { V10PostAnalysisDashboard } from './V10PostAnalysisDashboard';
export { V10TracePanel } from './V10TracePanel';

// Types (V10-native definitions)
export interface TreatmentInstance {
    instanceId: string;
    tooth?: string;
    dictation?: string;
    answers?: Map<string, unknown> | Record<string, unknown>;
}

export type UiStep = 'dictation' | 'review' | 'analysis' | 'output' | 'error';
