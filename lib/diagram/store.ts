import { serializeDiagram } from "./serialize";
import { resetDiagramToolSequences } from "./tools";
import type { DiagramIR, DiagramResponse, DiagramState, ToolLogEntry, ToolResult } from "./types";

type SessionBucket = {
  state: DiagramState;
  history: Array<DiagramIR | null>;
};

const sessions = new Map<string, SessionBucket>();

function createInitialState(): DiagramState {
  return {
    ir: null,
    logs: [],
    pendingClear: false,
  };
}

function getBucket(sessionId: string): SessionBucket {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const created: SessionBucket = {
    state: createInitialState(),
    history: [],
  };
  sessions.set(sessionId, created);
  return created;
}

function normalizeSessionId(sessionId?: string): string {
  return sessionId?.trim() || "global";
}

export function getDiagramResponse(message?: string, sessionId?: string): DiagramResponse {
  const bucket = getBucket(normalizeSessionId(sessionId));
  return {
    ...bucket.state,
    message: message ?? bucket.state.message,
    mermaid: serializeDiagram(bucket.state.ir),
  };
}

export function getDiagramIR(sessionId?: string): DiagramIR | null {
  return getBucket(normalizeSessionId(sessionId)).state.ir;
}

export function applyToolResult(result: ToolResult, sessionId?: string): DiagramResponse {
  const key = normalizeSessionId(sessionId);
  const bucket = getBucket(key);
  bucket.history = [bucket.state.ir, ...bucket.history].slice(0, 20);

  bucket.state = {
    ...bucket.state,
    ir: result.ir,
    pendingClear: false,
    message: undefined,
    logs: [...createLogEntries(result.logs), ...bucket.state.logs].slice(0, 20),
  };

  sessions.set(key, bucket);

  return getDiagramResponse(undefined, key);
}

export function requestClear(sessionId?: string): DiagramResponse {
  const key = normalizeSessionId(sessionId);
  const bucket = getBucket(key);
  bucket.state = {
    ...bucket.state,
    pendingClear: true,
    message: "전체 다이어그램을 삭제할까요?",
  };

  sessions.set(key, bucket);

  return getDiagramResponse(undefined, key);
}

export function cancelClear(sessionId?: string): DiagramResponse {
  const key = normalizeSessionId(sessionId);
  const bucket = getBucket(key);
  bucket.state = {
    ...bucket.state,
    pendingClear: false,
    message: undefined,
  };

  sessions.set(key, bucket);

  return getDiagramResponse(undefined, key);
}

export function undoLastChange(sessionId?: string): DiagramResponse {
  const key = normalizeSessionId(sessionId);
  const bucket = getBucket(key);
  const previous = bucket.history.shift();

  if (previous === undefined) {
    bucket.state = {
      ...bucket.state,
      message: "되돌릴 수 있는 이전 상태가 없습니다.",
    };
    sessions.set(key, bucket);
    return getDiagramResponse(undefined, key);
  }

  bucket.state = {
    ...bucket.state,
    ir: previous,
    pendingClear: false,
    message: "마지막 변경을 되돌렸습니다.",
    logs: [
      ...createLogEntries([{ tool: "undo", summary: "마지막 변경을 되돌렸습니다." }]),
      ...bucket.state.logs,
    ].slice(0, 20),
  };

  sessions.set(key, bucket);
  return getDiagramResponse(undefined, key);
}

export function resetDiagramState(sessionId?: string): DiagramResponse {
  const key = normalizeSessionId(sessionId);
  resetDiagramToolSequences();
  sessions.set(key, {
    state: {
      ir: null,
      logs: [],
      pendingClear: false,
      message: undefined,
    },
    history: [],
  });

  return getDiagramResponse(undefined, key);
}

function createLogEntries(logs: ToolResult["logs"]): ToolLogEntry[] {
  return logs.map((log) => ({
    ...log,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));
}