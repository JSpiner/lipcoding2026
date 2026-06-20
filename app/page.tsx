"use client";

import { useEffect, useState } from "react";
import { CommandInput } from "@/components/CommandInput";
import { DiagramCanvas } from "@/components/DiagramCanvas";
import { ToolLog } from "@/components/ToolLog";
import type { DiagramResponse } from "@/lib/diagram/types";

const initialState: DiagramResponse = {
  ir: null,
  logs: [],
  pendingClear: false,
  mermaid: "",
};

export default function Home() {
  const [state, setState] = useState<DiagramResponse>(initialState);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void refreshState();
  }, []);

  async function refreshState() {
    const response = await fetch("/api/agent", { cache: "no-store" });
    setState(await response.json());
  }

  async function submitCommand(command: string) {
    setIsBusy(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      setState(await response.json());
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmClear() {
    setIsBusy(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmClear: true }),
      });
      setState(await response.json());
    } finally {
      setIsBusy(false);
    }
  }

  async function cancelClear() {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelClear: true }),
    });
    setState(await response.json());
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
          <button className="top-action" disabled={!state.mermaid} onClick={copyMermaid} type="button">
            EXPORT MERMAID
          </button>
        </div>
      </header>

      <section className={isBusy ? "command-strip command-strip-busy" : "command-strip"}>
        <CommandInput disabled={isBusy} onSubmit={submitCommand} />
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
          <button className="secondary-button" disabled={!state.mermaid} onClick={copyMermaid} type="button">
            COPY
          </button>
        </div>
        <pre>{state.mermaid || "아직 생성된 Mermaid 소스가 없습니다."}</pre>
      </section>
    </main>
  );
}