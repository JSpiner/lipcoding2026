import { NextResponse } from "next/server";
import { addPaymentFailureBranch, clearDiagram, createOrderFlow, relabel, setDirection } from "@/lib/diagram/tools";
import { applyToolResult, cancelClear, getDiagramIR, getDiagramResponse, requestClear } from "@/lib/diagram/store";
import { attachSessionCookie, resolveSessionFromRequest } from "@/lib/server/session";

type DiagramRequest = {
  command?: string;
  confirmClear?: boolean;
  cancelClear?: boolean;
};

export async function GET(request: Request) {
  const { sessionId } = resolveSessionFromRequest(request);
  const response = NextResponse.json(getDiagramResponse(undefined, sessionId));
  attachSessionCookie(response, sessionId);
  return response;
}

export async function POST(request: Request) {
  const { sessionId } = resolveSessionFromRequest(request);
  const body = (await request.json().catch(() => ({}))) as DiagramRequest;

  const withSession = (response: NextResponse) => {
    attachSessionCookie(response, sessionId);
    return response;
  };

  if (body.confirmClear) {
    return withSession(NextResponse.json(applyToolResult(clearDiagram(), sessionId)));
  }

  if (body.cancelClear) {
    return withSession(NextResponse.json(cancelClear(sessionId)));
  }

  const command = body.command?.trim() ?? "";
  if (!command) {
    return withSession(NextResponse.json(getDiagramResponse("명령을 입력해 주세요.", sessionId), { status: 400 }));
  }

  const normalized = normalize(command);
  const ir = getDiagramIR(sessionId);

  if (hasAny(normalized, ["전체지워", "전부지워", "모두지워", "초기화", "삭제해"])) {
    return withSession(NextResponse.json(requestClear(sessionId)));
  }

  if (hasAny(normalized, ["주문처리", "쇼핑몰", "플로우차트로", "흐름을플로우차트"])) {
    return withSession(NextResponse.json(applyToolResult(createOrderFlow(), sessionId)));
  }

  if (hasAny(normalized, ["결제실패", "실패분기", "재시도"])) {
    return withSession(NextResponse.json(applyToolResult(addPaymentFailureBranch(ir), sessionId)));
  }

  if (hasAny(normalized, ["카트확인", "장바구니를카트", "장바구니단계이름"])) {
    return withSession(NextResponse.json(applyToolResult(relabel(ir, "장바구니", "카트 확인"), sessionId)));
  }

  if (hasAny(normalized, ["왼쪽에서오른쪽", "좌에서우", "가로", "lr"])) {
    return withSession(NextResponse.json(applyToolResult(setDirection(ir, "LR"), sessionId)));
  }

  if (hasAny(normalized, ["위에서아래", "세로", "td"])) {
    return withSession(NextResponse.json(applyToolResult(setDirection(ir, "TD"), sessionId)));
  }

  return withSession(NextResponse.json(getDiagramResponse("아직 이 명령은 1단계 MVP에서 지원하지 않습니다.", sessionId)));
}

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}