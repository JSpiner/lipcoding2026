import { resolveRef } from "./resolver";
import type { DiagramIR, DiagramType, FlowchartDirection, FlowchartIR, SequenceIR, ToolResult } from "./types";

let nodeSequence = 0;
let edgeSequence = 0;
let participantSequence = 0;
let messageSequence = 0;

export function createDiagram(type: DiagramType, title?: string): ToolResult {
  if (type === "sequence") {
    return {
      ir: { type: "sequence", title, participants: [], messages: [] },
      logs: [{ tool: "create_diagram", summary: "시퀀스 다이어그램을 새로 시작했습니다." }],
    };
  }

  return {
    ir: { type: "flowchart", direction: "TD", title, nodes: [], edges: [] },
    logs: [{ tool: "create_diagram", summary: "플로우차트를 새로 시작했습니다." }],
  };
}

export function createOrderFlow(): ToolResult {
  nodeSequence = 4;
  edgeSequence = 3;

  return {
    ir: {
      type: "flowchart",
      direction: "TD",
      title: "온라인 쇼핑몰 주문 처리 흐름",
      nodes: [
        { id: "n1", label: "장바구니", shape: "round" },
        { id: "n2", label: "결제" },
        { id: "n3", label: "주문확정" },
        { id: "n4", label: "배송", shape: "round" },
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
        { id: "e3", from: "n3", to: "n4" },
      ],
    },
    logs: [{ tool: "create_diagram", summary: "주문 처리 플로우차트를 생성했습니다." }],
  };
}

export function createHackathonFlow(): ToolResult {
  nodeSequence = 6;
  edgeSequence = 5;

  return {
    ir: {
      type: "flowchart",
      direction: "TD",
      title: "해커톤 진행 프로세스",
      nodes: [
        { id: "n1", label: "아이디어 선정", shape: "round" },
        { id: "n2", label: "요구사항 정리" },
        { id: "n3", label: "프로토타입 구현" },
        { id: "n4", label: "테스트와 보완" },
        { id: "n5", label: "배포" },
        { id: "n6", label: "데모 발표", shape: "round" },
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
        { id: "e3", from: "n3", to: "n4" },
        { id: "e4", from: "n4", to: "n5" },
        { id: "e5", from: "n5", to: "n6" },
      ],
    },
    logs: [{ tool: "create_diagram", summary: "해커톤 진행 프로세스 플로우차트를 생성했습니다." }],
  };
}

export function addNode(ir: DiagramIR | null, label: string, shape: "rect" | "round" | "diamond" = "rect"): ToolResult {
  if (ir?.type === "sequence") {
    return addParticipant(ir, label);
  }

  const flowchart = ensureFlowchart(ir);
  const id = nextNodeId(flowchart);

  return {
    ir: { ...flowchart, nodes: [...flowchart.nodes, { id, label, shape }] },
    logs: [{ tool: "add_node", summary: `"${label}" 노드를 추가했습니다.` }],
  };
}

export function connect(ir: DiagramIR | null, fromRef: string, toRef: string, label?: string): ToolResult {
  if (ir?.type === "sequence") {
    return addSequenceMessage(ir, fromRef, toRef, label ?? "요청");
  }

  const flowchart = ensureFlowchart(ir);
  const from = resolveRef(fromRef, flowchart) ?? fromRef;
  const to = resolveRef(toRef, flowchart) ?? toRef;

  if (!flowchart.nodes.some((node) => node.id === from) || !flowchart.nodes.some((node) => node.id === to)) {
    return {
      ir: flowchart,
      logs: [{ tool: "connect", summary: "연결할 노드를 찾지 못해 변경하지 않았습니다." }],
    };
  }

  return {
    ir: { ...flowchart, edges: [...flowchart.edges, { id: nextEdgeId(flowchart), from, to, label }] },
    logs: [{ tool: "connect", summary: label ? `"${label}" 연결을 추가했습니다.` : "노드 연결을 추가했습니다." }],
  };
}

export function insertNodeBetween(ir: DiagramIR | null, afterRef: string, beforeRef: string, label: string, shape: "rect" | "round" | "diamond" = "rect"): ToolResult {
  const flowchart = ensureFlowchart(ir);
  const after = resolveRef(afterRef, flowchart);
  const before = resolveRef(beforeRef, flowchart);

  if (!after || !before) {
    return {
      ir: flowchart,
      logs: [{ tool: "insert_node_between", summary: "삽입할 위치를 찾지 못해 변경하지 않았습니다." }],
    };
  }

  if (flowchart.nodes.some((node) => node.label === label)) {
    return {
      ir: flowchart,
      logs: [{ tool: "insert_node_between", summary: `"${label}" 단계가 이미 있어 그대로 두었습니다.` }],
    };
  }

  const nodeId = nextNodeId(flowchart);
  const edgeToInserted = nextEdgeId(flowchart);
  const edgeFromInserted = nextEdgeId({ ...flowchart, edges: [...flowchart.edges, { id: edgeToInserted, from: after, to: nodeId }] });

  return {
    ir: {
      ...flowchart,
      nodes: [...flowchart.nodes, { id: nodeId, label, shape }],
      edges: [
        ...flowchart.edges.filter((edge) => !(edge.from === after && edge.to === before)),
        { id: edgeToInserted, from: after, to: nodeId },
        { id: edgeFromInserted, from: nodeId, to: before },
      ],
    },
    logs: [{ tool: "insert_node_between", summary: `"${afterRef}" 다음에 "${label}" 단계를 추가했습니다.` }],
  };
}

export function relabel(ir: DiagramIR | null, ref: string, newLabel: string): ToolResult {
  if (ir?.type === "sequence") {
    const id = resolveRef(ref, ir);

    if (!id) {
      return {
        ir,
        logs: [{ tool: "relabel", summary: `"${ref}"에 해당하는 참여자를 찾지 못했습니다.` }],
      };
    }

    return {
      ir: { ...ir, participants: ir.participants.map((participant) => (participant.id === id ? { ...participant, label: newLabel } : participant)) },
      logs: [{ tool: "relabel", summary: `"${ref}" 이름을 "${newLabel}"로 바꿨습니다.` }],
    };
  }

  const flowchart = ensureFlowchart(ir);
  const id = resolveRef(ref, flowchart);

  if (!id) {
    return {
      ir: flowchart,
      logs: [{ tool: "relabel", summary: `"${ref}"에 해당하는 노드를 찾지 못했습니다.` }],
    };
  }

  return {
    ir: { ...flowchart, nodes: flowchart.nodes.map((node) => (node.id === id ? { ...node, label: newLabel } : node)) },
    logs: [{ tool: "relabel", summary: `"${ref}" 이름을 "${newLabel}"로 바꿨습니다.` }],
  };
}

export function removeElement(ir: DiagramIR | null, ref: string): ToolResult {
  if (ir?.type === "sequence") {
    const id = resolveRef(ref, ir);

    if (!id) {
      return {
        ir,
        logs: [{ tool: "remove", summary: `"${ref}"에 해당하는 참여자를 찾지 못했습니다.` }],
      };
    }

    return {
      ir: {
        ...ir,
        participants: ir.participants.filter((participant) => participant.id !== id),
        messages: ir.messages.filter((message) => message.from !== id && message.to !== id),
      },
      logs: [{ tool: "remove", summary: `"${ref}" 참여자와 메시지를 삭제했습니다.` }],
    };
  }

  const flowchart = ensureFlowchart(ir);
  const id = resolveRef(ref, flowchart);

  if (!id) {
    return {
      ir: flowchart,
      logs: [{ tool: "remove", summary: `"${ref}"에 해당하는 노드를 찾지 못했습니다.` }],
    };
  }

  return {
    ir: {
      ...flowchart,
      nodes: flowchart.nodes.filter((node) => node.id !== id),
      edges: flowchart.edges.filter((edge) => edge.from !== id && edge.to !== id),
    },
    logs: [{ tool: "remove", summary: `"${ref}" 노드와 연결을 삭제했습니다.` }],
  };
}

export function setDirection(ir: DiagramIR | null, direction: FlowchartDirection): ToolResult {
  if (ir?.type === "sequence") {
    return {
      ir,
      logs: [{ tool: "set_direction", summary: "시퀀스 다이어그램에는 방향 설정을 적용하지 않았습니다." }],
    };
  }

  const flowchart = ensureFlowchart(ir);

  return {
    ir: { ...flowchart, direction },
    logs: [{ tool: "set_direction", summary: direction === "LR" ? "다이어그램 방향을 왼쪽에서 오른쪽으로 바꿨습니다." : "다이어그램 방향을 위에서 아래로 바꿨습니다." }],
  };
}

export function addPaymentFailureBranch(ir: DiagramIR | null): ToolResult {
  const flowchart = ensureFlowchart(ir);
  const paymentId = resolveRef("결제", flowchart);

  if (!paymentId) {
    return {
      ir: flowchart,
      logs: [{ tool: "add_node", summary: "결제 노드를 찾지 못해 실패 분기를 추가하지 않았습니다." }],
    };
  }

  if (flowchart.nodes.some((node) => node.label === "결제 실패")) {
    return {
      ir: flowchart,
      logs: [{ tool: "add_node", summary: "결제 실패 분기가 이미 있어 그대로 두었습니다." }],
    };
  }

  const failureNodeId = nextNodeId(flowchart);
  const failureEdgeId = nextEdgeId(flowchart);
  const retryEdgeId = nextEdgeId({ ...flowchart, edges: [...flowchart.edges, { id: failureEdgeId, from: paymentId, to: failureNodeId }] });

  return {
    ir: {
      ...flowchart,
      nodes: [...flowchart.nodes, { id: failureNodeId, label: "결제 실패", shape: "diamond" }],
      edges: [
        ...flowchart.edges,
        { id: failureEdgeId, from: paymentId, to: failureNodeId, label: "실패" },
        { id: retryEdgeId, from: failureNodeId, to: paymentId, label: "재시도" },
      ],
    },
    logs: [
      { tool: "add_node", summary: "결제 실패 분기 노드를 추가했습니다." },
      { tool: "connect", summary: "실패 시 결제 단계로 돌아가는 재시도 루프를 연결했습니다." },
    ],
  };
}

export function addParticipant(ir: DiagramIR | null, label: string): ToolResult {
  const sequence = ensureSequence(ir);
  const id = nextParticipantId(sequence);

  return {
    ir: { ...sequence, participants: [...sequence.participants, { id, label }] },
    logs: [{ tool: "add_participant", summary: `"${label}" 참여자를 추가했습니다.` }],
  };
}

export function addSequenceMessage(ir: DiagramIR | null, fromRef: string, toRef: string, label: string, kind: "sync" | "async" | "return" = "sync"): ToolResult {
  const sequence = ensureSequence(ir);
  const from = resolveRef(fromRef, sequence) ?? fromRef;
  const to = resolveRef(toRef, sequence) ?? toRef;

  if (!sequence.participants.some((participant) => participant.id === from) || !sequence.participants.some((participant) => participant.id === to)) {
    return {
      ir: sequence,
      logs: [{ tool: "connect", summary: "메시지를 연결할 참여자를 찾지 못해 변경하지 않았습니다." }],
    };
  }

  return {
    ir: { ...sequence, messages: [...sequence.messages, { id: nextMessageId(sequence), from, to, label, kind }] },
    logs: [{ tool: "connect", summary: `"${label}" 메시지를 추가했습니다.` }],
  };
}

export function switchType(ir: DiagramIR | null, target: DiagramType): ToolResult {
  if (!ir) {
    return createDiagram(target);
  }

  if (ir.type === target) {
    return {
      ir,
      logs: [{ tool: "switch_type", summary: `이미 ${target === "sequence" ? "시퀀스 다이어그램" : "플로우차트"}입니다.` }],
    };
  }

  if (target === "sequence") {
    const flowchart = ensureFlowchart(ir);
    const participants = flowchart.nodes.map((node, index) => ({ id: `p${index + 1}`, label: node.label }));
    const idMap = new Map(flowchart.nodes.map((node, index) => [node.id, `p${index + 1}`]));
    const messages = flowchart.edges.flatMap((edge, index) => {
      const from = idMap.get(edge.from);
      const to = idMap.get(edge.to);
      return from && to ? [{ id: `m${index + 1}`, from, to, label: edge.label ?? "다음 단계", kind: "sync" as const }] : [];
    });
    participantSequence = Math.max(participantSequence, participants.length);
    messageSequence = Math.max(messageSequence, messages.length);

    return {
      ir: { type: "sequence", title: flowchart.title, participants, messages },
      logs: [{ tool: "switch_type", summary: "현재 플로우차트를 시퀀스 다이어그램으로 전환했습니다." }],
    };
  }

  const sequence = ensureSequence(ir);
  const nodes = sequence.participants.map((participant, index) => ({ id: `n${index + 1}`, label: participant.label, shape: "rect" as const }));
  const idMap = new Map(sequence.participants.map((participant, index) => [participant.id, `n${index + 1}`]));
  const edges = sequence.messages.flatMap((message, index) => {
    const from = idMap.get(message.from);
    const to = idMap.get(message.to);
    return from && to ? [{ id: `e${index + 1}`, from, to, label: message.label }] : [];
  });
  nodeSequence = Math.max(nodeSequence, nodes.length);
  edgeSequence = Math.max(edgeSequence, edges.length);

  return {
    ir: { type: "flowchart", direction: "TD", title: sequence.title, nodes, edges },
    logs: [{ tool: "switch_type", summary: "현재 시퀀스 다이어그램을 플로우차트로 전환했습니다." }],
  };
}

export function exportDiagram(ir: DiagramIR | null, format: "mermaid" | "png" = "mermaid"): ToolResult {
  return {
    ir,
    logs: [
      {
        tool: "export",
        summary: format === "png" ? "PNG 내보내기는 다음 단계에서 다운로드 기능으로 연결됩니다." : "Mermaid 소스를 복사할 수 있도록 준비했습니다.",
      },
    ],
  };
}

export function clearDiagram(): ToolResult {
  return {
    ir: null,
    logs: [{ tool: "clear", summary: "전체 다이어그램을 삭제했습니다." }],
  };
}

function ensureFlowchart(ir: DiagramIR | null): FlowchartIR {
  if (ir?.type === "flowchart") {
    return ir;
  }

  return { type: "flowchart", direction: "TD", nodes: [], edges: [] };
}

function ensureSequence(ir: DiagramIR | null): SequenceIR {
  if (ir?.type === "sequence") {
    return ir;
  }

  return { type: "sequence", participants: [], messages: [] };
}

function nextNodeId(ir: FlowchartIR): string {
  const maxExisting = maxNumericSuffix(ir.nodes.map((node) => node.id));
  nodeSequence = Math.max(nodeSequence, maxExisting) + 1;
  return `n${nodeSequence}`;
}

function nextEdgeId(ir: FlowchartIR): string {
  const maxExisting = maxNumericSuffix(ir.edges.map((edge) => edge.id));
  edgeSequence = Math.max(edgeSequence, maxExisting) + 1;
  return `e${edgeSequence}`;
}

function nextParticipantId(ir: SequenceIR): string {
  const maxExisting = maxNumericSuffix(ir.participants.map((participant) => participant.id));
  participantSequence = Math.max(participantSequence, maxExisting) + 1;
  return `p${participantSequence}`;
}

function nextMessageId(ir: SequenceIR): string {
  const maxExisting = maxNumericSuffix(ir.messages.map((message) => message.id));
  messageSequence = Math.max(messageSequence, maxExisting) + 1;
  return `m${messageSequence}`;
}

function maxNumericSuffix(ids: string[]): number {
  return ids.reduce((max, id) => {
    const value = Number(id.replace(/^\D+/, ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
}