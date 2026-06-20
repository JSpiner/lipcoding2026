import assert from "node:assert/strict";
import test from "node:test";
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
