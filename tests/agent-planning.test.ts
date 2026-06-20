import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlan } from "../lib/ai/azure-openai";

test("normalizePlan rejects incomplete mutating tool calls", () => {
  const plan = normalizePlan(
    {
      summary: "bad plan",
      actions: [{ tool: "add_node" }, { tool: "connect" }, { tool: "relabel", ref: "결제" }, { tool: "remove" }],
    },
    "azure-openai",
  );

  assert.deepEqual(plan.actions, []);
});

test("normalizePlan keeps valid tool calls and normalizes option values", () => {
  const plan = normalizePlan(
    {
      summary: "valid plan",
      actions: [
        { tool: "add_node", label: "아이디어 선정", shape: "circle" },
        { tool: "connect", from: "아이디어 선정", to: "요구사항 정리", label: "다음" },
        { tool: "switch_type", target: "sequence" },
        { tool: "export", format: "png" },
      ],
    },
    "azure-openai",
  );

  assert.deepEqual(plan.actions, [
    { tool: "add_node", label: "아이디어 선정", shape: "rect" },
    { tool: "connect", from: "아이디어 선정", to: "요구사항 정리", label: "다음" },
    { tool: "switch_type", target: "sequence" },
    { tool: "export", format: "png" },
  ]);
});