import type { ToolLogEntry } from "@/lib/diagram/types";

type ToolLogProps = {
  logs: ToolLogEntry[];
};

export function ToolLog({ logs }: ToolLogProps) {
  return (
    <div className="tool-log">
      {logs.length === 0 ? (
        <p className="log-summary log-empty">아직 실행된 도구가 없습니다.</p>
      ) : (
        logs.map((log) => (
          <div className="log-item" key={log.id}>
            <span className="log-tool">&gt; {log.tool}</span>
            <p className="log-summary">{log.summary}</p>
          </div>
        ))
      )}
    </div>
  );
}