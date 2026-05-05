import { classifyQuery } from './classifier';
import { executeSkill } from './executor';
import { resolveExecutionPlan } from '@/lib/skills/graph';
import { buildSynthesisPrompt } from './prompts';
import { createClient, MODEL } from '@/lib/openai/client';
import type { ExecutionPlan, SkillResult, SSEEvent } from '@/lib/skills/types';

export async function* runAnalysis(
  query: string,
): AsyncGenerator<SSEEvent> {
  // Step 1: Classify
  let classification;
  try {
    classification = await classifyQuery(query);
  } catch (err) {
    yield {
      event: 'error',
      data: { message: `分类失败: ${err instanceof Error ? err.message : String(err)}` },
    };
    return;
  }

  // Step 2: Resolve execution plan
  const plan: ExecutionPlan = resolveExecutionPlan(classification.primarySkills);

  yield {
    event: 'classification',
    data: {
      primarySkills: classification.primarySkills,
      reasoning: classification.reasoning,
      executionPlan: plan,
    },
  };

  // Step 3: Execute skills in order
  const skillResults: SkillResult[] = [];
  const previousContexts: string[] = [];

  for (const skillSlug of plan.executionOrder) {
    yield {
      event: 'skill-start',
      data: {
        skill: skillSlug,
        totalSteps: getSkillStepCount(skillSlug),
      },
    };

    const result = await executeSkill(
      skillSlug,
      query,
      previousContexts.join('\n\n'),
    );

    skillResults.push(result);
    previousContexts.push(`[${result.skill}] ${result.summary}`);

    yield {
      event: 'skill-complete',
      data: {
        skill: skillSlug,
        summary: result.summary,
        warnings: result.warnings,
        stepResults: result.stepResults.map(r => ({
          step: r.step,
          stoppedEarly: r.stoppedEarly,
        })),
      },
    };
  }

  // Step 4: Synthesize
  const synthesisPrompt = buildSynthesisPrompt(
    query,
    skillResults.map(r => ({
      skill: r.skill,
      summary: r.summary,
      warnings: r.warnings,
    })),
  );

  const client = createClient();
  const synthesisResponse = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: synthesisPrompt }],
    temperature: 0.5,
  });

  const synthesis = synthesisResponse.choices[0]?.message?.content || '综合分析生成失败';

  yield {
    event: 'synthesis',
    data: {
      content: synthesis,
      warnings: skillResults.flatMap(r => r.warnings),
    },
  };

  yield {
    event: 'done',
    data: {
      activatedSkills: skillResults,
      synthesis,
    },
  };
}

function getSkillStepCount(slug: string): number {
  try {
    const skillData = require(`@/data/skills/${slug}.json`);
    return skillData.sections?.E?.length || 0;
  } catch {
    return 0;
  }
}
