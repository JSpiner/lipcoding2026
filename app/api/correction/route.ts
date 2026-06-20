import { NextResponse } from "next/server";
import { correctCommandText } from "@/lib/ai/correction";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { attachSessionCookie, resolveSessionFromRequest } from "@/lib/server/session";

type CorrectionRequest = {
  text?: string;
};

export async function POST(request: Request) {
  const { sessionId } = resolveSessionFromRequest(request);
  const rate = checkRateLimit(`correction:${sessionId}`, 50, 60_000);

  if (!rate.allowed) {
    const response = NextResponse.json(
      {
        message: "교정 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        source: "rule",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
        },
      },
    );
    attachSessionCookie(response, sessionId);
    return response;
  }

  const body = (await request.json().catch(() => ({}))) as CorrectionRequest;
  const text = body.text?.trim() ?? "";

  if (!text) {
    const response = NextResponse.json({ message: "교정할 텍스트를 입력해 주세요." }, { status: 400 });
    attachSessionCookie(response, sessionId);
    return response;
  }

  const response = NextResponse.json(await correctCommandText(text));
  attachSessionCookie(response, sessionId);
  return response;
}
