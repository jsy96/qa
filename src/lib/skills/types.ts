// Skill frontmatter from YAML
export interface SkillFrontmatter {
  name: string;
  description: string;
  source_book: string;
  source_chapter: string;
  tags: string[];
  related_skills: string[];
}

// Execution step from E section
export interface ExecutionStep {
  stepNumber: number;
  instruction: string;
  completionCriteria: string;
  stopCondition?: string;
}

// Trigger scenario from A2 section
export interface TriggerScenario {
  raw: string;
  languageSignals: string[];
}

// Relationship types between skills
export interface SkillRelationships {
  dependsOn: string[];
  composesWith: string[];
  contrastsWith: string[];
}

// Full skill data structure
export interface Skill {
  slug: string;
  frontmatter: SkillFrontmatter;
  sections: {
    R: string;
    I: string;
    A1: string;
    A2: TriggerScenario;
    E: ExecutionStep[];
    B: string;
  };
  relationships: SkillRelationships;
}

// Skill metadata for index (lighter weight)
export interface SkillMeta {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  source_chapter: string;
  relationships: SkillRelationships;
}

// Classification result from GPT-4
export interface SkillClassification {
  primarySkills: string[];
  reasoning: Array<{ skill: string; reason: string }>;
}

// Expanded execution plan after graph resolution
export interface ExecutionPlan {
  primarySkills: string[];
  secondarySkills: string[];
  contrastSkills: string[];
  executionOrder: string[];
}

// Step execution result
export interface StepResult {
  skill: string;
  step: number;
  finding: string;
  stoppedEarly: boolean;
}

// Skill execution result
export interface SkillResult {
  skill: string;
  stepResults: StepResult[];
  summary: string;
  warnings: string[];
}

// Final analysis report
export interface AnalysisReport {
  query: string;
  activatedSkills: SkillResult[];
  synthesis: string;
  warnings: string[];
}

// SSE event types
export type SSEEventType =
  | 'classification'
  | 'skill-start'
  | 'step-start'
  | 'step-content'
  | 'step-complete'
  | 'skill-complete'
  | 'synthesis'
  | 'done'
  | 'error';

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

// Chat message types
export interface AnalysisMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'query' | 'classification' | 'skill-progress' | 'step-content' | 'synthesis' | 'report';
  metadata?: {
    classification?: SkillClassification;
    executionPlan?: ExecutionPlan;
    activeSkill?: string;
    stepNumber?: number;
    totalSteps?: number;
  };
  timestamp: number;
}
