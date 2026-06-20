import { NextResponse } from "next/server";
import { correctCommandText } from "@/lib/ai/correction";

type CorrectionRequest = {
  text?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CorrectionRequest;
  const text = body.text?.trim() ?? "";

  if (!text) {
    return NextResponse.json({ message: "교정할 텍스트를 입력해 주세요." }, { status: 400 });
  }

  return NextResponse.json(await correctCommandText(text));
}
