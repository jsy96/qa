"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import type {
  AnalysisMessage,
  SkillClassification,
  ExecutionPlan,
} from "@/lib/skills/types";

const SUGGESTIONS = [
  "一只股票三个月涨了80%，该不该追？",
  "应该用杠杆放大收益吗？",
  "如何判断一家企业是不是好生意？",
  "什么时候该卖出持有的股票？",
];

interface Props {
  onClassificationChange: (c: SkillClassification | null) => void;
  onExecutionPlanChange: (p: ExecutionPlan | null) => void;
  onSkillComplete: (skill: string) => void;
  onActiveSkillChange: (skill: string | null) => void;
}

function parseSSEMessages(chunk: string): Array<{ event: string; data: unknown }> {
  const messages: Array<{ event: string; data: unknown }> = [];
  const blocks = chunk.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "message";
    let dataStr = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        event = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataStr = line.slice(6);
      }
    }
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        messages.push({ event, data });
      } catch {
        // skip unparseable
      }
    }
  }
  return messages;
}

export default function AnalysisChat({
  onClassificationChange,
  onExecutionPlanChange,
  onSkillComplete,
  onActiveSkillChange,
}: Props) {
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (query: string) => {
      if (isStreaming) return;

      const userMsg: AnalysisMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
        type: "query",
        timestamp: Date.now(),
      };
      setMessages([userMsg]);
      setIsStreaming(true);
      onClassificationChange(null);
      onExecutionPlanChange(null);

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Analysis request failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const prefix = `assistant-${Date.now()}`;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Only process complete SSE messages (ending with \n\n)
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || ""; // keep incomplete part

          for (const part of parts) {
            if (!part.trim()) continue;
            const sseMessages = parseSSEMessages(part + "\n\n");

            for (const { event, data } of sseMessages) {
              const d = data as Record<string, unknown>;

              if (event === "classification") {
                const classification = (d.classification || {
                  primarySkills: d.primarySkills,
                  reasoning: d.reasoning,
                }) as SkillClassification;
                const plan = d.executionPlan as ExecutionPlan;
                onClassificationChange(classification);
                onExecutionPlanChange(plan);

                setMessages((prev) => [
                  ...prev,
                  {
                    id: `${prefix}-class`,
                    role: "assistant",
                    content: "",
                    type: "classification",
                    metadata: { classification, executionPlan: plan },
                    timestamp: Date.now(),
                  },
                ]);
              } else if (event === "skill-start") {
                const skill = d.skill as string;
                onActiveSkillChange(skill);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `${prefix}-skill-${skill}`,
                    role: "assistant",
                    content: "",
                    type: "skill-progress",
                    metadata: {
                      activeSkill: skill,
                      totalSteps: d.totalSteps as number,
                    },
                    timestamp: Date.now(),
                  },
                ]);
              } else if (event === "skill-complete") {
                onSkillComplete(d.skill as string);
              } else if (event === "synthesis") {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `${prefix}-synthesis`,
                    role: "assistant",
                    content: d.content as string,
                    type: "synthesis",
                    timestamp: Date.now(),
                  },
                ]);
              } else if (event === "done") {
                onActiveSkillChange(null);
                setIsStreaming(false);
              } else if (event === "error") {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `${prefix}-error`,
                    role: "assistant",
                    content: `分析出错：${d.message || "未知错误"}`,
                    type: "synthesis",
                    timestamp: Date.now(),
                  },
                ]);
                setIsStreaming(false);
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const sseMessages = parseSSEMessages(buffer);
          for (const { event, data } of sseMessages) {
            const d = data as Record<string, unknown>;
            if (event === "done") {
              onActiveSkillChange(null);
              setIsStreaming(false);
            }
          }
        }

        setIsStreaming(false);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `连接失败：${err instanceof Error ? err.message : "未知错误"}`,
            type: "synthesis",
            timestamp: Date.now(),
          },
        ]);
        setIsStreaming(false);
      }
    },
    [isStreaming, onClassificationChange, onExecutionPlanChange, onSkillComplete, onActiveSkillChange]
  );

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center mb-4">
              <span className="text-gold text-2xl font-bold">B</span>
            </div>
            <h2 className="text-lg font-semibold text-navy mb-2">
              巴菲特投资分析
            </h2>
            <p className="text-sm text-text-secondary mb-6 max-w-sm">
              输入你的投资问题，Agent 将自动匹配巴菲特投资方法论进行分析
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs px-3 py-2 rounded-full border border-border hover:border-gold hover:text-gold transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            分析中...
          </div>
        )}
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
