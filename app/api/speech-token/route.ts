import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { attachSessionCookie, resolveSessionFromRequest } from "@/lib/server/session";

const TOKEN_TTL_SECONDS = 540;

export async function GET(request: Request) {
  const { sessionId } = resolveSessionFromRequest(request);
  const rate = checkRateLimit(`speech-token:${sessionId}`, 20, 60_000);

  if (!rate.allowed) {
    const response = NextResponse.json(
      {
        message: "Speech 토큰 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        fallback: "browser-speech",
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

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    const response = NextResponse.json(
      {
        message: "Azure Speech 환경 변수가 설정되지 않았습니다.",
        fallback: "browser-speech",
      },
      { status: 503 },
    );
    attachSessionCookie(response, sessionId);
    return response;
  }

  try {
    const tokenResponse = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Length": "0",
      },
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      const response = NextResponse.json(
        {
          message: "Azure Speech 토큰 발급에 실패했습니다.",
          status: tokenResponse.status,
          fallback: "browser-speech",
        },
        { status: 502 },
      );
      attachSessionCookie(response, sessionId);
      return response;
    }

    const response = NextResponse.json({
      token: await tokenResponse.text(),
      region,
      expiresIn: TOKEN_TTL_SECONDS,
      source: "azure-speech",
    });
    attachSessionCookie(response, sessionId);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        message: "Speech 토큰 요청 중 네트워크 오류가 발생했습니다.",
        fallback: "browser-speech",
      },
      { status: 502 },
    );
    attachSessionCookie(response, sessionId);
    return response;
  }
}
