"use client";

import type { SkillClassification, ExecutionPlan } from "@/lib/skills/types";

const SKILL_NAMES: Record<string, string> = {
  "circle-of-competence": "能力圈",
  "mr-market": "市场先生",
  "business-picker": "做生意不做股票",
  "real-conservatism": "真正的保守",
  "aesop-three-questions": "伊索三问",
  "margin-of-safety": "安全边际",
  "look-through-earnings": "透视盈余",
  "three-asset-categories": "三类资产",
  "economic-moat": "经济护城河",
  "cigar-butt-vs-great-business": "雪茄蒂vs伟大企业",
  "float-thinking": "浮存金思维",
  "fear-and-greed": "恐惧与贪婪",
  "institutional-imperative": "机构强制力",
  "hold-forever": "永久持有",
  "first-law-of-capital-allocation": "资本配置第一定律",
  "compounding-thinking": "复利思维",
  "no-leverage": "拒绝杠杆",
  "never-issue-shares": "永不增发",
  "ceo-as-risk-officer": "CEO即风控官",
  "partner-with-admired": "与仰慕者共事",
};

function getSkillName(slug: string): string {
  return SKILL_NAMES[slug] || slug;
}

interface Props {
  classification: SkillClassification | null;
  executionPlan: ExecutionPlan | null;
  completedSkills: string[];
  activeSkill: string | null;
}

export default function SkillChainProgress({
  classification,
  executionPlan,
  completedSkills,
  activeSkill,
}: Props) {
  if (!executionPlan) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-30">📊</div>
          <p className="text-sm text-text-secondary">
            输入投资问题后，分析进度将在这里展示
          </p>
        </div>
      </div>
    );
  }

  const primarySet = new Set(executionPlan.primarySkills);
  const secondarySet = new Set(executionPlan.secondarySkills);

  return (
    <div className="flex-1 p-4">
      {/* Skill chain */}
      <div className="space-y-3">
        {executionPlan.executionOrder.map((slug, index) => {
          const isCompleted = completedSkills.includes(slug);
          const isActive = activeSkill === slug;
          const isPrimary = primarySet.has(slug);
          const isSecondary = secondarySet.has(slug);

          return (
            <div key={slug} className="relative">
              {/* Connector line */}
              {index < executionPlan.executionOrder.length - 1 && (
                <div className="absolute left-[15px] top-[36px] w-0.5 h-[calc(100%-20px)] bg-border" />
              )}

              <div className="flex items-start gap-3">
                {/* Status indicator */}
                <div
                  className={`w-[32px] h-[32px] rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-gold text-navy skill-active"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted ? "✓" : isActive ? "⟳" : index + 1}
                </div>

                {/* Skill info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-gold"
                          : isCompleted
                          ? "text-green-700"
                          : "text-text-secondary"
                      }`}
                    >
                      {getSkillName(slug)}
                    </span>
                    {isPrimary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy text-white">
                        核心
                      </span>
                    )}
                    {isSecondary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                        协同
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">
                    {slug}
                  </p>
                  {isActive && (
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full animate-pulse w-2/3" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contrast skills */}
      {executionPlan.contrastSkills.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <h3 className="text-xs font-semibold text-text-secondary mb-2">
            对立视角参考
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {executionPlan.contrastSkills.map((slug) => (
              <span
                key={slug}
                className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200"
              >
                {getSkillName(slug)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-navy">
              {completedSkills.length}/{executionPlan.executionOrder.length}
            </p>
            <p className="text-[10px] text-text-secondary">已完成</p>
          </div>
          <div>
            <p className="text-lg font-bold text-navy">
              {executionPlan.primarySkills.length}
            </p>
            <p className="text-[10px] text-text-secondary">核心分析</p>
          </div>
          <div>
            <p className="text-lg font-bold text-navy">
              {executionPlan.executionOrder.length}
            </p>
            <p className="text-[10px] text-text-secondary">总步骤</p>
          </div>
        </div>
      </div>
    </div>
  );
}
