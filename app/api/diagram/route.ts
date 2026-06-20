import { NextResponse } from "next/server";
import { addPaymentFailureBranch, clearDiagram, createOrderFlow, relabel, setDirection } from "@/lib/diagram/tools";
import { applyToolResult, cancelClear, getDiagramIR, getDiagramResponse, requestClear } from "@/lib/diagram/store";

type DiagramRequest = {
  command?: string;
  confirmClear?: boolean;
  cancelClear?: boolean;
};

export async function GET() {
  return NextResponse.json(getDiagramResponse());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as DiagramRequest;

  if (body.confirmClear) {
    return NextResponse.json(applyToolResult(clearDiagram()));
  }

  if (body.cancelClear) {
    return NextResponse.json(cancelClear());
  }

  const command = body.command?.trim() ?? "";
  if (!command) {
    return NextResponse.json(getDiagramResponse("명령을 입력해 주세요."), { status: 400 });
  }

  const normalized = normalize(command);
  const ir = getDiagramIR();

  if (hasAny(normalized, ["전체지워", "전부지워", "모두지워", "초기화", "삭제해"])) {
    return NextResponse.json(requestClear());
  }

  if (hasAny(normalized, ["주문처리", "쇼핑몰", "플로우차트로", "흐름을플로우차트"])) {
    return NextResponse.json(applyToolResult(createOrderFlow()));
  }

  if (hasAny(normalized, ["결제실패", "실패분기", "재시도"])) {
    return NextResponse.json(applyToolResult(addPaymentFailureBranch(ir)));
  }

  if (hasAny(normalized, ["카트확인", "장바구니를카트", "장바구니단계이름"])) {
    return NextResponse.json(applyToolResult(relabel(ir, "장바구니", "카트 확인")));
  }

  if (hasAny(normalized, ["왼쪽에서오른쪽", "좌에서우", "가로", "lr"])) {
    return NextResponse.json(applyToolResult(setDirection(ir, "LR")));
  }

  if (hasAny(normalized, ["위에서아래", "세로", "td"])) {
    return NextResponse.json(applyToolResult(setDirection(ir, "TD")));
  }

  return NextResponse.json(getDiagramResponse("아직 이 명령은 1단계 MVP에서 지원하지 않습니다."));
}

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}