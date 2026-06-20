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

  if (!mermaid.trim()) {
    return <div className="empty-state">COMMAND IN. DIAGRAM OUT.</div>;
  }

  if (error) {
    return <div className="empty-state">{error}</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}