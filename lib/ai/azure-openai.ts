import { AGENT_SYSTEM_PROMPT, buildAgentUserPrompt } from "./prompts";
import type { DiagramIR } from "@/lib/diagram/types";

export type AgentToolAction = {
  tool:
    | "create_order_flow"
    | "create_hackathon_flow"
    | "create_diagram"
    | "add_node"
    | "connect"
    | "relabel"
    | "remove"
    | "set_direction"
    | "add_participant"
    | "switch_type"
    | "export"
    | "add_payment_failure_branch"
    | "clear"
    | "fallback";
  type?: "flowchart" | "sequence";
  title?: string;
  label?: string;
  shape?: "rect" | "round" | "diamond";
  from?: string;
  to?: string;
  ref?: string;
  newLabel?: string;
  direction?: "TD" | "LR";
  target?: "flowchart" | "sequence";
  format?: "mermaid" | "png";
};

export type AgentPlan = {
  summary: string;
  actions: AgentToolAction[];
  source: "azure-openai" | "local-fallback";
};

type AzureChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class AzureOpenAIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail: string,
  ) {
    super(message);
    this.name = "AzureOpenAIError";
  }
}

export function hasAzureOpenAIConfig(): boolean {
  if (process.env.MALGRIM_DISABLE_AZURE_OPENAI === "true") {
    return false;
  }

  return Boolean(
    process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT &&
      process.env.AZURE_OPENAI_API_VERSION,
  );
}

export async function planWithAzureOpenAI(command: string, ir: DiagramIR | null): Promise<AgentPlan> {
  const endpoint = requiredEnv("AZURE_OPENAI_ENDPOINT").replace(/\/$/, "");
  const deployment = requiredEnv("AZURE_OPENAI_DEPLOYMENT");
  const apiVersion = requiredEnv("AZURE_OPENAI_API_VERSION");
  const apiKey = requiredEnv("AZURE_OPENAI_API_KEY");
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: AGENT_SYSTEM_PROMPT },
        { role: "user", content: buildAgentUserPrompt(command, ir) },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AzureOpenAIError(`Azure OpenAI request failed: ${response.status} ${detail}`, response.status, detail);
  }

  const payload = (await response.json()) as AzureChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Azure OpenAI returned an empty response.");
  }

  return normalizePlan(JSON.parse(content), "azure-openai");
}

export function normalizePlan(value: unknown, source: AgentPlan["source"]): AgentPlan {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const actions = Array.isArray(record.actions) ? record.actions : [];

  return {
    summary: typeof record.summary === "string" ? record.summary : "명령을 도구 실행 계획으로 변환했습니다.",
    actions: actions.map(normalizeAction).filter((action): action is AgentToolAction => action !== null),
    source,
  };
}

function normalizeAction(value: unknown): AgentToolAction | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const action = value as Record<string, unknown>;
  if (typeof action.tool !== "string") {
    return null;
  }

  switch (action.tool) {
    case "create_order_flow":
    case "create_hackathon_flow":
    case "add_payment_failure_branch":
    case "clear":
    case "fallback":
      return { tool: action.tool };
    case "create_diagram":
      return {
        tool: "create_diagram",
        type: isDiagramType(action.type) ? action.type : "flowchart",
        title: asOptionalString(action.title),
      };
    case "add_node":
      if (!asOptionalString(action.label)) {
        return null;
      }

      return {
        tool: "add_node",
        label: asOptionalString(action.label),
        shape: isShape(action.shape) ? action.shape : "rect",
      };
    case "add_participant":
      if (!asOptionalString(action.label)) {
        return null;
      }

      return {
        tool: "add_participant",
        label: asOptionalString(action.label),
      };
    case "connect":
      if (!asOptionalString(action.from) || !asOptionalString(action.to)) {
        return null;
      }

      return {
        tool: "connect",
        from: asOptionalString(action.from),
        to: asOptionalString(action.to),
        label: asOptionalString(action.label),
      };
    case "relabel":
      if (!asOptionalString(action.ref) || !asOptionalString(action.newLabel)) {
        return null;
      }

      return {
        tool: "relabel",
        ref: asOptionalString(action.ref),
        newLabel: asOptionalString(action.newLabel),
      };
    case "remove":
      if (!asOptionalString(action.ref)) {
        return null;
      }

      return {
        tool: "remove",
        ref: asOptionalString(action.ref),
      };
    case "set_direction":
      return {
        tool: "set_direction",
        direction: action.direction === "LR" ? "LR" : "TD",
      };
    case "switch_type":
      return {
        tool: "switch_type",
        target: isDiagramType(action.target) ? action.target : isDiagramType(action.type) ? action.type : "sequence",
      };
    case "export":
      return {
        tool: "export",
        format: action.format === "png" ? "png" : "mermaid",
      };
    default:
      return null;
  }
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isDiagramType(value: unknown): value is "flowchart" | "sequence" {
  return value === "flowchart" || value === "sequence";
}

function isShape(value: unknown): value is "rect" | "round" | "diamond" {
  return value === "rect" || value === "round" || value === "diamond";
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}