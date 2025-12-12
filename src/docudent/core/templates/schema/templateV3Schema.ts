import { z } from 'zod';

export const RenderSectionId = z.enum(['summary', 'billing', 'procedure', 'forensic', 'extras']);

export const TemplateV3SpecSchema = z.object({
  id: z.string().min(3),
  title: z.string().min(3),
  systemVersion: z.literal('v3'),
  treatmentType: z.string().min(2),
  version: z.number().int().min(1).default(1),

  rulesetId: z.string().min(2),

  fields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['string', 'text', 'boolean', 'multiselect', 'select', 'date']),
    options: z.array(z.string()).optional(),
    defaultValue: z.any().optional(),
    required: z.boolean().optional(),
    description: z.string().optional()
  })).default([]),

  renderSpec: z.object({
    sections: z.array(z.object({
      id: RenderSectionId,
      required: z.boolean().default(true),
      title: z.string().optional(), // Optional override for section title
    })).min(1),
    strict: z.literal(true).default(true),
  }),

  requiredFacts: z.array(z.string()).default([]),

  blueprint: z.object({
    summary: z.string().optional(),
    procedure: z.string().optional(),
    forensic: z.string().optional(),
    billing: z.string().optional(),
    extras: z.string().optional(),
  }).optional(),

  renderMode: z.enum(['deterministic', 'llm_polish', 'llm_generate']).default('llm_generate'),

  defaults: z.object({
    insuranceType: z.enum(['GKV', 'PKV']).optional(),
    showBillingCodes: z.boolean().optional(),
    includeRisks: z.boolean().optional(),
    forensicLevel: z.enum(['minimal', 'standard', 'detailed']).optional(),
    textLength: z.enum(['compact', 'standard', 'verbose']).optional(),
    activeStandards: z.array(z.string()).optional(),
  }).optional()
});

export type TemplateV3Spec = z.infer<typeof TemplateV3SpecSchema>;
export type RenderSectionIdType = z.infer<typeof RenderSectionId>;

