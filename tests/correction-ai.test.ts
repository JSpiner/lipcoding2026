import assert from "node:assert/strict";
import test from "node:test";
import { correctCommandText } from "@/lib/ai/correction";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

test("correctCommandText uses rule fallback when Azure config is missing", async () => {
  delete process.env.AZURE_OPENAI_ENDPOINT;
  delete process.env.AZURE_OPENAI_API_KEY;
  delete process.env.AZURE_OPENAI_DEPLOYMENT;
  delete process.env.AZURE_OPENAI_API_VERSION;

  const result = await correctCommandText("요 구 사 항 정리 전에 사용자 인터부 단계를 추가해줘");

  assert.equal(result.source, "rule");
  assert.equal(result.corrected, "요구사항 정리 전에 사용자 인터뷰 단계를 추가해줘");
});

test("correctCommandText returns azure-openai source when Azure correction succeeds", async () => {
  process.env.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com";
  process.env.AZURE_OPENAI_API_KEY = "test-key";
  process.env.AZURE_OPENAI_DEPLOYMENT = "gpt-4o";
  process.env.AZURE_OPENAI_API_VERSION = "2024-08-01-preview";
  delete process.env.MALGRIM_DISABLE_AZURE_OPENAI;

  globalThis.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ correctedText: "요구사항 정리 전에 유저 인터뷰 단계를 추가해줘", confidence: 0.97 }),
            },
          },
        ],
      }),
    } as Response;
  }) as typeof fetch;

  const result = await correctCommandText("요구 사항 정리 전에 유저 인트뷰 단계를 추가해줘");

  assert.equal(result.source, "azure-openai");
  assert.equal(result.corrected, "요구사항 정리 전에 유저 인터뷰 단계를 추가해줘");
  assert.equal(result.applied, true);
});

test("correctCommandText falls back to rule when Azure correction fails", async () => {
  process.env.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com";
  process.env.AZURE_OPENAI_API_KEY = "test-key";
  process.env.AZURE_OPENAI_DEPLOYMENT = "gpt-4o";
  process.env.AZURE_OPENAI_API_VERSION = "2024-08-01-preview";
  delete process.env.MALGRIM_DISABLE_AZURE_OPENAI;

  globalThis.fetch = (async () => {
    throw new Error("network error");
  }) as typeof fetch;

  const result = await correctCommandText("전체 지어줘");

  assert.equal(result.source, "rule");
  assert.equal(result.corrected, "전체 지워줘");
  assert.equal(result.applied, false);
  assert.match(result.reason, /Azure OpenAI 교정이 불안정해/);
});
