"use client";

import { useState } from "react";
import AnalysisChat from "@/components/analysis/AnalysisChat";
import SkillChainProgress from "@/components/skills/SkillChainProgress";
import type { SkillClassification, ExecutionPlan } from "@/lib/skills/types";

export default function Home() {
  const [classification, setClassification] = useState<SkillClassification | null>(null);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [completedSkills, setCompletedSkills] = useState<string[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-navy text-white px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-navy font-bold text-sm">
          B
        </div>
        <div>
          <h1 className="text-lg font-semibold">巴菲特投资分析 Agent</h1>
          <p className="text-xs text-blue-200">
            基于 20 个核心投资方法论的结构化分析
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Chat */}
        <div className="w-3/5 flex flex-col border-r border-border">
          <AnalysisChat
            onClassificationChange={setClassification}
            onExecutionPlanChange={setExecutionPlan}
            onSkillComplete={(skill) =>
              setCompletedSkills((prev) => [...prev, skill])
            }
            onActiveSkillChange={setActiveSkill}
          />
        </div>

        {/* Right panel - Visualization */}
        <div className="w-2/5 flex flex-col bg-surface overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-navy">分析进度</h2>
          </div>
          <SkillChainProgress
            classification={classification}
            executionPlan={executionPlan}
            completedSkills={completedSkills}
            activeSkill={activeSkill}
          />
        </div>
      </div>
    </div>
  );
}
