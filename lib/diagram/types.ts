export type DiagramType = "flowchart" | "sequence";

export type FlowchartDirection = "TD" | "LR";

export type FlowchartNode = {
  id: string;
  label: string;
  shape?: "rect" | "round" | "diamond";
};

export type FlowchartEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type FlowchartIR = {
  type: "flowchart";
  direction: FlowchartDirection;
  title?: string;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
};

export type SequenceParticipant = {
  id: string;
  label: string;
};

export type SequenceMessage = {
  id: string;
  from: string;
  to: string;
  label: string;
  kind?: "sync" | "async" | "return";
};

export type SequenceIR = {
  type: "sequence";
  title?: string;
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
};

export type DiagramIR = FlowchartIR | SequenceIR;

export type ToolLogEntry = {
  id: string;
  tool: string;
  summary: string;
  createdAt: string;
};

export type ToolResult = {
  ir: DiagramIR | null;
  logs: Omit<ToolLogEntry, "id" | "createdAt">[];
};

export type DiagramState = {
  ir: DiagramIR | null;
  logs: ToolLogEntry[];
  pendingClear: boolean;
  message?: string;
};

export type DiagramResponse = DiagramState & {
  mermaid: string;
};