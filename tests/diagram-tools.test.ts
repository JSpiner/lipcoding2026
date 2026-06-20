import assert from "node:assert/strict";
import test from "node:test";
import { resolveRef } from "../lib/diagram/resolver";
import { addFeedbackCycle, addNode, connect, createHackathonFlow, createOrderFlow, insertNodeBetween, relabel, setDirection, switchType } from "../lib/diagram/tools";
import type { DiagramIR } from "../lib/diagram/types";

test("resolveRef ignores empty references", () => {
  const result = createOrderFlow();

  assert.equal(resolveRef("", result.ir), null);
  assert.equal(resolveRef("   ", result.ir), null);
});

test("creates the deterministic hackathon flow", () => {
  const result = createHackathonFlow();

  assert.equal(result.ir?.type, "flowchart");
  assert.deepEqual(
    result.ir?.type === "flowchart" ? result.ir.nodes.map((node) => node.label) : [],
    ["아이디어 선정", "요구사항 정리", "프로토타입 구현", "테스트와 보완", "배포", "데모 발표"],
  );
  assert.deepEqual(result.ir?.type === "flowchart" ? result.ir.edges.map((edge) => `${edge.from}->${edge.to}`) : [], ["n1->n2", "n2->n3", "n3->n4", "n4->n5", "n5->n6"]);
});

test("flowchart tools edit nodes and edges by natural references", () => {
  let ir: DiagramIR | null = null;

  ir = addNode(ir, "시작", "round").ir;
  ir = addNode(ir, "검토").ir;
  ir = connect(ir, "시작", "검토", "진행").ir;
  ir = relabel(ir, "검토", "요구사항 검토").ir;
  ir = setDirection(ir, "LR").ir;

  assert.equal(ir?.type, "flowchart");
  if (ir?.type !== "flowchart") {
    throw new Error("expected flowchart");
  }

  assert.equal(ir.direction, "LR");
  assert.deepEqual(
    ir.nodes.map((node) => node.label),
    ["시작", "요구사항 검토"],
  );
  assert.equal(ir.edges[0].label, "진행");
});

test("inserts a scoring step between deploy and demo without leaving the old edge", () => {
  const ir = insertNodeBetween(createHackathonFlow().ir, "배포", "데모 발표", "점수 측정").ir;

  assert.equal(ir?.type, "flowchart");
  if (ir?.type !== "flowchart") {
    throw new Error("expected flowchart");
  }

  const scoring = ir.nodes.find((node) => node.label === "점수 측정");
  const deploy = ir.nodes.find((node) => node.label === "배포");
  const demo = ir.nodes.find((node) => node.label === "데모 발표");

  assert.ok(scoring);
  assert.ok(deploy);
  assert.ok(demo);
  assert.ok(ir.edges.some((edge) => edge.from === deploy.id && edge.to === scoring.id));
  assert.ok(ir.edges.some((edge) => edge.from === scoring.id && edge.to === demo.id));
  assert.equal(ir.edges.some((edge) => edge.from === deploy.id && edge.to === demo.id), false);
});

test("adds a scoring and improvement feedback cycle while keeping the main flow", () => {
  const ir = addFeedbackCycle(createHackathonFlow().ir, "테스트와 보완", ["점수 측정", "개선"]).ir;

  assert.equal(ir?.type, "flowchart");
  if (ir?.type !== "flowchart") {
    throw new Error("expected flowchart");
  }

  const testing = ir.nodes.find((node) => node.label === "테스트와 보완");
  const scoring = ir.nodes.find((node) => node.label === "점수 측정");
  const improving = ir.nodes.find((node) => node.label === "개선");
  const deploy = ir.nodes.find((node) => node.label === "배포");

  assert.ok(testing);
  assert.ok(scoring);
  assert.ok(improving);
  assert.ok(deploy);
  assert.ok(ir.edges.some((edge) => edge.from === testing.id && edge.to === scoring.id));
  assert.ok(ir.edges.some((edge) => edge.from === scoring.id && edge.to === improving.id));
  assert.ok(ir.edges.some((edge) => edge.from === improving.id && edge.to === testing.id));
  assert.ok(ir.edges.some((edge) => edge.from === testing.id && edge.to === deploy.id));
});

test("switchType converts flowcharts to sequence diagrams and preserves labels", () => {
  const flowchart = createOrderFlow().ir;
  const sequence = switchType(flowchart, "sequence").ir;

  assert.equal(sequence?.type, "sequence");
  if (sequence?.type !== "sequence") {
    throw new Error("expected sequence");
  }

  assert.deepEqual(
    sequence.participants.map((participant) => participant.label),
    ["장바구니", "결제", "주문확정", "배송"],
  );
  assert.deepEqual(sequence.messages.map((message) => `${message.from}->${message.to}`), ["p1->p2", "p2->p3", "p3->p4"]);
});

test("setDirection leaves sequence diagrams unchanged", () => {
  const sequence = switchType(createOrderFlow().ir, "sequence").ir;
  const result = setDirection(sequence, "LR");

  assert.equal(result.ir?.type, "sequence");
  assert.equal(result.logs[0].tool, "set_direction");
});