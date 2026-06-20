"use client";

import { useEffect, useState } from "react";
import { CommandInput, defaultCommand } from "@/components/CommandInput";
import { DiagramCanvas } from "@/components/DiagramCanvas";
import { ExportButtons } from "@/components/ExportButtons";
import { ToolLog } from "@/components/ToolLog";
import { VoiceInput } from "@/components/VoiceInput";
import type { DiagramResponse } from "@/lib/diagram/types";

const initialState: DiagramResponse = {
  ir: null,
  logs: [],
  pendingClear: false,
  mermaid: "",
};

export default function Home() {
  const [state, setState] = useState<DiagramResponse>(initialState);
  const [command, setCommand] = useState(defaultCommand);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);

  useEffect(() => {
    void refreshState();
  }, []);

  async function refreshState() {
    await requestAgent({ method: "GET", cache: "no-store" });
  }

  async function requestAgent(init: RequestInit): Promise<void> {
    setErrorMessage(null);

    try {
      const response = await fetch("/api/agent", init);
      const payload = (await response.json()) as DiagramResponse;
      setState(payload);

      if (!response.ok) {
        setErrorMessage(payload.message ?? "요청 처리 중 오류가 발생했습니다.");
      }
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function submitCommand(command: string) {
    setIsBusy(true);
    try {
      await requestAgentStream(command);
    } finally {
      setIsBusy(false);
      setStreamStatus(null);
    }
  }

  async function requestAgentStream(command: string): Promise<void> {
    setErrorMessage(null);
    setStreamStatus("에이전트 계획을 수립하고 있습니다.");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, stream: true }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as DiagramResponse | null;
        if (payload) {
          setState(payload);
          setErrorMessage(payload.message ?? "요청 처리 중 오류가 발생했습니다.");
        } else {
          setErrorMessage("요청 처리 중 오류가 발생했습니다.");
        }
        return;
      }

      if (!response.body) {
        setErrorMessage("스트리밍 응답을 받을 수 없습니다.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event:"));
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!eventLine || !dataLine) {
            continue;
          }

          const event = eventLine.replace("event:", "").trim();
          const payload = JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, unknown>;

          if (event === "status") {
            setStreamStatus(String(payload.message ?? "에이전트가 응답 중입니다."));
            continue;
          }

          if (event === "plan") {
            const source = String(payload.source ?? "agent");
            const summary = String(payload.summary ?? "계획 수립 완료");
            setStreamStatus(`[${source}] ${summary}`);
            continue;
          }

          if (event === "action") {
            const index = String(payload.index ?? "?");
            const total = String(payload.total ?? "?");
            const tool = String(payload.tool ?? "tool");
            setStreamStatus(`(${index}/${total}) ${tool} 실행 중`);
            continue;
          }

          if (event === "done") {
            setState(payload as unknown as DiagramResponse);
            setStreamStatus(null);
            continue;
          }

          if (event === "error") {
            setErrorMessage(String(payload.message ?? "에이전트 실행 중 오류가 발생했습니다."));
            setStreamStatus(null);
          }
        }
      }
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function confirmClear() {
    setIsBusy(true);
    try {
      await requestAgent({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmClear: true }),
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function cancelClear() {
    await requestAgent({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelClear: true }),
    });
  }

  async function undoLastChange() {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      await requestAgent({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undo: true }),
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function copyMermaid() {
    await navigator.clipboard.writeText(state.mermaid);
  }

  return (
    <main className="shell">
      <header className="top-bar">
        <div className="brand-block">
          <span className="brand-mark">MALGRIM / 말그림</span>
          <span className="brand-subtitle">SpeakDraw</span>
        </div>
        <div className="session-strip" aria-label="세션 상태">
          <span className={isBusy ? "state-badge state-badge-busy" : "state-badge"}>{isBusy ? "해석 중" : "LIVE SESSION"}</span>
          <ExportButtons mermaid={state.mermaid} onCopy={copyMermaid} />
        </div>
      </header>

      <section className={isBusy ? "command-strip command-strip-busy" : "command-strip"}>
        <VoiceInput disabled={isBusy} onInterimTranscript={setCommand} />
        <CommandInput command={command} disabled={isBusy} onCommandChange={setCommand} onSubmit={submitCommand} />
      </section>

      <div className="workspace">
        <section className="canvas-panel" aria-label="다이어그램 캔버스">
          <div className="panel-header">
            <h1>DIAGRAM CANVAS</h1>
            <span className="panel-counter">{state.ir ? state.ir.type : "EMPTY"}</span>
          </div>
          <div className="diagram-stage">
            <DiagramCanvas mermaid={state.mermaid} />
          </div>
        </section>

        <aside className="trace-panel" aria-label="에이전트 추적">
          <div className="panel-header panel-header-trace">
            <h2>AGENT TRACE</h2>
            <span className="panel-counter">{state.logs.length} CALLS</span>
          </div>

          {streamStatus ? <div className="notice">{streamStatus}</div> : null}

          <div className="button-row">
            <button className="secondary-button" disabled={isBusy} onClick={undoLastChange} type="button">
              마지막 변경 되돌리기
            </button>
          </div>

          {errorMessage ? <div className="notice">{errorMessage}</div> : null}

          {state.message ? <div className="notice">{state.message}</div> : null}

          {state.pendingClear ? (
            <div className="confirm-panel">
              <strong>확인 필요</strong>
              <div className="button-row">
                <button className="danger-button" disabled={isBusy} onClick={confirmClear} type="button">
                  삭제 승인
                </button>
                <button className="secondary-button" disabled={isBusy} onClick={cancelClear} type="button">
                  취소
                </button>
              </div>
            </div>
          ) : null}

          <ToolLog logs={state.logs} />
        </aside>
      </div>

      <section className="mermaid-source" aria-label="Mermaid 원문">
        <div className="source-header">
          <h2>MERMAID SOURCE / RAW OUTPUT</h2>
          <ExportButtons mermaid={state.mermaid} onCopy={copyMermaid} />
        </div>
        <pre>{state.mermaid || "아직 생성된 Mermaid 소스가 없습니다."}</pre>
      </section>
    </main>
  );
}