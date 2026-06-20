import { NextResponse } from "next/server";
import { cancelClear, getDiagramResponse, resetDiagramState } from "@/lib/diagram/store";
import { confirmAgentClear, runDiagramAgent } from "@/lib/ai/agent";

type AgentRequest = {
  command?: string;
  confirmClear?: boolean;
  cancelClear?: boolean;
  reset?: boolean;
};

export async function GET() {
  return NextResponse.json(getDiagramResponse());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AgentRequest;

  if (body.confirmClear) {
    return NextResponse.json(confirmAgentClear());
  }

  if (body.cancelClear) {
    return NextResponse.json(cancelClear());
  }

  if (body.reset) {
    return NextResponse.json(resetDiagramState());
  }

  const command = body.command?.trim() ?? "";
  if (!command) {
    return NextResponse.json(getDiagramResponse("명령을 입력해 주세요."), { status: 400 });
  }

  try {
    return NextResponse.json(await runDiagramAgent(command));
  } catch (error) {
    const message = error instanceof Error ? error.message : "에이전트 실행 중 오류가 발생했습니다.";
    return NextResponse.json(getDiagramResponse(message), { status: 502 });
  }
}