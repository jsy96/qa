"use client";

import type { AnalysisMessage } from "@/lib/skills/types";

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
  message: AnalysisMessage;
}

export default function ChatMessage({ message }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-navy text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%] text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  switch (message.type) {
    case "classification":
      return <ClassificationMessage message={message} />;
    case "skill-progress":
      return <SkillProgressMessage message={message} />;
    case "synthesis":
      return <SynthesisMessage message={message} />;
    default:
      return (
        <div className="text-sm text-text-secondary">{message.content}</div>
      );
  }
}

function ClassificationMessage({ message }: Props) {
  const classification = message.metadata?.classification;
  const plan = message.metadata?.executionPlan;

  if (!classification) return null;

  return (
    <div className="bg-gold/10 border border-gold/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center text-xs text-navy font-bold">
          ✓
        </div>
        <span className="text-sm font-semibold text-navy">已匹配分析方法</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {classification.primarySkills.map((slug) => (
          <span
            key={slug}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-navy text-white"
          >
            {getSkillName(slug)}
          </span>
        ))}
      </div>
      {classification.reasoning && classification.reasoning.length > 0 && (
        <div className="space-y-1 mt-2">
          {classification.reasoning.map((r, i) => (
            <p key={i} className="text-xs text-text-secondary">
              <span className="font-medium">{getSkillName(r.skill)}：</span>
              {r.reason}
            </p>
          ))}
        </div>
      )}
      {plan && plan.executionOrder.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gold/20">
          <p className="text-xs text-text-secondary">
            分析顺序：{plan.executionOrder.map(getSkillName).join(" → ")}
          </p>
        </div>
      )}
    </div>
  );
}

function SkillProgressMessage({ message }: Props) {
  const skill = message.metadata?.activeSkill;

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
      <span className="text-sm text-navy font-medium">
        正在分析：{getSkillName(skill || "")}
      </span>
    </div>
  );
}

function SynthesisMessage({ message }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center text-xs text-navy font-bold">
          B
        </div>
        <span className="text-sm font-semibold text-navy">分析报告</span>
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}
