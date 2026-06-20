import { clearDiagram } from "@/lib/diagram/tools";
import { applyToolResult, getDiagramIR, getDiagramResponse, requestClear } from "@/lib/diagram/store";
import type { DiagramResponse, ToolResult } from "@/lib/diagram/types";
import type { AgentPlan, AgentToolAction } from "./azure-openai";
import { createCopilotRuntimeInfo, executeCopilotToolAction, planWithCopilotRuntime } from "./copilot-runtime";

export type AgentRunResult = DiagramResponse & {
  agent: {
    source: AgentPlan["source"];
    summary: string;
    actionCount: number;
    copilotRuntime: ReturnType<typeof createCopilotRuntimeInfo>;
  };
};

export type AgentExecutionEvent =
  | {
      type: "planned";
      source: AgentPlan["source"];
      summary: string;
      actions: AgentToolAction[];
    }
  | {
      type: "action";
      index: number;
      total: number;
      action: AgentToolAction;
      result: ToolResult;
    }
  | {
      type: "done";
      result: AgentRunResult;
    };

export async function runDiagramAgent(command: string, sessionId?: string): Promise<AgentRunResult> {
  const ir = getDiagramIR(sessionId);
  const plan = await planWithCopilotRuntime(command, ir);
  const response = executePlan(plan, sessionId);

  return buildAgentRunResult(plan, response);
}

export async function runDiagramAgentWithEvents(
  command: string,
  emit: (event: AgentExecutionEvent) => void,
  sessionId?: string,
): Promise<AgentRunResult> {
  const ir = getDiagramIR(sessionId);
  const plan = await planWithCopilotRuntime(command, ir);
  emit({
    type: "planned",
    source: plan.source,
    summary: plan.summary,
    actions: plan.actions,
  });

  const response = executePlan(plan, sessionId, (action, result, index, total) => {
    emit({
      type: "action",
      index,
      total,
      action,
      result,
    });
  });

  const result = buildAgentRunResult(plan, response);
  emit({ type: "done", result });
  return result;
}

function buildAgentRunResult(plan: AgentPlan, response: DiagramResponse): AgentRunResult {
  const actionableCount = plan.actions.filter((action) => action.tool !== "fallback").length;

  return {
    ...response,
    agent: {
      source: plan.source,
      summary: plan.summary,
      actionCount: actionableCount,
      copilotRuntime: createCopilotRuntimeInfo(),
    },
  };
}

function executePlan(
  plan: AgentPlan,
  sessionId?: string,
  onAction?: (action: AgentToolAction, result: ToolResult, index: number, total: number) => void,
): DiagramResponse {
  if (plan.actions.length === 0) {
    return getDiagramResponse("에이전트가 실행할 도구를 선택하지 못했습니다.", sessionId);
  }

  if (plan.actions.some((action) => action.tool === "clear")) {
    return requestClear(sessionId);
  }

  let response = getDiagramResponse(undefined, sessionId);
  const actionable = plan.actions.filter((action) => action.tool !== "fallback");
  let executedIndex = 0;

  for (const action of plan.actions) {
    const result = executeAction(action, sessionId);
    if (action.tool !== "fallback") {
      executedIndex += 1;
      onAction?.(action, result, executedIndex, actionable.length);
    }
    response = applyToolResult(result, sessionId);
  }

  return response;
}

function executeAction(action: AgentToolAction, sessionId?: string): ToolResult {
  return executeCopilotToolAction(action, getDiagramIR(sessionId));
}

export function confirmAgentClear(sessionId?: string): AgentRunResult {
  return {
    ...applyToolResult(clearDiagram(), sessionId),
    agent: {
      source: "local-fallback",
      summary: "전체 다이어그램을 삭제했습니다.",
      actionCount: 1,
      copilotRuntime: createCopilotRuntimeInfo(),
    },
  };
}