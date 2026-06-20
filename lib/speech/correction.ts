export type CorrectionRisk = "safe" | "destructive" | "ambiguous";
export type CorrectionSource = "none" | "rule" | "azure-openai";

export type CorrectionResult = {
  original: string;
  corrected: string;
  confidence: number;
  source: CorrectionSource;
  risk: CorrectionRisk;
  applied: boolean;
  reason: string;
};

type CorrectionRule = {
  pattern: RegExp;
  replacement: string;
};

const correctionRules: CorrectionRule[] = [
  // Merge split compound terms that are common in speech recognition output.
  { pattern: /요\s*구\s*사\s*항/g, replacement: "요구사항" },
  { pattern: /프로\s*토\s*타\s*입/g, replacement: "프로토타입" },
  { pattern: /플\s*로\s*우\s*차\s*트/g, replacement: "플로우차트" },
  { pattern: /시\s*퀀\s*스/g, replacement: "시퀀스" },

  // Normalize frequently confused words from Korean speech-to-text.
  { pattern: /(유저|사용자)\s*(인(?:트|터|투)?뷰|인터부|인텁뷰)/g, replacement: "$1 인터뷰" },
  { pattern: /시\s*퀸\s*스|시퀀쓰|시퀸쓰/g, replacement: "시퀀스" },

  // Keep phrase spacing consistent for readability.
  { pattern: /데모\s*발표/g, replacement: "데모 발표" },
  { pattern: /점수\s*측정/g, replacement: "점수 측정" },

  // Destructive commands are corrected but still require manual confirmation.
  { pattern: /(전체|전부|모두)\s*지어줘/g, replacement: "$1 지워줘" },
];

export function correctSpeechText(text: string): CorrectionResult {
  const original = normalizeWhitespace(text);
  const corrected = applyRules(original);
  return buildCorrectionResult(original, corrected, corrected !== original ? "rule" : "none", corrected !== original ? 0.92 : 1);
}

export function buildCorrectionResult(
  originalText: string,
  correctedText: string,
  source: CorrectionSource,
  confidence: number,
  reasonOverride?: string,
): CorrectionResult {
  const original = normalizeWhitespace(originalText);
  const corrected = normalizeWhitespace(correctedText);
  const risk = classifyRisk(original, corrected);
  const changed = corrected !== original;
  const applied = !changed || risk === "safe";

  return {
    original,
    corrected,
    confidence,
    source,
    risk,
    applied,
    reason:
      reasonOverride ??
      (changed
        ? applied
          ? "규칙 기반 교정을 자동 적용했습니다."
          : "위험하거나 모호한 명령은 자동 적용하지 않았습니다."
        : "교정할 내용이 없습니다."),
  };
}

function applyRules(text: string): string {
  return correctionRules.reduce((value, rule) => value.replace(rule.pattern, rule.replacement), text);
}

function classifyRisk(original: string, corrected: string): CorrectionRisk {
  const originalRisk = hasDestructiveIntent(original);
  const correctedRisk = hasDestructiveIntent(corrected);

  if (originalRisk || correctedRisk) {
    return "destructive";
  }

  if (hasAmbiguousPronoun(corrected)) {
    return "ambiguous";
  }

  return "safe";
}

function hasDestructiveIntent(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return ["전체지워", "전부지워", "모두지워", "전체삭제", "초기화"].some((keyword) => normalized.includes(keyword));
}

function hasAmbiguousPronoun(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return ["그거", "그노드", "저거"].some((keyword) => normalized.includes(keyword));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
