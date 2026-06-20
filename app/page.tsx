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
      <header className="header">
        <div>
          <p className="eyebrow">MalGrim · SpeakDraw</p>
          <h1>말하면 그려지는 다이어그램</h1>
          <p>2단계: 에이전트가 명령을 도구 호출로 바꿔 IR을 편집하고 Mermaid로 렌더링합니다.</p>
        </div>
        <span className="status-pill">Agent API 준비됨</span>
      </header>

      <div className="workspace">
        <aside className="panel">
          <CommandInput disabled={isBusy} onSubmit={submitCommand} />

          {state.message ? <div className="notice">{state.message}</div> : null}

          {state.pendingClear ? (
            <div className="button-row">
              <button className="danger-button" disabled={isBusy} onClick={confirmClear} type="button">
                삭제 승인
              </button>
              <button className="secondary-button" disabled={isBusy} onClick={cancelClear} type="button">
                취소
              </button>
            </div>
          ) : null}

          <ToolLog logs={state.logs} />
        </aside>

        <section className="main-column">
          <div className="canvas-panel">
            <div className="canvas-header">
              <h2 className="canvas-title">다이어그램 미리보기</h2>
              <button className="secondary-button" disabled={!state.mermaid} onClick={copyMermaid} type="button">
                Mermaid 복사
              </button>
            </div>
            <div className="diagram-stage">
              <DiagramCanvas mermaid={state.mermaid} />
            </div>
          </div>

          <div className="mermaid-source">
            <div className="source-header">
              <h2>Mermaid 소스</h2>
            </div>
            <pre>{state.mermaid || "아직 생성된 Mermaid 소스가 없습니다."}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}