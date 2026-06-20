import assert from "node:assert/strict";
import test from "node:test";
import { correctSpeechText } from "@/lib/speech/correction";
import { readSpeechText } from "@/lib/speech/text";

test("readSpeechText returns empty text for missing Azure Speech result text", () => {
  assert.equal(readSpeechText(undefined), "");
  assert.equal(readSpeechText(null), "");
  assert.equal(readSpeechText({}), "");
  assert.equal(readSpeechText({ text: undefined }), "");
  assert.equal(readSpeechText({ text: null }), "");
});

test("readSpeechText trims recognized speech text", () => {
  assert.equal(readSpeechText({ text: "  해커톤 플로우차트 그려줘  " }), "해커톤 플로우차트 그려줘");
});

test("correctSpeechText applies safe rule corrections", () => {
  const result = correctSpeechText("요구 사항 정리 전에 유저 인트뷰 단계를 추가해줘");

  assert.equal(result.corrected, "요구사항 정리 전에 유저 인터뷰 단계를 추가해줘");
  assert.equal(result.risk, "safe");
  assert.equal(result.applied, true);
  assert.equal(result.source, "rule");
});

test("correctSpeechText does not auto-apply destructive corrections", () => {
  const result = correctSpeechText("전체 지어줘");

  assert.equal(result.corrected, "전체 지워줘");
  assert.equal(result.risk, "destructive");
  assert.equal(result.applied, false);
});

test("correctSpeechText handles non-hardcoded speech variants", () => {
  const result = correctSpeechText("요 구 사 항 정리 전에 사용자 인터부 단계를 추가해줘");

  assert.equal(result.corrected, "요구사항 정리 전에 사용자 인터뷰 단계를 추가해줘");
  assert.equal(result.risk, "safe");
  assert.equal(result.applied, true);
  assert.equal(result.source, "rule");
});

test("correctSpeechText corrects broader destructive typo patterns", () => {
  const result = correctSpeechText("전부 지어줘");

  assert.equal(result.corrected, "전부 지워줘");
  assert.equal(result.risk, "destructive");
  assert.equal(result.applied, false);
});
