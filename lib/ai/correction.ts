import { hasAzureOpenAIConfig } from "@/lib/ai/azure-openai";
import { buildCorrectionResult, correctSpeechText, type CorrectionResult } from "@/lib/speech/correction";

export async function correctCommandText(text: string, timeoutMs = 3000): Promise<CorrectionResult> {
  const fallback = correctSpeechText(text);

  if (!hasAzureOpenAIConfig()) {
    return fallback;
  }

  const aiSuggestion = await withTimeout(fetchAzureCorrectionWithRetry(text), timeoutMs, null);

  if (!aiSuggestion) {
    return buildCorrectionResult(text, fallback.corrected, fallback.source, fallback.confidence, "Azure OpenAI 교정이 불안정해 규칙 기반 교정으로 대체했습니다.");
  }

  // Keep final output deterministic by passing AI suggestion through local normalizer.
  const normalized = correctSpeechText(aiSuggestion.correctedText);
  const reason = normalized.corrected !== fallback.corrected ? "Azure OpenAI 기반 교정 결과를 반영했습니다." : fallback.reason;

  return buildCorrectionResult(text, normalized.corrected, "azure-openai", aiSuggestion.confidence, reason);
}

type AzureCorrectionResponse = {
  correctedText: string;
  confidence: number;
};

type AzureChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function fetchAzureCorrection(text: string): Promise<AzureCorrectionResponse | null> {
  try {
    const endpoint = requiredEnv("AZURE_OPENAI_ENDPOINT").replace(/\/$/, "");
    const deployment = requiredEnv("AZURE_OPENAI_DEPLOYMENT");
    const apiVersion = requiredEnv("AZURE_OPENAI_API_VERSION");
    const apiKey = requiredEnv("AZURE_OPENAI_API_KEY");
    const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a Korean speech-to-text correction assistant for a diagram app. Return JSON only with keys correctedText and confidence. Keep the original meaning and intent. Fix spacing and obvious recognition errors only. Do not add new actions.",
          },
          {
            role: "user",
            content: JSON.stringify({ text }),
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as AzureChatResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    const parsed = parseAzureCorrection(content);
    if (typeof parsed.correctedText !== "string" || !parsed.correctedText.trim()) {
      return null;
    }

    return {
      correctedText: parsed.correctedText.trim(),
      confidence: clampConfidence(parsed.confidence),
    };
  } catch {
    return null;
  }
}

function parseAzureCorrection(content: string): AzureCorrectionResponse {
  try {
    return JSON.parse(content) as AzureCorrectionResponse;
  } catch {
    const extracted = extractFirstJsonObject(content);
    if (!extracted) {
      throw new Error("No JSON object in Azure correction response.");
    }

    return JSON.parse(extracted) as AzureCorrectionResponse;
  }
}

function extractFirstJsonObject(value: string): string | null {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return value.slice(start, end + 1);
}

async function fetchAzureCorrectionWithRetry(text: string): Promise<AzureCorrectionResponse | null> {
  const first = await fetchAzureCorrection(text);
  if (first) {
    return first;
  }

  return fetchAzureCorrection(text);
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0.9;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
