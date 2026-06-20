import { serializeDiagram } from "./serialize";
import type { DiagramIR, DiagramResponse, DiagramState, ToolLogEntry, ToolResult } from "./types";

let state: DiagramState = {
  ir: null,
  logs: [],
  pendingClear: false,
};

export function getDiagramResponse(message?: string): DiagramResponse {
  return {
    ...state,
    message: message ?? state.message,
    mermaid: serializeDiagram(state.ir),
  };
}

export function getDiagramIR(): DiagramIR | null {
  return state.ir;
}

export function applyToolResult(result: ToolResult): DiagramResponse {
  state = {
    ...state,
    ir: result.ir,
    pendingClear: false,
    message: undefined,
    logs: [...createLogEntries(result.logs), ...state.logs].slice(0, 20),
  };

  return getDiagramResponse();
}

export function requestClear(): DiagramResponse {
  state = {
    ...state,
    pendingClear: true,
    message: "전체 다이어그램을 삭제할까요?",
  };

  return getDiagramResponse();
}

export function cancelClear(): DiagramResponse {
  state = {
    ...state,
    pendingClear: false,
    message: undefined,
  };

  return getDiagramResponse();
}

function createLogEntries(logs: ToolResult["logs"]): ToolLogEntry[] {
  return logs.map((log) => ({
    ...log,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));
}