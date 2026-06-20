"use client";

import { FormEvent, useState } from "react";

type CommandInputProps = {
  disabled: boolean;
  onSubmit: (command: string) => Promise<void>;
};

const suggestions = [
  "온라인 쇼핑몰 주문 처리 흐름을 플로우차트로 그려줘",
  "결제 실패 분기를 추가하고 재시도 루프를 넣어줘",
  "장바구니 단계 이름을 카트 확인으로 바꿔줘",
  "왼쪽에서 오른쪽으로 보여줘",
  "전체 지워줘",
];

export function CommandInput({ disabled, onSubmit }: CommandInputProps) {
  const [command, setCommand] = useState(suggestions[0]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(command);
  }

  return (
    <>
      <form className="command-form" onSubmit={handleSubmit}>
        <div className="command-label-row">
          <label className="section-title" htmlFor="command">
            VOICE COMMAND
          </label>
          <span className={disabled ? "rec-badge rec-badge-busy" : "rec-badge"}>{disabled ? "AGENT" : "READY"}</span>
        </div>
        <div className="command-input-row">
          <textarea
            aria-label="텍스트 명령"
            className="command-input"
            disabled={disabled}
            id="command"
            onChange={(event) => setCommand(event.target.value)}
            value={command}
          />
          <button className="primary-button" disabled={disabled || !command.trim()} type="submit">
            명령 실행
          </button>
        </div>
      </form>

      <div className="suggestions" aria-label="예시 명령">
        {suggestions.map((suggestion) => (
          <button className="suggestion-button" disabled={disabled} key={suggestion} onClick={() => setCommand(suggestion)} type="button">
            {suggestion}
          </button>
        ))}
      </div>
    </>
  );
}