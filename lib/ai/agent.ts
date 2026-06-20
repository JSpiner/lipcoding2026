import {
  addFeedbackCycle,
  addNode,
  addParticipant,
  addPaymentFailureBranch,
  clearDiagram,
  connect,
  createDiagram,
  createFlowFromSteps,
  createHackathonFlow,
  createOrderFlow,
  exportDiagram,
  insertNodeBetween,
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
  const combined = `${command} ${plan.summary}`.replace(/\s+/g, "").toLowerCase();

  if (hasAny(normalized, ["해커톤", "해코톤", "hackathon"])) {
    return normalizePlan({ summary: "해커톤 진행 프로세스를 플로우차트로 생성합니다.", actions: [{ tool: "create_hackathon_flow" }] }, plan.source);
  }

  if (ir && hasAny(normalized, ["시퀀스", "sequencediagram", "sequence"])) {
    return normalizePlan({ summary: "현재 다이어그램을 시퀀스 다이어그램으로 전환합니다.", actions: [{ tool: "switch_type", target: "sequence" }] }, plan.source);
  }

  if (ir?.type === "sequence" && hasAny(normalized, ["플로우차트", "flowchart", "흐름도"])) {
    return normalizePlan({ summary: "현재 다이어그램을 플로우차트로 전환합니다.", actions: [{ tool: "switch_type", target: "flowchart" }] }, plan.source);
  }

  if (ir?.type === "flowchart" && hasAny(normalized, ["배포후", "배포다음", "배포뒤"]) && hasAny(normalized, ["점수", "측정", "평가"])) {
    return normalizePlan(
      { summary: "배포 후에 점수를 측정하는 단계를 추가합니다.", actions: [{ tool: "insert_node_between", after: "배포", before: "데모 발표", label: "점수 측정" }] },
      plan.source,
    );
  }

  if (ir?.type === "flowchart" && hasAny(combined, ["사이클", "루프", "반복"]) && hasAny(combined, ["점수", "측정", "평가"]) && hasAny(combined, ["개선", "보완"])) {
    const anchor = findMentionedFlowchartLabel(ir, combined) ?? "테스트와 보완";

    return normalizePlan(
      { summary: `${anchor} 단계에 점수 측정과 개선 피드백 사이클을 추가합니다.`, actions: [{ tool: "add_feedback_cycle", ref: anchor, labels: ["점수 측정", "개선"] }] },
      plan.source,
    );
  }

  const insertionPlan = inferFlowchartInsertionPlan(command, plan.summary, ir, plan.source);
  if (insertionPlan) {
    return insertionPlan;
  }

  const creationPlan = inferFlowchartCreationPlan(command, plan.summary, plan, plan.source);
  if (creationPlan) {
    return creationPlan;
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
    case "create_flow_from_steps":
      return createFlowFromSteps(action.title ?? "플로우차트", action.labels ?? []);
    case "add_payment_failure_branch":
      return addPaymentFailureBranch(ir);
    case "add_node":
      return action.label ? addNode(ir, action.label, action.shape ?? "rect") : fallbackResult(ir, "노드 라벨이 없어 add_node를 실행하지 않았습니다.");
    case "add_feedback_cycle":
      return action.ref ? addFeedbackCycle(ir, action.ref, action.labels) : fallbackResult(ir, "기준 단계가 없어 add_feedback_cycle을 실행하지 않았습니다.");
    case "insert_node_between":
      return action.after && action.before && action.label
        ? insertNodeBetween(ir, action.after, action.before, action.label, action.shape ?? "rect")
        : fallbackResult(ir, "삽입할 위치나 라벨이 없어 insert_node_between을 실행하지 않았습니다.");
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

  const creationPlan = inferFlowchartCreationPlan(command, "", null, "local-fallback");
  if (creationPlan) {
    return creationPlan;
  }

  if (hasAny(normalized, ["결제실패", "실패분기", "재시도"])) {
    return normalizePlan({ summary: "결제 실패 분기와 재시도 루프를 추가합니다.", actions: [{ tool: "add_payment_failure_branch" }] }, "local-fallback");
  }

  if (hasAny(normalized, ["배포후", "배포다음", "배포뒤"]) && hasAny(normalized, ["점수", "측정", "평가"])) {
    return normalizePlan(
      { summary: "배포 후에 점수를 측정하는 단계를 추가합니다.", actions: [{ tool: "insert_node_between", after: "배포", before: "데모 발표", label: "점수 측정" }] },
      "local-fallback",
    );
  }

  if (hasAny(normalized, ["사이클", "루프", "반복"]) && hasAny(normalized, ["점수", "측정", "평가"]) && hasAny(normalized, ["개선", "보완"])) {
    return normalizePlan(
      { summary: "테스트와 보완 단계에 점수 측정과 개선 피드백 사이클을 추가합니다.", actions: [{ tool: "add_feedback_cycle", ref: "테스트와 보완", labels: ["점수 측정", "개선"] }] },
      "local-fallback",
    );
  }

  const insertionPlan = inferFlowchartInsertionPlan(command, "", getDiagramIR(), "local-fallback");
  if (insertionPlan) {
    return insertionPlan;
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

function findMentionedFlowchartLabel(ir: ReturnType<typeof getDiagramIR>, normalizedText: string): string | null {
  if (ir?.type !== "flowchart") {
    return null;
  }

  const nodesBySpecificity = [...ir.nodes].sort((left, right) => right.label.length - left.label.length);
  const match = nodesBySpecificity.find((node) => normalizedText.includes(node.label.replace(/\s+/g, "").toLowerCase()));
  return match?.label ?? null;
}

function inferFlowchartCreationPlan(command: string, summary: string, plan: AgentPlan | null, source: AgentPlan["source"]): AgentPlan | null {
  const text = `${command} ${summary}`.replace(/\s+/g, "").toLowerCase();
  const isCreationRequest = hasAny(text, ["플로우차트", "흐름도", "flowchart"]) && hasAny(text, ["생성", "그려", "만들"]);
  const onlyEmptyCreate = plan?.actions.length === 1 && plan.actions[0].tool === "create_diagram" && (plan.actions[0].type ?? "flowchart") === "flowchart";

  if (!isCreationRequest && !onlyEmptyCreate) {
    return null;
  }

  const template = inferFlowchartTemplate(text);
  if (!template) {
    return null;
  }

  return normalizePlan({ summary: `${template.title} 플로우차트를 생성합니다.`, actions: [{ tool: "create_flow_from_steps", title: template.title, labels: template.labels }] }, source);
}

function inferFlowchartTemplate(normalizedText: string): { title: string; labels: string[] } | null {
  if (hasAny(normalizedText, ["주차장입찰", "주차입찰", "parkinglotbid", "parkingbid"])) {
    return {
      title: "주차장 입찰 로직",
      labels: ["입찰 공고 확인", "입찰 조건 검토", "입찰가 산정", "입찰 제출", "낙찰 여부 확인", "계약 진행"],
    };
  }

  if (hasAny(normalizedText, ["주문처리", "쇼핑몰", "온라인쇼핑몰"])) {
    return {
      title: "온라인 쇼핑몰 주문 처리 흐름",
      labels: ["장바구니", "결제", "주문확정", "배송"],
    };
  }

  return null;
}

function inferFlowchartInsertionPlan(command: string, summary: string, ir: ReturnType<typeof getDiagramIR>, source: AgentPlan["source"]): AgentPlan | null {
  if (ir?.type !== "flowchart") {
    return null;
  }

  const text = `${command} ${summary}`.replace(/\s+/g, "").toLowerCase();
  if (!hasAny(text, ["추가", "넣", "삽입"])) {
    return null;
  }

  const nodesBySpecificity = [...ir.nodes].sort((left, right) => right.label.length - left.label.length);

  for (const node of nodesBySpecificity) {
    const anchor = node.label.replace(/\s+/g, "").toLowerCase();
    const beforeMarker = firstIncluded(text, [`${anchor}전에`, `${anchor}이전에`, `${anchor}앞에`]);
    if (beforeMarker) {
      const label = extractInsertedLabel(text.slice(text.indexOf(beforeMarker) + beforeMarker.length), ir);
      const predecessor = findSinglePredecessor(ir, node.id);

      if (label && predecessor) {
        return normalizePlan(
          { summary: `${node.label} 전에 ${label} 단계를 추가합니다.`, actions: [{ tool: "insert_node_between", after: predecessor.label, before: node.label, label }] },
          source,
        );
      }
    }

    const afterMarker = firstIncluded(text, [`${anchor}후에`, `${anchor}이후에`, `${anchor}다음에`, `${anchor}뒤에`]);
    if (afterMarker) {
      const label = extractInsertedLabel(text.slice(text.indexOf(afterMarker) + afterMarker.length), ir);
      const successor = findSingleSuccessor(ir, node.id);

      if (label && successor) {
        return normalizePlan(
          { summary: `${node.label} 다음에 ${label} 단계를 추가합니다.`, actions: [{ tool: "insert_node_between", after: node.label, before: successor.label, label }] },
          source,
        );
      }
    }

    const fromMarker = firstIncluded(text, [`${anchor}에서`]);
    if (fromMarker) {
      const label = extractInsertedLabel(text.slice(text.indexOf(fromMarker) + fromMarker.length), ir);
      const successor = findSingleSuccessor(ir, node.id);

      if (label && successor) {
        return normalizePlan(
          { summary: `${node.label} 다음에 ${label} 단계를 추가합니다.`, actions: [{ tool: "insert_node_between", after: node.label, before: successor.label, label }] },
          source,
        );
      }
    }
  }

  return null;
}

function firstIncluded(value: string, candidates: string[]): string | null {
  return candidates.find((candidate) => value.includes(candidate)) ?? null;
}

function findSinglePredecessor(ir: Extract<ReturnType<typeof getDiagramIR>, { type: "flowchart" }>, nodeId: string) {
  const incoming = ir.edges.filter((edge) => edge.to === nodeId);
  if (incoming.length !== 1) {
    return null;
  }

  return ir.nodes.find((node) => node.id === incoming[0].from) ?? null;
}

function findSingleSuccessor(ir: Extract<ReturnType<typeof getDiagramIR>, { type: "flowchart" }>, nodeId: string) {
  const outgoing = ir.edges.filter((edge) => edge.from === nodeId);
  if (outgoing.length !== 1) {
    return null;
  }

  return ir.nodes.find((node) => node.id === outgoing[0].to) ?? null;
}

function extractInsertedLabel(textAfterMarker: string, ir: Extract<ReturnType<typeof getDiagramIR>, { type: "flowchart" }>): string | null {
  const raw = textAfterMarker
    .replace(/(단계)?(를|을)?(추가|삽입|넣).*/, "")
    .replace(/^(새로운|새|신규)/, "")
    .replace(/단계$/, "")
    .trim();

  if (!raw || ir.nodes.some((node) => node.label.replace(/\s+/g, "").toLowerCase() === raw)) {
    return null;
  }

  return formatInsertedLabel(raw);
}

function formatInsertedLabel(value: string): string {
  const knownLabels: Record<string, string> = {
    유저인터뷰: "유저 인터뷰",
    사용자인터뷰: "사용자 인터뷰",
    점수측정: "점수 측정",
    요구사항검증: "요구사항 검증",
    시장조사: "시장 조사",
    수량변경: "수량 변경",
    수량을변경하는: "수량 변경",
  };

  return knownLabels[value] ?? value;
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