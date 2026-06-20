import { NextResponse } from "next/server";
import { cancelClear, getDiagramResponse, resetDiagramState, undoLastChange } from "@/lib/diagram/store";
import { confirmAgentClear, runDiagramAgent, runDiagramAgentWithEvents } from "@/lib/ai/agent";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { attachSessionCookie, resolveSessionFromRequest } from "@/lib/server/session";
import { trackServerEvent, trackServerException, trackServerMetric } from "@/lib/server/telemetry";

type AgentRequest = {
  command?: string;
  confirmClear?: boolean;
  cancelClear?: boolean;
  reset?: boolean;
  undo?: boolean;
  stream?: boolean;
};

function withSession(response: NextResponse, sessionId: string): NextResponse {
  attachSessionCookie(response, sessionId);
  return response;
}

export async function GET(request: Request) {
  const { sessionId } = resolveSessionFromRequest(request);
  return withSession(NextResponse.json(getDiagramResponse(undefined, sessionId)), sessionId);
}

export async function POST(request: Request) {
  const { sessionId } = resolveSessionFromRequest(request);
  const rate = checkRateLimit(`agent:${sessionId}`, 40, 60_000);

  if (!rate.allowed) {
    trackServerEvent("agent_rate_limited", {
      route: "/api/agent",
      sessionId,
    });

    const response = NextResponse.json(getDiagramResponse("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", sessionId), {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
      },
    });
    return withSession(response, sessionId);
  }

  const body = (await request.json().catch(() => ({}))) as AgentRequest;

  if (body.confirmClear) {
    return withSession(NextResponse.json(confirmAgentClear(sessionId)), sessionId);
  }

  if (body.cancelClear) {
    return withSession(NextResponse.json(cancelClear(sessionId)), sessionId);
  }

  if (body.reset) {
    return withSession(NextResponse.json(resetDiagramState(sessionId)), sessionId);
  }

  if (body.undo) {
    return withSession(NextResponse.json(undoLastChange(sessionId)), sessionId);
  }

  const command = body.command?.trim() ?? "";
  if (!command) {
    return withSession(NextResponse.json(getDiagramResponse("명령을 입력해 주세요.", sessionId), { status: 400 }), sessionId);
  }

  if (body.stream) {
    const startedAt = Date.now();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, payload: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        };

        void (async () => {
          send("status", { message: "에이전트 계획을 수립하고 있습니다." });

          try {
            await runDiagramAgentWithEvents(
              command,
              (event) => {
                if (event.type === "planned") {
                  trackServerEvent("agent_plan_created", {
                    route: "/api/agent",
                    source: event.source,
                    sessionId,
                  }, {
                    actionCount: event.actions.length,
                  });

                  send("plan", {
                    source: event.source,
                    summary: event.summary,
                    actionCount: event.actions.length,
                  });
                  return;
                }

                if (event.type === "action") {
                  trackServerEvent("agent_action_executed", {
                    route: "/api/agent",
                    tool: event.action.tool,
                    sessionId,
                  }, {
                    index: event.index,
                    total: event.total,
                  });

                  send("action", {
                    index: event.index,
                    total: event.total,
                    tool: event.action.tool,
                    summary: event.result.logs[0]?.summary ?? "도구 실행 완료",
                  });
                  return;
                }

                if (event.type === "done") {
                  const elapsedMs = Date.now() - startedAt;
                  trackServerMetric("agent_execution_ms", elapsedMs, {
                    route: "/api/agent",
                    mode: "stream",
                    source: event.result.agent.source,
                  });
                  trackServerEvent("agent_run_completed", {
                    route: "/api/agent",
                    mode: "stream",
                    source: event.result.agent.source,
                    sessionId,
                  }, {
                    actionCount: event.result.agent.actionCount,
                    elapsedMs,
                  });

                  send("done", event.result);
                }
              },
              sessionId,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "에이전트 실행 중 오류가 발생했습니다.";
            trackServerException(error, {
              route: "/api/agent",
              mode: "stream",
              sessionId,
            });
            send("error", {
              message,
            });
          } finally {
            controller.close();
          }
        })();
      },
    });

    const response = new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });

    return withSession(response, sessionId);
  }

  try {
    const startedAt = Date.now();
    const result = await runDiagramAgent(command, sessionId);
    const elapsedMs = Date.now() - startedAt;

    trackServerMetric("agent_execution_ms", elapsedMs, {
      route: "/api/agent",
      mode: "json",
      source: result.agent.source,
    });
    trackServerEvent("agent_run_completed", {
      route: "/api/agent",
      mode: "json",
      source: result.agent.source,
      sessionId,
    }, {
      actionCount: result.agent.actionCount,
      elapsedMs,
    });

    return withSession(NextResponse.json(result), sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "에이전트 실행 중 오류가 발생했습니다.";
    trackServerException(error, {
      route: "/api/agent",
      mode: "json",
      sessionId,
    });
    return withSession(NextResponse.json(getDiagramResponse(message, sessionId), { status: 502 }), sessionId);
  }
}