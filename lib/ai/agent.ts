import {
  addNode,
  addParticipant,
  addPaymentFailureBranch,
  clearDiagram,
  connect,
  createDiagram,
  createHackathonFlow,
  createOrderFlow,
  exportDiagram,
  relabel,
  removeElement,
  setDirection,
  switchType,
} from "@/lib/diagram/tools";
import { applyToolResult, getDiagramIR, getDiagramResponse, requestClear } from "@/lib/diagram/store";
import type { DiagramResponse, ToolResult } from "@/lib/diagram/types";
import { AzureOpenAIError, hasAzureOpenAIConfig, normalizePlan, planWithAzureOpenAI, type AgentPlan, type AgentToolAction } from "./azure-openai";
import { createCopilotRuntimeInfo } from "./copilot-runtime";

export type AgentRunResult = DiagramResponse & {
  agent: {
    source: AgentPlan["source"];
    summary: string;
    copilotRuntime: ReturnType<typeof createCopilotRuntimeInfo>;
  };
};

export async function runDiagramAgent(command: string): Promise<AgentRunResult> {
  const ir = getDiagramIR();
  const plan = applyDeterministicGuards(command, ir, await planCommand(command, ir));
  const response = executePlan(plan);

  return {
    ...response,
    agent: {
      source: plan.source,
      summary: plan.summary,
      copilotRuntime: createCopilotRuntimeInfo(),
    },
  };
}

async function planCommand(command: string, ir: ReturnType<typeof getDiagramIR>): Promise<AgentPlan> {
  if (!hasAzureOpenAIConfig()) {
    return planWithLocalFallback(command);
  }

  try {
    return await planWithAzureOpenAI(command, ir);
  } catch (error) {
    if (error instanceof AzureOpenAIError && error.status === 429) {
      return normalizePlan({ summary: "Azure OpenAI 요청 한도에 걸려 로컬 안전 플래너로 실행합니다.", actions: planWithLocalFallback(command).actions }, "local-fallback");
    }

    throw error;
  }
}

function applyDeterministicGuards(command: string, ir: ReturnType<typeof getDiagramIR>, plan: AgentPlan): AgentPlan {
  const normalized = command.replace(/\s+/g, "").toLowerCase();

  if (hasAny(normalized, ["해커톤", "해코톤", "hackathon"])) {
    return normalizePlan({ summary: "해커톤 진행 프로세스를 플로우차트로 생성합니다.", actions: [{ tool: "create_hackathon_flow" }] }, plan.source);
  }

  if (ir && hasAny(normalized, ["시퀀스", "sequencediagram", "sequence"])) {
    return normalizePlan({ summary: "현재 다이어그램을 시퀀스 다이어그램으로 전환합니다.", actions: [{ tool: "switch_type", target: "sequence" }] }, plan.source);
  }

  if (ir?.type === "sequence" && hasAny(normalized, ["플로우차트", "flowchart", "흐름도"])) {
    return normalizePlan({ summary: "현재 다이어그램을 플로우차트로 전환합니다.", actions: [{ tool: "switch_type", target: "flowchart" }] }, plan.source);
  }

  return plan;
}

function executePlan(plan: AgentPlan): DiagramResponse {
  if (plan.actions.length === 0) {
    return getDiagramResponse("에이전트가 실행할 도구를 선택하지 못했습니다.");
  }

  if (plan.actions.some((action) => action.tool === "clear")) {
    return requestClear();
  }

  let response = getDiagramResponse();

  for (const action of plan.actions) {
    const result = executeAction(action);
    response = applyToolResult(result);
  }

  return response;
}

function executeAction(action: AgentToolAction): ToolResult {
  const ir = getDiagramIR();

  switch (action.tool) {
    case "create_order_flow":
      return createOrderFlow();
    case "create_hackathon_flow":
      return createHackathonFlow();
    case "create_diagram":
      return createDiagram(action.type ?? "flowchart", action.title);
    case "add_payment_failure_branch":
      return addPaymentFailureBranch(ir);
    case "add_node":
      return action.label ? addNode(ir, action.label, action.shape ?? "rect") : fallbackResult(ir, "노드 라벨이 없어 add_node를 실행하지 않았습니다.");
    case "add_participant":
      return action.label ? addParticipant(ir, action.label) : fallbackResult(ir, "참여자 라벨이 없어 add_participant를 실행하지 않았습니다.");
    case "connect":
      return action.from && action.to ? connect(ir, action.from, action.to, action.label) : fallbackResult(ir, "연결할 시작/끝 참조가 없어 connect를 실행하지 않았습니다.");
    case "relabel":
      return action.ref && action.newLabel ? relabel(ir, action.ref, action.newLabel) : fallbackResult(ir, "변경할 참조나 새 이름이 없어 relabel을 실행하지 않았습니다.");
    case "remove":
      return action.ref ? removeElement(ir, action.ref) : fallbackResult(ir, "삭제할 참조가 없어 remove를 실행하지 않았습니다.");
    case "set_direction":
      return setDirection(ir, action.direction ?? "TD");
    case "switch_type":
      return switchType(ir, action.target ?? "sequence");
    case "export":
      return exportDiagram(ir, action.format ?? "mermaid");
    default:
      return {
        ir,
        logs: [{ tool: "fallback", summary: "에이전트가 안전하게 실행할 수 있는 도구를 찾지 못했습니다." }],
      };
  }
}

function fallbackResult(ir: ReturnType<typeof getDiagramIR>, summary: string): ToolResult {
  return {
    ir,
    logs: [{ tool: "fallback", summary }],
  };
}

function planWithLocalFallback(command: string): AgentPlan {
  const normalized = command.replace(/\s+/g, "").toLowerCase();

  if (hasAny(normalized, ["전체지워", "전부지워", "모두지워", "초기화", "삭제해"])) {
    return normalizePlan({ summary: "전체 삭제 확인을 요청합니다.", actions: [{ tool: "clear" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["주문처리", "쇼핑몰", "플로우차트로", "흐름을플로우차트"])) {
    return normalizePlan({ summary: "주문 처리 플로우차트를 생성합니다.", actions: [{ tool: "create_order_flow" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["해커톤", "해코톤", "hackathon"])) {
    return normalizePlan({ summary: "해커톤 진행 프로세스를 플로우차트로 생성합니다.", actions: [{ tool: "create_hackathon_flow" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["결제실패", "실패분기", "재시도"])) {
    return normalizePlan({ summary: "결제 실패 분기와 재시도 루프를 추가합니다.", actions: [{ tool: "add_payment_failure_branch" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["카트확인", "장바구니를카트", "장바구니단계이름"])) {
    return normalizePlan({ summary: "장바구니 단계 이름을 변경합니다.", actions: [{ tool: "relabel", ref: "장바구니", newLabel: "카트 확인" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["왼쪽에서오른쪽", "좌에서우", "가로", "lr"])) {
    return normalizePlan({ summary: "플로우차트 방향을 LR로 변경합니다.", actions: [{ tool: "set_direction", direction: "LR" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["위에서아래", "세로", "td"])) {
    return normalizePlan({ summary: "플로우차트 방향을 TD로 변경합니다.", actions: [{ tool: "set_direction", direction: "TD" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["시퀀스", "sequencediagram", "sequence"])) {
    return normalizePlan({ summary: "현재 다이어그램을 시퀀스 다이어그램으로 전환합니다.", actions: [{ tool: "switch_type", target: "sequence" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["플로우차트", "flowchart", "흐름도"])) {
    return normalizePlan({ summary: "현재 다이어그램을 플로우차트로 전환합니다.", actions: [{ tool: "switch_type", target: "flowchart" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["내보내", "export", "png", "머메이드", "mermaid"])) {
    return normalizePlan({ summary: "현재 다이어그램 내보내기를 준비합니다.", actions: [{ tool: "export", format: normalized.includes("png") ? "png" : "mermaid" }] }, "local-fallback");
  }

  return normalizePlan({ summary: "지원되지 않는 명령입니다.", actions: [{ tool: "fallback" }] }, "local-fallback");
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}

export function confirmAgentClear(): AgentRunResult {
  return {
    ...applyToolResult(clearDiagram()),
    agent: {
      source: "local-fallback",
      summary: "전체 다이어그램을 삭제했습니다.",
      copilotRuntime: createCopilotRuntimeInfo(),
    },
  };
}