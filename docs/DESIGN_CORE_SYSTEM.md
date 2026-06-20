# 디자인 코어 시스템 — 말그림(MalGrim)

> 기준 문서: [docs/PRD.md](PRD.md)  
> 참고 방향: GitHub 제품 UI와 Primer Design System의 구조, 밀도, 접근성, 개발자 도구 감각을 말그림에 맞게 재해석한다.

---

## 1. 디자인 목표

말그림은 마케팅 페이지가 아니라 회의와 설계 논의 중 바로 쓰는 생산성 도구다. 첫 화면은 제품 설명보다 작업 공간이어야 하며, 사용자는 들어오자마자 명령을 말하거나 입력하고, 결과 다이어그램을 확인하고, 도구 호출 로그를 추적할 수 있어야 한다.

### 핵심 원칙

1. **작업 우선**: 화면의 중심은 다이어그램 캔버스다. 설명 문구, 장식, 랜딩형 히어로는 최소화한다.
2. **개발자 도구다운 신뢰감**: GitHub처럼 차분한 중립 배경, 명확한 경계선, 작은 밀도의 컨트롤을 사용한다.
3. **음성 상태의 가시성**: 듣는 중, 처리 중, 도구 호출 중, 확인 대기 상태가 색상과 텍스트로 즉시 구분되어야 한다.
4. **모델 행동의 투명성**: Copilot SDK 에이전트가 어떤 도구를 호출했는지 로그로 노출한다.
5. **실패해도 복구 가능**: 렌더 실패, 음성 인식 실패, 모호한 참조, 위험 작업 확인을 각각 독립 상태로 설계한다.

---

## 2. GitHub/Primer 참고 포인트

이 프로젝트는 GitHub를 시각적으로 복제하지 않는다. 대신 GitHub 제품 UI에서 유효한 패턴을 가져온다.

| 참고 요소 | 말그림 적용 |
|---|---|
| Primer Product UI | 버튼, 입력, 배지, 알림, 사이드 패널의 기본 구조 참고 |
| Primer Primitives | 색상, 간격, 타이포그래피를 토큰 기반으로 관리 |
| Octicons | 개발자 도구에 익숙한 아이콘 언어 사용. 구현 시 `@primer/octicons-react` 또는 이미 설치된 아이콘 라이브러리 사용 |
| GitHub 작업 화면 | 헤더는 얇고, 본문은 작업 밀도 높게, 상태 정보는 배지/로그/작은 패널로 표현 |
| GitHub Copilot UI | AI가 작업 중임을 스트리밍 텍스트와 단계별 로그로 보여주는 구조 참고 |

참고 URL:

- https://primer.style/
- https://primer.style/product/
- https://primer.style/product/primitives/
- https://primer.style/octicons
- https://github.com/

---

## 3. 제품 인상

### 키워드

- **Focused**: 회의 흐름을 끊지 않는 집중형 작업 도구
- **Legible**: 다이어그램, 로그, 명령 결과가 빠르게 읽힘
- **Trustworthy**: AI가 무슨 변경을 했는지 숨기지 않음
- **Fast**: 음성 명령 이후 화면 변화가 즉시 느껴짐
- **Calm**: 과한 장식보다 안정적인 인터페이스

### 하지 말 것

- 첫 화면을 랜딩 페이지처럼 만들지 않는다.
- 그라데이션 배경, 큰 장식 카드, 과한 보라색 AI 테마로 덮지 않는다.
- 다이어그램 작업 영역을 카드 안의 카드로 중첩하지 않는다.
- 안내 문구로 화면을 설명하지 않는다. 상태와 컨트롤 자체가 이해되게 만든다.

---

## 4. 화면 구조

### 기본 레이아웃

```text
┌────────────────────────────────────────────────────────────┐
│ Top Bar: 제품명 / 세션 상태 / Export / Settings            │
├────────────────────────────────────────────────────────────┤
│ Command Bar: Mic / 텍스트 입력 / Submit / Listening 상태    │
├─────────────────────────────┬──────────────────────────────┤
│ Diagram Canvas              │ Agent + Tool Log Panel        │
│                             │ - transcript                  │
│                             │ - tool calls                  │
│                             │ - confirmations/errors        │
├─────────────────────────────┴──────────────────────────────┤
│ Mermaid Source Drawer 또는 하단 접힘 패널                   │
└────────────────────────────────────────────────────────────┘
```

### 데스크톱

- 전체 화면을 `100dvh`로 사용한다.
- 좌측/중앙은 캔버스, 우측은 로그 패널로 둔다.
- 권장 비율: 캔버스 `minmax(0, 1fr)`, 로그 패널 `360px`.
- 캔버스는 넓고 비어 보여도 괜찮지만, 입력 영역과 로그는 항상 접근 가능해야 한다.

### 태블릿/좁은 화면

- 로그 패널은 하단 탭 또는 드로어로 전환한다.
- Command Bar는 2줄까지 허용한다.
- 버튼 텍스트가 줄어들면 아이콘 우선, 툴팁으로 보완한다.

### 모바일

- MVP에서는 완전 최적화는 Non-goal이지만 깨지면 안 된다.
- 캔버스 상단, 명령 입력 하단 고정, 로그는 접힘 패널로 둔다.
- 다이어그램은 가로 스크롤 또는 fit-to-screen 토글을 제공한다.

---

## 5. 디자인 토큰

Primer의 토큰 철학을 따른다. 실제 구현에서는 CSS 변수로 먼저 정의하고, 필요하면 Primer 변수명과 매핑한다.

### 색상

말그림의 기본 테마는 라이트 모드 우선이다. GitHub 제품 화면처럼 중립 배경을 중심으로 두고, 상태색만 선명하게 사용한다.

```css
:root {
  --mg-bg-canvas: #ffffff;
  --mg-bg-page: #f6f8fa;
  --mg-bg-subtle: #f0f3f6;
  --mg-bg-inset: #f6f8fa;

  --mg-fg-default: #1f2328;
  --mg-fg-muted: #656d76;
  --mg-fg-subtle: #6e7781;
  --mg-fg-on-emphasis: #ffffff;

  --mg-border-default: #d0d7de;
  --mg-border-muted: #d8dee4;
  --mg-border-emphasis: #8c959f;

  --mg-accent: #0969da;
  --mg-accent-muted: #ddf4ff;
  --mg-success: #1a7f37;
  --mg-success-muted: #dafbe1;
  --mg-attention: #9a6700;
  --mg-attention-muted: #fff8c5;
  --mg-danger: #cf222e;
  --mg-danger-muted: #ffebe9;
  --mg-ai: #8250df;
  --mg-ai-muted: #f3efff;

  --mg-focus: #0969da;
  --mg-shadow-sm: 0 1px 0 rgba(31, 35, 40, 0.04);
  --mg-shadow-md: 0 8px 24px rgba(140, 149, 159, 0.2);
}
```

#### 사용 규칙

| 용도 | 색상 |
|---|---|
| 기본 페이지 배경 | `--mg-bg-page` |
| 캔버스/패널 배경 | `--mg-bg-canvas` |
| 기본 액션, 링크, 포커스 | `--mg-accent` |
| 음성 듣는 중 | `--mg-ai` |
| 도구 호출 성공 | `--mg-success` |
| 사용자 확인 대기 | `--mg-attention` |
| 삭제/렌더 실패/시크릿 오류 | `--mg-danger` |

### 다크 모드 준비 토큰

4시간 MVP에서는 라이트 모드만 구현해도 된다. 다만 토큰은 다크 모드 확장이 가능하게 이름을 의미 기반으로 유지한다.

```css
[data-theme="dark"] {
  --mg-bg-canvas: #0d1117;
  --mg-bg-page: #010409;
  --mg-bg-subtle: #161b22;
  --mg-bg-inset: #0d1117;
  --mg-fg-default: #e6edf3;
  --mg-fg-muted: #8b949e;
  --mg-border-default: #30363d;
  --mg-border-muted: #21262d;
  --mg-accent: #2f81f7;
  --mg-success: #3fb950;
  --mg-attention: #d29922;
  --mg-danger: #f85149;
  --mg-ai: #a371f7;
}
```

### 타이포그래피

GitHub 제품 UI처럼 시스템 폰트를 사용한다. 한글 가독성을 위해 Apple SD Gothic Neo와 Noto Sans KR을 폴백에 포함한다.

```css
:root {
  --mg-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", Helvetica, Arial, sans-serif;
  --mg-font-mono: ui-monospace, SFMono-Regular, SFMono, Menlo, Consolas, "Liberation Mono", monospace;

  --mg-text-xs: 12px;
  --mg-text-sm: 14px;
  --mg-text-md: 16px;
  --mg-text-lg: 20px;
  --mg-text-xl: 24px;

  --mg-line-tight: 1.25;
  --mg-line-default: 1.5;
}
```

| 스타일 | 크기 | 용도 |
|---|---:|---|
| Caption | 12px | 로그 시간, 배지, 보조 메타 |
| Body | 14px | 대부분의 UI 텍스트 |
| Command | 16px | 음성/텍스트 명령 입력 |
| Panel title | 14px, 600 | 패널 헤더 |
| Page title | 16px, 600 | Top Bar 제품명 |
| Diagram label | Mermaid 기본값 + 필요 시 14px | 노드 라벨 |

### 간격과 크기

4px 기반 스케일을 사용한다.

```css
:root {
  --mg-space-1: 4px;
  --mg-space-2: 8px;
  --mg-space-3: 12px;
  --mg-space-4: 16px;
  --mg-space-5: 24px;
  --mg-space-6: 32px;

  --mg-radius-sm: 4px;
  --mg-radius-md: 6px;
  --mg-radius-lg: 8px;

  --mg-control-sm: 28px;
  --mg-control-md: 32px;
  --mg-control-lg: 40px;
}
```

규칙:

- 주요 패널 간격: 16px
- 버튼 높이: 기본 32px, 명령 입력 관련 40px
- 카드/패널 반경: 최대 8px
- 아이콘 버튼: 32px 정사각형
- 패널 내부 리스트 행: 최소 36px

---

## 6. 주요 컴포넌트 가이드

### Top Bar

목적: 현재 앱, 세션, 내보내기 액션을 제공한다.

구성:

- 좌측: `말그림` + 작은 상태 배지 `Unsaved session` 또는 `Live`
- 중앙: 현재 다이어그램 제목 또는 빈 상태
- 우측: Mermaid 복사, PNG 내보내기, 설정

스타일:

- 높이 48px
- 하단 1px border
- 배경 `--mg-bg-canvas`
- 제품명은 16px/600

### Command Bar

목적: 음성 우선 입력과 텍스트 폴백을 같은 중요도로 제공한다.

구성:

- 마이크 토글 버튼
- 텍스트 입력창
- 전송 버튼
- 현재 상태 배지: `Idle`, `Listening`, `Thinking`, `Applying tools`, `Confirm required`

상태:

| 상태 | UI |
|---|---|
| Idle | 기본 테두리, 마이크 아이콘 |
| Listening | AI 보라색 테두리 + 작은 파형 또는 점 애니메이션 |
| Thinking | 입력 disabled, Copilot/agent 아이콘, 진행 텍스트 |
| Confirm required | 노란 배지 + 확인/취소 버튼 |
| Error | 빨간 테두리 + 짧은 오류 메시지 |

### Diagram Canvas

목적: 현재 IR이 Mermaid로 렌더링된 결과를 보여준다.

구성:

- 캔버스 툴바: Fit, Zoom in, Zoom out, Reset, Copy Mermaid
- 렌더 영역
- 빈 상태
- 렌더 실패 상태

빈 상태 문구:

```text
말하거나 입력해서 다이어그램을 시작하세요.
```

렌더 실패 상태:

- 실패 메시지
- Mermaid 원문 보기 버튼
- 마지막 정상 렌더로 돌아가기 버튼이 있으면 좋다.

### Agent + Tool Log Panel

목적: AI의 작업을 투명하게 보여준다.

로그 행 구조:

```text
[도구 아이콘] add_node
결제 실패 노드를 추가함
12:41:03 · success
```

도구별 아이콘 권장:

| 도구 | 아이콘 |
|---|---|
| `create_diagram` | project, file, apps |
| `add_node` | plus-circle |
| `connect` | arrow-right, arrow-both |
| `relabel` | pencil |
| `remove` | trash |
| `set_direction` | arrow-switch |
| `switch_type` | git-compare 또는 arrow-switch |
| `export` | download |
| `clear` | alert 또는 trash |

### Confirmation Dialog

위험 작업은 즉시 실행하지 않는다.

적용 대상:

- 전체 삭제
- 큰 범위 삭제
- 타입 전환으로 기존 구조가 많이 바뀌는 경우

문구 예시:

```text
전체 다이어그램을 삭제할까요?
이 작업은 현재 세션의 모든 노드와 연결을 제거합니다.
```

버튼:

- 취소: 기본 버튼
- 삭제: danger 버튼

### Mermaid Source Drawer

목적: 개발자/기획자가 문서에 바로 붙여넣을 수 있게 한다.

규칙:

- 기본은 접힘
- `Copy` 버튼을 항상 제공
- 코드 영역은 monospace 12px 또는 13px
- Mermaid 원문은 읽기 전용

---

## 7. 버튼과 입력 규칙

### 버튼 종류

| 종류 | 용도 | 스타일 |
|---|---|---|
| Primary | 명령 전송, 주요 확인 | 파란 배경, 흰 글자 |
| Secondary | 복사, 내보내기, 확대 | 흰 배경, 회색 테두리 |
| Invisible/Icon | 툴바의 작은 액션 | 배경 없음, hover 시 subtle |
| Danger | 삭제 확정 | 빨간 배경 또는 빨간 테두리 |
| AI | 음성 듣기/에이전트 실행 | 보라색 강조, 남용 금지 |

### 입력창

- 명령 입력은 16px로 둔다.
- placeholder는 짧게 유지한다.
- 추천 placeholder:

```text
예: 결제 실패 분기를 추가해줘
```

- 음성 인식 transcript는 입력창에 임시로 표시하되, 확정 전에는 muted 스타일로 구분한다.

---

## 8. 상태 배지

상태 배지는 작은 텍스트와 색상으로 앱의 흐름을 알려준다.

| 상태 | 배경 | 텍스트 |
|---|---|---|
| Idle | subtle | 대기 중 |
| Listening | ai-muted | 듣는 중 |
| Thinking | accent-muted | 해석 중 |
| Tooling | success-muted | 적용 중 |
| Confirm | attention-muted | 확인 필요 |
| Error | danger-muted | 오류 |

배지 규칙:

- 높이 20px 또는 24px
- 글자 12px
- 아이콘은 선택 사항
- 한 화면에서 동시에 3개 이상 상태 배지를 남발하지 않는다.

---

## 9. 다이어그램 스타일

Mermaid 기본 렌더를 사용하되, 앱 테마와 어긋나지 않게 변수만 조정한다.

### Flowchart

- 기본 방향: `TD`
- 노드 배경: 흰색
- 노드 테두리: `--mg-border-emphasis`
- 주요 시작/끝 노드: success 계열 약한 배경
- 의사결정 노드: attention 계열 약한 배경
- 실패/오류 노드: danger 계열 약한 배경

### Sequence Diagram

- 참여자 박스는 중립 배경
- 메시지는 기본 선명도 유지
- return 메시지는 muted 스타일
- 에러/실패 메시지는 danger 색상을 사용할 수 있다.

### Mermaid themeVariables 예시

```ts
const mermaidThemeVariables = {
  background: "#ffffff",
  primaryColor: "#ffffff",
  primaryBorderColor: "#8c959f",
  primaryTextColor: "#1f2328",
  lineColor: "#656d76",
  secondaryColor: "#f6f8fa",
  tertiaryColor: "#ddf4ff",
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
};
```

---

## 10. 음성 UX 규칙

음성 입력은 말그림의 핵심 차별점이다. 사용자는 앱이 듣고 있는지, 이해했는지, 적용했는지를 놓치면 안 된다.

### 음성 입력 흐름

```text
Idle → Listening → Transcript ready → Thinking → Tool calls → Render updated
```

### 피드백 원칙

- 마이크가 켜지면 Command Bar 전체가 미세하게 강조된다.
- transcript는 사용자가 방금 말한 내용으로 보이게 한다.
- 에이전트가 처리 중일 때는 캔버스를 막지 않는다.
- 도구 호출은 로그 패널에 즉시 추가한다.
- 렌더가 갱신되면 캔버스에 짧은 highlight를 준다.

### 모호한 참조 처리

예: "그 노드 이름 바꿔줘"가 여러 노드에 걸릴 때

- 에이전트가 짧게 되묻는다.
- 후보를 작은 선택 목록으로 보여준다.
- 음성으로 "결제 단계"라고 말하면 후보가 선택된다.

---

## 11. 접근성

Primer의 접근성 방향을 따른다. MVP에서도 아래는 지킨다.

- 모든 버튼은 키보드 포커스가 가능해야 한다.
- 포커스 링은 `--mg-focus`로 명확하게 보인다.
- 아이콘 단독 버튼에는 `aria-label`을 넣는다.
- 마이크 상태는 시각 정보만으로 전달하지 않고 텍스트도 함께 제공한다.
- 오류 메시지는 색상과 문구를 함께 사용한다.
- 다이어그램 렌더 영역에는 현재 Mermaid 텍스트 또는 요약을 스크린리더용으로 제공한다.
- 위험 작업 확인 다이얼로그는 focus trap을 적용한다.

---

## 12. 콘텐츠 톤

한국어 UI는 짧고 명령형으로 쓴다. 설명보다 상태와 결과를 말한다.

| 상황 | 권장 문구 | 피할 문구 |
|---|---|---|
| 빈 상태 | 말하거나 입력해서 다이어그램을 시작하세요. | 이 앱은 음성으로 다이어그램을 생성하는 혁신적인 도구입니다. |
| 듣는 중 | 듣는 중 | 현재 사용자의 음성을 인식하고 있습니다. |
| 처리 중 | 다이어그램을 바꾸는 중 | AI가 사용자의 명령을 분석하여 구조화하고 있습니다. |
| 성공 | 노드 1개를 추가했습니다. | 성공적으로 완료되었습니다. |
| 모호함 | 어떤 결제 단계를 말하나요? | 요청이 모호합니다. 다시 입력하세요. |
| 삭제 확인 | 전체 다이어그램을 삭제할까요? | 정말로 이 작업을 수행하시겠습니까? |

---

## 13. MVP 화면별 체크리스트

### 첫 화면

- [ ] 상단에 제품명과 Export 액션이 보인다.
- [ ] 명령 입력이 첫 화면에서 바로 가능하다.
- [ ] 마이크 버튼과 텍스트 입력이 같은 영역에 있다.
- [ ] 빈 캔버스가 명확히 보인다.
- [ ] 로그 패널이 비어 있어도 공간 구조가 유지된다.

### 명령 실행 중

- [ ] Listening/Thinking/Applying 상태가 구분된다.
- [ ] 입력 중에도 기존 다이어그램이 사라지지 않는다.
- [ ] 도구 호출 로그가 순서대로 쌓인다.
- [ ] 실패 시 무엇을 다시 시도할 수 있는지 보인다.

### 다이어그램 완성 후

- [ ] 캔버스가 화면 중심을 차지한다.
- [ ] Mermaid 원문 복사가 가능하다.
- [ ] PNG 또는 SVG 내보내기 액션이 보인다.
- [ ] 마지막 명령과 마지막 도구 호출 결과를 확인할 수 있다.

### 위험 작업

- [ ] 전체 삭제는 확인 전 실행되지 않는다.
- [ ] 취소가 기본 선택이다.
- [ ] 삭제 버튼은 danger 스타일이다.

---

## 14. 구현 우선순위

4시간 대회에서는 아래 순서로 구현한다.

1. CSS 토큰과 기본 레이아웃
2. Command Bar
3. Diagram Canvas
4. Tool Log Panel
5. 상태 배지와 오류 상태
6. Mermaid Source Drawer
7. 내보내기 버튼 polish
8. 반응형 보완
9. 다크 모드

다크 모드, 세밀한 애니메이션, 고급 줌 컨트롤은 핵심 데모 이후로 미룬다.

---

## 15. 구현 시 권장 파일 매핑

```text
app/globals.css
  - 디자인 토큰
  - 기본 reset
  - layout shell

components/AppShell.tsx
  - Top Bar
  - 전체 그리드

components/CommandInput.tsx
  - Command Bar
  - 음성/텍스트 상태

components/DiagramCanvas.tsx
  - Mermaid 렌더
  - 캔버스 툴바
  - 빈 상태/오류 상태

components/ToolLog.tsx
  - Agent 로그
  - 도구 호출 리스트

components/MermaidSourceDrawer.tsx
  - Mermaid 원문 보기/복사
```

---

## 16. 최종 디자인 판정 기준

말그림의 UI는 아래 질문에 모두 “예”라고 답할 수 있어야 한다.

- 사용자가 첫 화면에서 바로 명령을 말하거나 입력할 수 있는가?
- 다이어그램이 화면의 주인공인가?
- AI가 어떤 도구를 호출했는지 사용자가 확인할 수 있는가?
- 음성 인식, 처리 중, 오류, 확인 대기 상태가 명확히 구분되는가?
- GitHub 제품 UI처럼 차분하고 신뢰감 있는 작업 도구로 보이는가?
- 데모 중 실패해도 텍스트 폴백과 로그로 흐름을 회복할 수 있는가?