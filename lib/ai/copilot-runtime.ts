import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { BuiltInAgent, defineTool } from "@copilotkit/runtime/v2";
import { createOpenAI } from "@ai-sdk/openai";
import { EventType } from "@ag-ui/core";
import { z } from "zod";
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
import type { DiagramIR, ToolResult } from "@/lib/diagram/types";
import { AGENT_SYSTEM_PROMPT, buildAgentUserPrompt } from "./prompts";
import { AzureOpenAIError, hasAzureOpenAIConfig, normalizePlan, planWithAzureOpenAI, type AgentPlan, type AgentToolAction } from "./azure-openai";

export const copilotToolNames = [
  "create_order_flow",
  "create_hackathon_flow",
  "create_flow_from_steps",
  "add_payment_failure_branch",
  "create_diagram",
  "add_node",
  "insert_node_between",
  "add_feedback_cycle",
  "add_participant",
  "connect",
  "relabel",
  "remove",
  "set_direction",
  "switch_type",
  "export",
  "clear",
] as const;

const runtime = new CopilotRuntime({ agents: {} });

export function createCopilotRuntimeInfo() {
  return {
    package: "@copilotkit/runtime",
    runtime: CopilotRuntime.name,
    agent: BuiltInAgent.name,
    toolRegistration: "defineTool",
    defaultPlanner: "Copilot SDK BuiltInAgent with Azure OpenAI model adapter",
    registeredTools: copilotToolNames,
    role: "Copilot Runtime is the central orchestration loop: BuiltInAgent plans with registered defineTool actions, runtime guards validate the plan, and executeCopilotToolAction applies the approved tool calls.",
  };
}

export function getCopilotRuntime() {
  return runtime;
}

export function executeCopilotToolAction(action: AgentToolAction, ir: DiagramIR | null): ToolResult {
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
      return fallbackResult(ir, "에이전트가 안전하게 실행할 수 있는 도구를 찾지 못했습니다.");
  }
}

export async function planWithCopilotRuntime(command: string, ir: DiagramIR | null): Promise<AgentPlan> {
  const sdkPlan = await planWithCopilotSdkAgent(command, ir).catch(() => null);
  if (sdkPlan) {
    return applyRuntimeGuards(command, ir, sdkPlan);
  }

  let plan: AgentPlan;

  if (!hasAzureOpenAIConfig()) {
    plan = planWithCopilotFallback(command, ir);
  } else {
    try {
      plan = await planWithAzureOpenAI(command, ir);
    } catch (error) {
      if (error instanceof AzureOpenAIError && error.status === 429) {
        return normalizePlan(
          {
            summary: "Azure OpenAI 요청 한도에 걸려 Copilot 런타임 로컬 안전 플래너로 실행합니다.",
            actions: planWithCopilotFallback(command, ir).actions,
          },
          "local-fallback",
        );
      }

      throw error;
    }
  }

  return applyRuntimeGuards(command, ir, plan);
}

function applyRuntimeGuards(command: string, ir: DiagramIR | null, plan: AgentPlan): AgentPlan {
  const hasUsableAzurePlan =
    (plan.source === "azure-openai" || plan.source === "copilot-sdk") &&
    plan.actions.length > 0 &&
    !plan.actions.some((action) => action.tool === "fallback");

  // When Azure provides a usable plan, the Copilot runtime keeps it as primary.
  if (hasUsableAzurePlan) {
    return plan;
  }

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

async function planWithCopilotSdkAgent(command: string, ir: DiagramIR | null): Promise<AgentPlan | null> {
  if (!hasAzureOpenAIConfig()) {
    return null;
  }

  if (process.env.MALGRIM_DISABLE_COPILOT_SDK === "true") {
    return null;
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

  if (!endpoint || !deployment || !apiKey || !apiVersion) {
    return null;
  }

  const actionQueue: AgentToolAction[] = [];
  const tools = createCopilotSdkTools(actionQueue);
  const model = createAzureLanguageModel(endpoint, deployment, apiKey, apiVersion);
  const agent = new BuiltInAgent({
    model,
    maxSteps: 6,
    temperature: 0,
    tools,
    prompt: `${AGENT_SYSTEM_PROMPT}\n\nYou must call tools to represent the plan. Do not return plain Mermaid. Do not output prose-only responses.`,
  });

  const messageId = crypto.randomUUID();
  const threadId = `malgrim-${crypto.randomUUID()}`;
  const runId = crypto.randomUUID();
  const summaryChunks: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const stream = agent.run({
      threadId,
      runId,
      state: {},
      tools: [],
      messages: [
        {
          id: messageId,
          role: "user",
          content: buildAgentUserPrompt(command, ir),
        },
      ],
      context: [
        {
          value: command,
          description: "user command",
        },
      ],
    });

    const subscription = stream.subscribe({
      next(event) {
        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          const content = (event as { content?: string }).content;
          if (content) {
            summaryChunks.push(content);
          }
          return;
        }

        if (event.type === EventType.RUN_ERROR) {
          const message = (event as { message?: string }).message ?? "Copilot SDK 에이전트 실행 실패";
          subscription.unsubscribe();
          reject(new Error(message));
          return;
        }

        if (event.type === EventType.RUN_FINISHED) {
          subscription.unsubscribe();
          resolve();
        }
      },
      error(error) {
        reject(error);
      },
      complete() {
        resolve();
      },
    });
  });

  if (actionQueue.length === 0) {
    return null;
  }

  const summary = summaryChunks.join(" ").trim() || "Copilot SDK 에이전트가 도구 실행 계획을 생성했습니다.";
  return normalizePlan(
    {
      summary,
      actions: actionQueue,
    },
    "copilot-sdk",
  );
}

function createAzureLanguageModel(endpoint: string, deployment: string, apiKey: string, apiVersion: string) {
  const provider = createOpenAI({
    baseURL: `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}`,
    apiKey,
    headers: {
      "api-key": apiKey,
    },
    fetch: async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      if (!url.searchParams.has("api-version")) {
        url.searchParams.set("api-version", apiVersion);
      }
      return fetch(url, init);
    },
  });

  return provider.chat("gpt-4o");
}

function createCopilotSdkTools(actionQueue: AgentToolAction[]) {
  return [
    defineTool({
      name: "create_order_flow",
      description: "온라인 쇼핑몰 주문 플로우 템플릿 생성",
      parameters: z.object({}),
      execute: async () => {
        actionQueue.push({ tool: "create_order_flow" });
        return { ok: true };
      },
    }),
    defineTool({
      name: "create_hackathon_flow",
      description: "해커톤 플로우 템플릿 생성",
      parameters: z.object({}),
      execute: async () => {
        actionQueue.push({ tool: "create_hackathon_flow" });
        return { ok: true };
      },
    }),
    defineTool({
      name: "create_flow_from_steps",
      description: "제목과 단계 목록으로 플로우차트 생성",
      parameters: z.object({
        title: z.string(),
        labels: z.array(z.string()).min(2),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "create_flow_from_steps", title: args.title, labels: args.labels });
        return { ok: true };
      },
    }),
    defineTool({
      name: "create_diagram",
      description: "빈 다이어그램 생성",
      parameters: z.object({
        type: z.enum(["flowchart", "sequence"]).default("flowchart"),
        title: z.string().optional(),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "create_diagram", type: args.type, title: args.title });
        return { ok: true };
      },
    }),
    defineTool({
      name: "add_node",
      description: "플로우차트 노드 추가",
      parameters: z.object({
        label: z.string(),
        shape: z.enum(["rect", "round", "diamond"]).default("rect"),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "add_node", label: args.label, shape: args.shape });
        return { ok: true };
      },
    }),
    defineTool({
      name: "insert_node_between",
      description: "두 단계 사이에 노드 삽입",
      parameters: z.object({
        after: z.string(),
        before: z.string(),
        label: z.string(),
        shape: z.enum(["rect", "round", "diamond"]).default("rect"),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "insert_node_between", after: args.after, before: args.before, label: args.label, shape: args.shape });
        return { ok: true };
      },
    }),
    defineTool({
      name: "add_feedback_cycle",
      description: "기준 단계에 측정/개선 루프 추가",
      parameters: z.object({
        ref: z.string(),
        labels: z.array(z.string()).default(["점수 측정", "개선"]),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "add_feedback_cycle", ref: args.ref, labels: args.labels });
        return { ok: true };
      },
    }),
    defineTool({
      name: "add_participant",
      description: "시퀀스 다이어그램 참여자 추가",
      parameters: z.object({
        label: z.string(),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "add_participant", label: args.label });
        return { ok: true };
      },
    }),
    defineTool({
      name: "connect",
      description: "노드/참여자 연결",
      parameters: z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "connect", from: args.from, to: args.to, label: args.label });
        return { ok: true };
      },
    }),
    defineTool({
      name: "relabel",
      description: "라벨 변경",
      parameters: z.object({
        ref: z.string(),
        newLabel: z.string(),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "relabel", ref: args.ref, newLabel: args.newLabel });
        return { ok: true };
      },
    }),
    defineTool({
      name: "remove",
      description: "요소 제거",
      parameters: z.object({
        ref: z.string(),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "remove", ref: args.ref });
        return { ok: true };
      },
    }),
    defineTool({
      name: "set_direction",
      description: "플로우차트 방향 변경",
      parameters: z.object({
        direction: z.enum(["TD", "LR"]).default("TD"),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "set_direction", direction: args.direction });
        return { ok: true };
      },
    }),
    defineTool({
      name: "switch_type",
      description: "다이어그램 타입 전환",
      parameters: z.object({
        target: z.enum(["flowchart", "sequence"]).default("sequence"),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "switch_type", target: args.target });
        return { ok: true };
      },
    }),
    defineTool({
      name: "export",
      description: "내보내기",
      parameters: z.object({
        format: z.enum(["mermaid", "png"]).default("mermaid"),
      }),
      execute: async (args) => {
        actionQueue.push({ tool: "export", format: args.format });
        return { ok: true };
      },
    }),
    defineTool({
      name: "add_payment_failure_branch",
      description: "결제 실패 분기와 재시도 루프 추가",
      parameters: z.object({}),
      execute: async () => {
        actionQueue.push({ tool: "add_payment_failure_branch" });
        return { ok: true };
      },
    }),
    defineTool({
      name: "clear",
      description: "전체 삭제 확인 요청",
      parameters: z.object({}),
      execute: async () => {
        actionQueue.push({ tool: "clear" });
        return { ok: true };
      },
    }),
  ];
}

function planWithCopilotFallback(command: string, ir: DiagramIR | null): AgentPlan {
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

  const insertionPlan = inferFlowchartInsertionPlan(command, "", ir, "local-fallback");
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

function findMentionedFlowchartLabel(ir: DiagramIR, normalizedText: string): string | null {
  if (ir.type !== "flowchart") {
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

function inferFlowchartInsertionPlan(command: string, summary: string, ir: DiagramIR | null, source: AgentPlan["source"]): AgentPlan | null {
  if (!ir || ir.type !== "flowchart") {
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

function findSinglePredecessor(ir: Extract<DiagramIR, { type: "flowchart" }>, nodeId: string) {
  const incoming = ir.edges.filter((edge) => edge.to === nodeId);
  if (incoming.length !== 1) {
    return null;
  }

  return ir.nodes.find((node) => node.id === incoming[0].from) ?? null;
}

function findSingleSuccessor(ir: Extract<DiagramIR, { type: "flowchart" }>, nodeId: string) {
  const outgoing = ir.edges.filter((edge) => edge.from === nodeId);
  if (outgoing.length !== 1) {
    return null;
  }

  return ir.nodes.find((node) => node.id === outgoing[0].to) ?? null;
}

function extractInsertedLabel(textAfterMarker: string, ir: Extract<DiagramIR, { type: "flowchart" }>): string | null {
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

function fallbackResult(ir: DiagramIR | null, summary: string): ToolResult {
  return {
    ir,
    logs: [{ tool: "fallback", summary }],
  };
}