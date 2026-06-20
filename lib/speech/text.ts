export type SpeechTextResult = {
  text?: string | null;
};

export function readSpeechText(result: SpeechTextResult | null | undefined) {
  return (result?.text ?? "").trim();
}
