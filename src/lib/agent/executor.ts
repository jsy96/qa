import { createClient, MODEL } from '@/lib/openai/client';
import { getSkill } from '@/lib/skills/registry';
import { buildSkillExecutionPrompt, buildStepPrompt } from './prompts';
import type { StepResult, SkillResult } from '@/lib/skills/types';

export async function executeSkill(
  skillSlug: string,
  userQuery: string,
  previousSkillsContext: string,
): Promise<SkillResult> {
  const client = createClient();
  const skill = getSkill(skillSlug);

  if (!skill) {
    return {
      skill: skillSlug,
      stepResults: [],
      summary: `Skill ${skillSlug} not found`,
      warnings: [],
    };
  }

  const systemPrompt = buildSkillExecutionPrompt(
    skill.frontmatter.name,
    skill.sections.I,
    skill.sections.A1,
    skill.sections.B,
    skill.sections.R,
  );

  const stepResults: StepResult[] = [];
  let previousFindings = previousSkillsContext;
  let stoppedEarly = false;

  for (const step of skill.sections.E) {
    if (stoppedEarly) {
      stepResults.push({
        skill: skillSlug,
        step: step.stepNumber,
        finding: '[跳过] 前序步骤已触发判停条件',
        stoppedEarly: true,
      });
      continue;
    }

    const stepPrompt = buildStepPrompt(
      step.stepNumber,
      step.instruction,
      step.completionCriteria,
      step.stopCondition,
      previousFindings,
      userQuery,
    );

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: stepPrompt },
      ],
      temperature: 0.5,
    });

    let fullContent = response.choices[0]?.message?.content || '';

    const hasStop = fullContent.includes('[STOP]');
    if (hasStop) {
      fullContent = fullContent.replace('[STOP]', '').trim();
      stoppedEarly = true;
    }

    stepResults.push({
      skill: skillSlug,
      step: step.stepNumber,
      finding: fullContent,
      stoppedEarly: hasStop,
    });

    previousFindings += `\n\n[${skill.frontmatter.name} - 步骤${step.stepNumber}结论]: ${fullContent}`;
  }

  const summary = stepResults
    .filter(r => !r.stoppedEarly || r.finding !== '[跳过] 前序步骤已触发判停条件')
    .map(r => `步骤${r.step}：${r.finding}`)
    .join('\n');

  const warnings: string[] = [];
  if (skill.sections.B) {
    const lines = skill.sections.B.split('\n').filter(l => l.trim().startsWith('-'));
    warnings.push(...lines.map(l => l.replace(/^-\s*/, '').trim()));
  }

  return {
    skill: skillSlug,
    stepResults,
    summary,
    warnings,
  };
}
