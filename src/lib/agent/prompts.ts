export const CLASSIFICATION_SYSTEM_PROMPT = `你是一个巴菲特投资分析 Agent 的 skill 分类器。

给定用户的投资问题，你需要判断哪些分析 skill 应该被激活。

可用的 skill 列表如下。每个 skill 包含：名称、描述（含触发条件和语言信号）、标签。

选择规则：
1. 根据触发条件和语言信号匹配 primary skills（1-4 个）
2. 宁少勿多——选择最直接相关的，而非宽泛覆盖
3. 常见匹配模式：
   - "该不该买/卖" → circle-of-competence, business-picker, aesop-three-questions, margin-of-safety
   - "是不是好公司" → economic-moat, look-through-earnings
   - "市场涨跌/追涨杀跌" → mr-market, fear-and-greed
   - "杠杆/借钱投资" → no-leverage, margin-of-safety
   - "持有/卖出" → hold-forever, compounding-thinking
   - "管理/管理层" → institutional-imperative, partner-with-admired, ceo-as-risk-officer

你必须返回 JSON 格式：
{
  "primarySkills": ["skill-slug-1", "skill-slug-2"],
  "reasoning": [
    { "skill": "skill-slug", "reason": "选择理由" }
  ]
}`;

export function buildSkillListPrompt(skills: Array<{
  slug: string;
  name: string;
  description: string;
  tags: string[];
  languageSignals: string[];
}>): string {
  return skills.map(s => {
    const signals = s.languageSignals.length > 0
      ? `\n   语言信号: ${s.languageSignals.map(sig => `"${sig}"`).join(', ')}`
      : '';
    return `- **${s.slug}** (${s.name}): ${s.description.split('\n')[0]}${signals}\n  标签: ${s.tags.join(', ')}`;
  }).join('\n');
}

export function buildSkillExecutionPrompt(
  skillName: string,
  interpretation: string,
  pastCase: string,
  boundary: string,
  originalQuote: string,
): string {
  return `你现在正在应用巴菲特投资分析框架中的「${skillName}」。

## 方法论骨架
${interpretation}

## 参考案例
${pastCase}

## 巴菲特原话
${originalQuote}

## 边界与盲点
${boundary}

请严格按照分析步骤执行。每完成一步，给出明确的结论。如果判停条件满足，在输出末尾加上 [STOP] 标记。`;
}

export function buildStepPrompt(
  stepNumber: number,
  instruction: string,
  completionCriteria: string,
  stopCondition: string | undefined,
  previousFindings: string,
  userQuery: string,
): string {
  let prompt = `用户问题：${userQuery}

当前正在执行第 ${stepNumber} 步：
${instruction}`;

  if (completionCriteria) {
    prompt += `\n\n完成标准：${completionCriteria}`;
  }

  if (stopCondition) {
    prompt += `\n\n判停条件：${stopCondition}（如果满足，在回答末尾加上 [STOP]）`;
  }

  if (previousFindings) {
    prompt += `\n\n之前的分析发现：\n${previousFindings}`;
  }

  prompt += '\n\n请直接给出本步的分析结论，不要重复步骤说明。';

  return prompt;
}

export function buildSynthesisPrompt(
  userQuery: string,
  skillResults: Array<{
    skill: string;
    summary: string;
    warnings: string[];
  }>,
): string {
  const findings = skillResults.map(r =>
    `### ${r.skill}\n${r.summary}\n${r.warnings.length > 0 ? `注意：${r.warnings.join('；')}` : ''}`
  ).join('\n\n');

  return `用户问题：${userQuery}

以下是多个巴菲特投资分析框架的分析结果：

${findings}

请综合以上所有分析，给出一份结构化的投资建议报告。要求：
1. 先给出一个明确的结论（1-2句话）
2. 然后列出关键发现（每个框架的核心结论）
3. 标注边界条件和风险提醒
4. 最后给出可执行的下一步行动建议

用中文回答。`;
}
