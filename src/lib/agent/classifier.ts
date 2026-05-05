import { createClient, MODEL } from '@/lib/openai/client';
import { getSkillDescriptions } from '@/lib/skills/registry';
import { CLASSIFICATION_SYSTEM_PROMPT, buildSkillListPrompt } from './prompts';
import type { SkillClassification } from '@/lib/skills/types';

export async function classifyQuery(query: string): Promise<SkillClassification> {
  const client = createClient();
  const skills = getSkillDescriptions();
  const skillList = buildSkillListPrompt(skills);

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT + '\n\n请直接输出JSON，不要包含markdown代码块标记。' },
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
    const validSlugs = new Set(skills.map(s => s.slug));
    result.primarySkills = (result.primarySkills || []).filter(s => validSlugs.has(s));
    result.reasoning = result.reasoning || [];
    return result;
  } catch {
    return { primarySkills: [], reasoning: [] };
  }
}
