import assert from "node:assert/strict";
import test from "node:test";
import { serializeDiagram } from "../lib/diagram/serialize";
import type { DiagramIR } from "../lib/diagram/types";

test("serializes flowcharts with escaped labels and edge labels", () => {
  const ir: DiagramIR = {
    type: "flowchart",
    direction: "LR",
    nodes: [
      { id: "n1", label: "장바구니\n확인", shape: "round" },
      { id: "n2", label: '결제 "승인"', shape: "diamond" },
    ],
    edges: [{ id: "e1", from: "n1", to: "n2", label: '성공 "yes"' }],
  };

  assert.equal(
    serializeDiagram(ir),
    ["flowchart LR", "  n1([\"장바구니 확인\"])", "  n2{\"결제 '승인'\"}", "  n1 -->|\"성공 'yes'\"| n2"].join("\n"),
  );
});

test("serializes sequence diagrams and keeps colon-safe message labels", () => {
  const ir: DiagramIR = {
    type: "sequence",
    participants: [
      { id: "p1", label: "사용자" },
      { id: "p2", label: "결제 API" },
    ],
    messages: [{ id: "m1", from: "p1", to: "p2", label: "승인: 요청", kind: "sync" }],
  };

  assert.equal(serializeDiagram(ir), ["sequenceDiagram", "  participant p1 as 사용자", "  participant p2 as 결제 API", "  p1->>p2: 승인 - 요청"].join("\n"));
});