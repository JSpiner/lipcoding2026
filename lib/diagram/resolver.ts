import type { DiagramIR } from "./types";

export function resolveRef(ref: string, ir: DiagramIR | null): string | null {
  if (!ir) {
    return null;
  }

  const normalizedRef = normalize(ref);
  if (!normalizedRef) {
    return null;
  }

  const candidates = ir.type === "flowchart" ? ir.nodes : ir.participants;

  const exactId = candidates.find((item) => normalize(item.id) === normalizedRef);
  if (exactId) {
    return exactId.id;
  }

  const exactLabel = candidates.find((item) => normalize(item.label) === normalizedRef);
  if (exactLabel) {
    return exactLabel.id;
  }

  const partialLabel = candidates.find((item) => {
    const label = normalize(item.label);
    return label.includes(normalizedRef) || normalizedRef.includes(label);
  });

  return partialLabel?.id ?? null;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}