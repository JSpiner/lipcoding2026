"use client";

import { useEffect, useState } from "react";

type DiagramCanvasProps = {
  mermaid: string;
};

export function DiagramCanvas({ mermaid }: DiagramCanvasProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

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
          themeVariables: {
            primaryColor: "#e5f4f1",
            primaryTextColor: "#18212f",
            primaryBorderColor: "#0f766e",
            lineColor: "#415466",
            secondaryColor: "#f4f7fb",
            tertiaryColor: "#fff8eb",
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

  if (!mermaid.trim()) {
    return <div className="empty-state">예시 명령을 실행하면 이 영역에 다이어그램이 표시됩니다.</div>;
  }

  if (error) {
    return <div className="empty-state">{error}</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}