import type { DiagramIR, FlowchartEdge, FlowchartIR, FlowchartNode, SequenceIR, SequenceMessage } from "./types";

export function serializeDiagram(ir: DiagramIR | null): string {
  if (!ir) {
    return "";
  }

  return ir.type === "flowchart" ? serializeFlowchart(ir) : serializeSequence(ir);
}

function serializeFlowchart(ir: FlowchartIR): string {
  const lines = [`flowchart ${ir.direction}`];

  for (const node of ir.nodes) {
    lines.push(`  ${node.id}${serializeNodeLabel(node)}`);
  }

  for (const edge of ir.edges) {
    lines.push(`  ${serializeEdge(edge)}`);
  }

  return lines.join("\n");
}

function serializeNodeLabel(node: FlowchartNode): string {
  const label = escapeMermaidText(node.label);

  if (node.shape === "round") {
    return `(["${label}"])`;
  }

  if (node.shape === "diamond") {
    return `{"${label}"}`;
  }

  return `["${label}"]`;
}

function serializeEdge(edge: FlowchartEdge): string {
  if (!edge.label) {
    return `${edge.from} --> ${edge.to}`;
  }

  return `${edge.from} -->|"${escapeMermaidText(edge.label)}"| ${edge.to}`;
}

function serializeSequence(ir: SequenceIR): string {
  const lines = ["sequenceDiagram"];

  for (const participant of ir.participants) {
    lines.push(`  participant ${participant.id} as ${escapeMermaidText(participant.label)}`);
  }

  for (const message of ir.messages) {
    lines.push(`  ${serializeMessage(message)}`);
  }

  return lines.join("\n");
}

function serializeMessage(message: SequenceMessage): string {
  const arrow = message.kind === "async" || message.kind === "return" ? "-->>" : "->>";
  return `${message.from}${arrow}${message.to}: ${escapeMermaidText(message.label).replaceAll(":", " -")}`;
}

function escapeMermaidText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "'").replace(/[\r\n]+/g, " ").trim();
}