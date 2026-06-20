"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";

type DiagramCanvasProps = {
  mermaid: string;
};

export function DiagramCanvas({ mermaid }: DiagramCanvasProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ pointerId: 0, clientX: 0, clientY: 0, x: 0, y: 0 });

  const updateScale = useCallback((nextScale: number) => {
    setView((current) => ({ ...current, scale: clampScale(nextScale) }));
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setView((current) => ({ ...current, scale: clampScale(current.scale + delta) }));
  }, []);

  const panBy = useCallback((x: number, y: number) => {
    setView((current) => ({ ...current, x: current.x + x, y: current.y + y }));
  }, []);

  const resetView = useCallback(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
  }, [mermaid, resetView]);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      if (!mermaid.trim()) {
        setSvg("");
        setError(null);
        return;
      }

      try {
        const mermaidModule = await import("mermaid");
        mermaidModule.default.initialize({
          securityLevel: "strict",
          startOnLoad: false,
          theme: "base",
          flowchart: {
            htmlLabels: false,
            useMaxWidth: true,
          },
          themeVariables: {
            primaryColor: "#ffe14d",
            primaryTextColor: "#111111",
            primaryBorderColor: "#111111",
            lineColor: "#111111",
            secondaryColor: "#00a3ff",
            secondaryBorderColor: "#111111",
            tertiaryColor: "#20e070",
            tertiaryBorderColor: "#111111",
            noteBkgColor: "#fff7d6",
            noteBorderColor: "#111111",
            actorBkg: "#ffffff",
            actorBorder: "#111111",
            actorTextColor: "#111111",
          },
        });

        const result = await mermaidModule.default.render(`diagram-${Date.now()}`, mermaid);

        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg("");
          setError(renderError instanceof Error ? renderError.message : "Mermaid 렌더링에 실패했습니다.");
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [mermaid]);

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!svg) {
      return;
    }

    event.preventDefault();
    const stageRect = stageRef.current?.getBoundingClientRect();
    const nextScale = clampScale(view.scale + (event.deltaY > 0 ? -0.1 : 0.1));

    if (!stageRect || nextScale === view.scale) {
      updateScale(nextScale);
      return;
    }

    const pointerX = event.clientX - stageRect.left;
    const pointerY = event.clientY - stageRect.top;
    const ratio = nextScale / view.scale;

    setView({
      scale: nextScale,
      x: pointerX - (pointerX - view.x) * ratio,
      y: pointerY - (pointerY - view.y) * ratio,
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!svg || event.button !== 0) {
      return;
    }

    panStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: view.x,
      y: view.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    isPanningRef.current = true;
    setIsPanning(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isPanningRef.current || event.pointerId !== panStartRef.current.pointerId) {
      return;
    }

    setView((current) => ({
      ...current,
      x: panStartRef.current.x + event.clientX - panStartRef.current.clientX,
      y: panStartRef.current.y + event.clientY - panStartRef.current.clientY,
    }));
  }

  function finishPanning(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerId === panStartRef.current.pointerId) {
      isPanningRef.current = false;
      setIsPanning(false);
    }
  }

  if (!mermaid.trim()) {
    return <div className="empty-state">COMMAND IN. DIAGRAM OUT.</div>;
  }

  if (error) {
    return <div className="empty-state">{error}</div>;
  }

  return (
    <div className="diagram-viewport">
      <div className="diagram-controls" aria-label="다이어그램 보기 조작">
        <button className="diagram-control-button" type="button" aria-label="다이어그램 확대" onClick={() => zoomBy(0.15)}>
          +
        </button>
        <span className="diagram-zoom-readout" aria-live="polite">
          {Math.round(view.scale * 100)}%
        </span>
        <button className="diagram-control-button" type="button" aria-label="다이어그램 축소" onClick={() => zoomBy(-0.15)}>
          -
        </button>
        <button className="diagram-control-button diagram-control-reset" type="button" aria-label="다이어그램 보기 초기화" onClick={resetView}>
          1:1
        </button>
        <button className="diagram-control-button" type="button" aria-label="다이어그램 왼쪽 이동" onClick={() => panBy(-48, 0)}>
          ←
        </button>
        <button className="diagram-control-button" type="button" aria-label="다이어그램 위로 이동" onClick={() => panBy(0, -48)}>
          ↑
        </button>
        <button className="diagram-control-button" type="button" aria-label="다이어그램 아래로 이동" onClick={() => panBy(0, 48)}>
          ↓
        </button>
        <button className="diagram-control-button" type="button" aria-label="다이어그램 오른쪽 이동" onClick={() => panBy(48, 0)}>
          →
        </button>
      </div>
      <div
        ref={stageRef}
        className={`diagram-pan-surface${isPanning ? " diagram-pan-surface-active" : ""}`}
        data-testid="diagram-pan-surface"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPanning}
        onPointerCancel={finishPanning}
        onWheel={handleWheel}
      >
        <div
          className="diagram-transform-layer"
          data-testid="diagram-transform-layer"
          dangerouslySetInnerHTML={{ __html: svg }}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>
    </div>
  );
}

function clampScale(scale: number) {
  return Math.min(2.5, Math.max(0.35, Number(scale.toFixed(2))));
}