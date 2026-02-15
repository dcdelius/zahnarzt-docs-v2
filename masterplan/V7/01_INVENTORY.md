# V7 Inventory

## Purpose
Complete file listing for V7 + supporting modules. Owner = backend | contract | ui | test.

---

## V7 Pipeline
| Path | Purpose | Owner |
|------|---------|-------|
| `src/docudent/v7/pipeline/index.ts` | Single entry point — orchestrates extraction/questions/output | backend |
| `src/docudent/v7/pipeline/types.ts` | Local types (re-exports from contracts) | contract |

## V7 Tests
| Path | Purpose | Owner |
|------|---------|-------|
| `__tests__/answer-translator.test.ts` | ID translation tests | test |
| `__tests__/contract-drift.test.ts` | Contract sync validation | test |
| `__tests__/no-logic.test.ts` | Forbidden patterns in UI | test |
| `__tests__/reality-flow.test.ts` | E2E flow validation | test |
| `__tests__/reality-integration.test.ts` | SSOT integration tests | test |
| `__tests__/render.test.tsx` | Component render tests | test |

## V7 UI Components
| Path | Purpose | Owner |
|------|---------|-------|
| `components/ActionDock.tsx` | Bottom action buttons | ui |
| `components/DictationAura.tsx` | Recording visual effect | ui |
| `components/HeroSculpture.tsx` | 3D tooth visualization | ui |
| `components/InsuranceSelector.tsx` | GKV/PKV toggle | ui |
| `components/OutputRenderer.tsx` | Final output display | ui |
| `components/PrimaryCTAButton.tsx` | Coral CTA button | ui |
| `components/QuestionRenderer.tsx` | Question content (grouped) | ui |
| `components/QuestionsCard.tsx` | Glass card container | ui |
| `components/QuestionsLayout.tsx` | Two-column layout | ui |
| `components/StepDots.tsx` | Progress indicator | ui |
| `components/SummaryChips.tsx` | Extracted data pills | ui |
| `components/TextLengthSelector.tsx` | Text length toggle | ui |
| `components/TreatmentSelector.tsx` | Treatment type selector | ui |
| `components/WarningCard.tsx` | Warning display card | ui |

## V7 Hooks
| Path | Purpose | Owner |
|------|---------|-------|
| `hooks/useV7Pipeline.ts` | React hook wrapping pipeline | ui |

## V7 Pages
| Path | Purpose | Owner |
|------|---------|-------|
| `pages/DocudentV7Page.tsx` | Main V7 page | ui |

## V7 Styles
| Path | Purpose | Owner |
|------|---------|-------|
| `styles/tokens.ts` | Design tokens (colors, spacing, motion) | ui |

---

## Contracts (SSOT)
| Path | Purpose | Owner |
|------|---------|-------|
| `contracts/extraction.ts` | ExtractedData, Field<T>, MentionedFields | contract |
| `contracts/index.ts` | Re-exports all contracts | contract |
| `contracts/output.ts` | Output types | contract |
| `contracts/pipeline.ts` | PipelineInput, PipelineResult | contract |
| `contracts/questions.ts` | DynamicQuestion | contract |
| `contracts/warnings.ts` | ValidationWarning | contract |

---

## Core/KnowledgeBase — Logic
| Path | Purpose | Owner |
|------|---------|-------|
| `logic/answerIdTranslator.ts` | Semantic → Canonical ID mapping | backend |
| `logic/chipResolver.ts` | Answer → Chip resolution | backend |
| `logic/outputComposer.ts` | Billing + text output assembly | backend |
| `logic/treatmentEngine.ts` | Chip definitions + billing rules | backend |
| `logic/regelEngine.ts` | Rule evaluation engine | backend |

## Core/KnowledgeBase — Questions
| Path | Purpose | Owner |
|------|---------|-------|
| `questions/fuellung_question_bank.json` | Question definitions (semantic IDs) | data |
| `questions/questionBank.ts` | Glob-based loader | backend |

## Core/KnowledgeBase — Mappings
| Path | Purpose | Owner |
|------|---------|-------|
| `mappings/fuellung_answer_map.json` | Answer → Chip mapping (canonical IDs) | data |
| `mappings/fuellung_finding_map.json` | Finding mappings | data |

---

## V6 Services (Backend)
| Path | Purpose | Owner |
|------|---------|-------|
| `v6/services/extractionService.ts` | LLM/Regex extraction | backend |
| `v6/services/questionService.ts` | Question generation | backend |
| `v6/services/outputService.ts` | Output orchestration | backend |
| `v6/services/toothNormalizer.ts` | Tooth number normalization | backend |

---

## ID Generation Points (Critical)
| Location | ID Type | Generated Value |
|----------|---------|-----------------|
| `questionBank.json` | question.key | `vitality`, `isolation`, `tiefe` |
| `questionService.ts` | question.id | Uses `def.key` from questionBank |
| `QuestionRenderer.tsx` | answers Map key | Uses `question.id` |
| `answerIdTranslator.ts` | canonical | `isolation` → `kofferdam` |
| `answer_map.json` | questionIdPatterns | Expected patterns for matching |
