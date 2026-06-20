import { NextResponse } from "next/server";

const TOKEN_TTL_SECONDS = 540;

export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json(
      {
        message: "Azure Speech 환경 변수가 설정되지 않았습니다.",
        fallback: "browser-speech",
      },
      { status: 503 },
    );
  }

  const tokenResponse = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Length": "0",
    },
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return NextResponse.json(
      {
        message: "Azure Speech 토큰 발급에 실패했습니다.",
        status: tokenResponse.status,
        fallback: "browser-speech",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    token: await tokenResponse.text(),
    region,
    expiresIn: TOKEN_TTL_SECONDS,
    source: "azure-speech",
  });
}
