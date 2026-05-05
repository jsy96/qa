import { createClient, MODEL } from '@/lib/openai/client';
import { getSkillDescriptions } from '@/lib/skills/registry';
import { CLASSIFICATION_SYSTEM_PROMPT, buildSkillListPrompt } from './prompts';
import type { SkillClassification } from '@/lib/skills/types';

// All valid skill slugs
const VALID_SLUGS = new Set([
  'circle-of-competence', 'mr-market', 'business-picker', 'real-conservatism',
  'aesop-three-questions', 'margin-of-safety', 'look-through-earnings', 'three-asset-categories',
  'economic-moat', 'cigar-butt-vs-great-business', 'float-thinking',
  'fear-and-greed', 'institutional-imperative',
  'hold-forever', 'first-law-of-capital-allocation', 'compounding-thinking',
  'no-leverage', 'never-issue-shares', 'ceo-as-risk-officer', 'partner-with-admired',
]);

function cleanSlug(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  if (VALID_SLUGS.has(s)) return s;
  // Try to match partial (e.g. "(无)" → skip)
  return null;
}

export async function classifyQuery(query: string): Promise<SkillClassification> {
  const client = createClient();
  const skills = getSkillDescriptions();
  const skillList = buildSkillListPrompt(skills);

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT + '\n\n请直接输出纯JSON，不要包含markdown代码块标记，不要在数组中添加注释或解释。' },
      { role: 'user', content: `可用的 skill 列表：\n${skillList}\n\n用户问题：${query}` },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '{}';

  // Extract JSON from response (may be wrapped in ```json ... ```)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { primarySkills: [], reasoning: [] };
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as SkillClassification;

    // Clean primarySkills - only keep valid slugs
    const cleaned = (result.primarySkills || [])
      .map(s => cleanSlug(s))
      .filter((s): s is string => s !== null);

    // Clean reasoning - only keep entries for valid slugs
    const cleanedReasoning = (result.reasoning || []).filter(
      r => r.skill && cleanSlug(r.skill)
    );

    return {
      primarySkills: cleaned,
      reasoning: cleanedReasoning,
    };
  } catch {
    return { primarySkills: [], reasoning: [] };
  }
}
