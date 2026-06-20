import { CopilotRuntime } from "@copilotkit/runtime/v2";

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
    registeredTools: copilotToolNames,
    role: "Stage 2 runtime boundary is initialized with CopilotKit v2; /api/agent executes the same registered tool contract after Azure OpenAI action planning.",
  };
}

export function getCopilotRuntime() {
  return runtime;
}