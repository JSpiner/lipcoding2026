# 디자인 코어 시스템 — 말그림(MalGrim)

> 기준 문서: [docs/PRD.md](PRD.md)  
> 테마 방향: **Neo Brutalism / Raw Product UI**
> 적용 범위: UI 시각 언어, 레이아웃, 상태 표현, 컴포넌트 규칙. 이 문서는 디자인 기준만 정의하며 앱 구현 파일을 직접 변경하지 않는다.

---

## 1. 디자인 선언

말그림은 조용한 SaaS 대시보드가 아니다. 사용자가 말하면 구조가 즉시 화면에 찍히는 도구다. 따라서 UI도 부드럽고 숨는 인터페이스보다, **강한 선, 평면 색, 큰 대비, 즉각적인 상태 변화**를 가진 네오 브루털리즘으로 간다.

핵심 이미지는 다음과 같다.

```text
말이 떨어진다 -> 박스가 꽂힌다 -> 선이 연결된다 -> 로그가 찍힌다
```

제품은 거칠게 보여도 조잡하면 안 된다. 말그림의 브루털리즘은 장식적 유행이 아니라, 음성 명령과 AI 도구 호출을 사용자가 놓치지 않게 만드는 **고대비 작업 인터페이스**다.

---

## 2. 디자인 원칙

### 2.1 Raw First

렌더링된 다이어그램, Mermaid 원문, 도구 호출 로그를 숨기지 않는다. AI가 바꾼 구조가 그대로 보이는 것이 말그림의 신뢰다.

### 2.2 Loud State

`듣는 중`, `해석 중`, `도구 적용 중`, `확인 필요`, `오류`는 작은 색 점으로 처리하지 않는다. 배경색, 굵은 테두리, 라벨, 움직임으로 강하게 드러낸다.

### 2.3 Hard Geometry

둥근 SaaS 카드 감성을 피한다. 사각형, 굵은 경계선, 분명한 그리드, 단단한 버튼을 사용한다.

### 2.4 Useful Brutality

모든 과격한 스타일은 기능을 설명해야 한다. 그림자, 색상, 두꺼운 선은 사용자의 다음 행동을 빠르게 찾게 만들 때만 쓴다.

### 2.5 Voice Stage

음성 입력 영역은 보조 폼이 아니라 무대다. 마이크 상태와 transcript는 캔버스만큼 중요하게 보인다.

---

## 3. 시각 키워드

| 키워드 | 의미 | 적용 |
|---|---|---|
| Brutal | 숨기지 않는 구조 | 굵은 테두리, 명확한 패널 분할 |
| Fast | 즉각적인 반응 | 상태 전환, 로그 append, 캔버스 highlight |
| Mechanical | 도구 호출의 기계적 신뢰 | tool log를 터미널 출력처럼 표시 |
| Playful | 말하면 그려지는 재미 | 강한 포인트 컬러, 눌리는 버튼, 큰 빈 상태 |
| Legible | 회의 중 빠른 판독 | 높은 대비, 큰 명령 입력, 짧은 문구 |

---

## 4. 화면 구조

첫 화면은 랜딩 페이지가 아니라 작업대다. 네오 브루털리즘의 강한 구획감을 이용해 기능을 한 번에 드러낸다.

```text
+============================================================+
| MALGRIM / SPEAKDRAW              LIVE SESSION      EXPORT  |
+============================================================+
| MIC COMMAND STRIP                                          |
| [REC]  결제 실패 분기를 추가해줘                    [RUN]  |
+======================================+=====================+
|                                      | AGENT TRACE         |
| DIAGRAM CANVAS                       | > create_diagram    |
| bold border                          | > add_node          |
| flat nodes                           | > connect           |
|                                      |                     |
+======================================+=====================+
| MERMAID SOURCE / COLLAPSED RAW OUTPUT                      |
+============================================================+
```

### 데스크톱

- 전체 높이는 `100dvh`.
- 상단 바 56px, 명령 스트립 76px, 하단 raw drawer 160px 이하.
- 캔버스와 로그 패널은 굵은 경계선으로 나눈다.
- 로그 패널 권장 폭은 `380px`.
- 패널 사이 여백을 크게 두지 않는다. 선으로 구획한다.

### 좁은 화면

- 로그 패널은 하단 raw drawer와 합쳐 탭으로 전환한다.
- 명령 스트립은 2줄 허용.
- 마이크 버튼과 실행 버튼은 항상 보인다.

### 모바일

- MVP에서는 완전한 모바일 UX보다 깨지지 않는 구조를 우선한다.
- 캔버스, 명령, 로그를 세로로 쌓는다.
- 가로 스크롤을 허용하되 버튼과 입력은 viewport 안에 고정한다.

---

## 5. 색상 시스템

부드러운 단색 팔레트가 아니라 **고대비 잉크 + 종이 + 형광 포인트**를 사용한다. 기본 배경은 완전 흰색보다 약간 따뜻한 종이색을 쓴다.

### 핵심 팔레트

```css
:root {
  --mg-paper: #fff7d6;
  --mg-paper-strong: #ffef9f;
  --mg-ink: #111111;
  --mg-ink-soft: #2b2b2b;
  --mg-white: #ffffff;

  --mg-blue: #00a3ff;
  --mg-green: #20e070;
  --mg-yellow: #ffe14d;
  --mg-red: #ff3b30;
  --mg-pink: #ff4fd8;
  --mg-purple: #8b5cf6;

  --mg-border: #111111;
  --mg-shadow: #111111;
  --mg-muted: #6f6a5f;

  --mg-bg-page: var(--mg-paper);
  --mg-bg-panel: var(--mg-white);
  --mg-fg-default: var(--mg-ink);
  --mg-fg-muted: var(--mg-muted);
}
```

### 상태 색상

| 상태 | 색상 | 사용 방식 |
|---|---|---|
| 기본 액션 | `--mg-blue` | 실행 버튼, 링크, 포커스 |
| 듣는 중 | `--mg-pink` | 마이크 스트립 배경, REC 배지 |
| 해석 중 | `--mg-purple` | 에이전트 진행 상태 |
| 도구 적용 성공 | `--mg-green` | 성공 로그, 완료 배지 |
| 확인 필요 | `--mg-yellow` | 위험 작업 확인 패널 |
| 오류/삭제 | `--mg-red` | 삭제 버튼, 렌더 실패, STT 실패 |

### 금지

- 유리 효과, blur overlay, 반투명 card 남용 금지
- 은은한 회색 위주의 GitHub 기본 테마로 회귀 금지
- 보라색 그라데이션 AI 배경 금지
- 상태를 색상 하나로만 전달 금지. 텍스트와 아이콘을 함께 둔다.

---

## 6. 테두리와 그림자

네오 브루털리즘의 핵심은 물리적인 면이다. 모든 주요 UI는 선과 그림자로 눌렀을 때의 감각을 만든다.

```css
:root {
  --mg-border-width: 3px;
  --mg-border-width-heavy: 4px;
  --mg-shadow-hard: 6px 6px 0 var(--mg-shadow);
  --mg-shadow-hard-sm: 3px 3px 0 var(--mg-shadow);
  --mg-shadow-none: 0 0 0 transparent;
  --mg-radius-none: 0;
  --mg-radius-sm: 2px;
}
```

규칙:

- 주요 패널: `3px solid #111`, shadow `6px 6px 0 #111`
- 버튼: `3px solid #111`, shadow `3px 3px 0 #111`
- 버튼 active: `transform: translate(3px, 3px)`, shadow 제거
- 모달/확인 패널: `4px solid #111`, shadow `8px 8px 0 #111`
- radius는 0 또는 2px만 사용한다.

---

## 7. 타이포그래피

부드러운 앱 폰트보다 간판 같은 명확함을 우선한다. 한글 가독성은 유지하되 제목과 버튼은 강하게 보인다.

```css
:root {
  --mg-font-sans: "Arial", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
  --mg-font-display: "Arial Black", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
  --mg-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --mg-text-xs: 12px;
  --mg-text-sm: 14px;
  --mg-text-md: 16px;
  --mg-text-lg: 20px;
  --mg-text-xl: 28px;
  --mg-text-xxl: 40px;
}
```

| 스타일 | 크기 | 굵기 | 용도 |
|---|---:|---:|---|
| App title | 20px | 900 | 상단 제품명 |
| Command text | 18px | 700 | 음성/텍스트 명령 |
| Panel title | 14px | 900 | 패널 헤더 |
| Body | 14px | 600 | 기본 UI |
| Caption | 12px | 700 | 로그 메타, 상태 |
| Raw code | 13px | 500 | Mermaid source, tool payload |

규칙:

- 제목은 모두 대문자 영문 또는 짧은 한글 명사형 사용 가능.
- letter-spacing은 0으로 둔다.
- 본문은 너무 두껍게 만들지 않는다. 중요한 라벨과 버튼에만 800 이상을 쓴다.
- UI 내부에서 긴 설명문을 쓰지 않는다.

---

## 8. 간격과 그리드

브루털리즘은 헐겁게 흩어지면 지저분해진다. 그리드는 엄격하게 둔다.

```css
:root {
  --mg-space-1: 4px;
  --mg-space-2: 8px;
  --mg-space-3: 12px;
  --mg-space-4: 16px;
  --mg-space-5: 24px;
  --mg-space-6: 32px;
  --mg-control-md: 40px;
  --mg-control-lg: 52px;
}
```

규칙:

- 패널 안쪽 padding: 16px
- 패널 사이 간격: 12px 또는 굵은 border로 직접 분리
- Command Strip 높이: 72px 이상
- 로그 행 높이: 최소 44px
- 아이콘 버튼: 40px 정사각형
- 캔버스 툴바 버튼: 36px 이상

---

## 9. 컴포넌트 가이드

### 9.1 Top Bar

역할: 앱의 간판이자 현재 세션 상태 표시.

스타일:

- 배경 `--mg-ink`
- 텍스트 `--mg-paper`
- 높이 56px
- 하단 `4px solid --mg-border`
- 제품명은 `MALGRIM / 말그림`처럼 강하게 표기

구성:

- 좌측: 제품명
- 중앙: 현재 다이어그램 제목
- 우측: `COPY`, `EXPORT PNG`, `SETTINGS`

### 9.2 Command Strip

역할: 앱에서 가장 강한 인터랙션 영역. 사용자가 말하고, transcript를 보고, 실행하는 곳.

스타일:

- 배경 기본 `--mg-yellow`
- Listening 상태 `--mg-pink`
- Thinking 상태 `--mg-purple` + 흰 글자
- `4px solid --mg-border`
- 내부 입력은 흰 배경, 굵은 테두리

상태별 예시:

```text
[REC] 듣는 중       "온라인 쇼핑몰 주문 흐름을 그려줘"       [STOP]
[AI]  해석 중       create_diagram 준비 중                    [...]
[OK]  적용 완료     노드 4개, 연결 3개 추가                   [RUN]
```

### 9.3 Diagram Canvas

역할: 현재 다이어그램의 무대.

스타일:

- 흰 배경
- `4px solid --mg-border`
- shadow `6px 6px 0 --mg-shadow`
- 빈 상태에서는 중앙에 큰 문구 대신 짧은 명령 예시 1개만 둔다.

빈 상태:

```text
말하면 여기에 그려집니다.
```

렌더 갱신:

- 캔버스 외곽을 `--mg-green`으로 300ms flash
- 레이아웃 크기는 흔들리지 않게 유지

### 9.4 Agent Trace Panel

역할: AI가 실제로 수행한 작업의 블랙박스를 없앤다.

스타일:

- 터미널과 영수증 사이 느낌
- 배경 `--mg-ink`
- 텍스트 `--mg-green` 또는 `--mg-paper`
- 로그 행은 monospace 사용 가능
- 각 tool call은 번호를 붙인다.

예시:

```text
01 > create_diagram(flowchart)  OK
02 > add_node("장바구니")       OK
03 > connect(n1, n2)            OK
04 > relabel("장바구니")       OK
```

### 9.5 Raw Mermaid Drawer

역할: 산출물을 숨기지 않고 바로 복사 가능하게 한다.

스타일:

- 하단 접힘 패널
- 흰 배경 또는 검정 배경 중 하나로 고정
- 코드 영역은 `--mg-font-mono`
- `COPY RAW` 버튼을 우측 상단 고정

### 9.6 Confirmation Dialog

위험 작업은 가장 강하게 보여야 한다.

스타일:

- 배경 `--mg-yellow`
- `4px solid --mg-border`
- shadow `8px 8px 0 --mg-shadow`
- 제목은 20px/900
- 삭제 버튼은 `--mg-red`

문구:

```text
전체 다이어그램을 삭제할까요?
현재 세션의 모든 노드와 연결이 사라집니다.
```

버튼 순서:

```text
[취소] [삭제]
```

취소를 기본 포커스로 둔다.

---

## 10. 버튼 규칙

버튼은 누를 수 있는 물체처럼 보여야 한다.

```css
.mg-button {
  border: 3px solid #111;
  box-shadow: 3px 3px 0 #111;
  border-radius: 0;
  font-weight: 900;
  min-height: 40px;
}

.mg-button:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}
```

| 종류 | 배경 | 용도 |
|---|---|---|
| Primary | `--mg-blue` | RUN, 주요 실행 |
| Voice | `--mg-pink` | REC, STOP |
| Success | `--mg-green` | 완료, 복사 성공 |
| Warning | `--mg-yellow` | 확인 필요 |
| Danger | `--mg-red` | 삭제, 실패 |
| Plain | `--mg-white` | 보조 액션 |

아이콘 버튼도 텍스트 버튼과 같은 물리감을 가져야 한다. 툴팁 또는 `aria-label`은 필수다.

---

## 11. 입력 규칙

명령 입력은 일반 폼이 아니라 prompt box다.

```css
.mg-command-input {
  border: 3px solid #111;
  background: #fff;
  color: #111;
  min-height: 52px;
  font-size: 18px;
  font-weight: 700;
}
```

placeholder:

```text
예: 결제 실패 분기를 추가해줘
```

규칙:

- transcript 임시 텍스트는 기울임보다 배경색 차이로 구분한다.
- disabled 상태에서도 텍스트 대비를 충분히 유지한다.
- 포커스는 `outline: 4px solid --mg-blue`처럼 강하게 보인다.

---

## 12. 상태 표현

상태는 배지가 아니라 작은 표지판처럼 보이게 한다.

| 상태 | 라벨 | 배경 | 테두리 |
|---|---|---|---|
| 대기 | `IDLE` | white | ink |
| 듣는 중 | `REC` | pink | ink |
| 해석 중 | `AI RUNNING` | purple | ink |
| 도구 적용 | `APPLYING` | blue | ink |
| 완료 | `DONE` | green | ink |
| 확인 필요 | `CONFIRM` | yellow | ink |
| 오류 | `ERROR` | red | ink |

규칙:

- 상태 라벨은 12px/900.
- 가능한 영문 대문자 + 짧은 한글 보조 텍스트 조합을 쓴다.
- 색상만으로 의미를 전달하지 않는다.

---

## 13. 다이어그램 스타일

Mermaid 결과도 앱 테마와 맞아야 한다. 기본 Mermaid의 부드러운 느낌을 줄이고 노드와 선을 강하게 만든다.

### Flowchart

- 노드 fill: `#ffffff`
- 노드 stroke: `#111111`
- stroke width: `3px`
- edge stroke: `#111111`
- decision node fill: `#ffe14d`
- error/failure node fill: `#ffb3ad`
- success/end node fill: `#b6f7c8`

### Sequence Diagram

- participant fill: `#fff7d6`
- participant border: `#111111`
- actor line: `#111111`
- message line: `#111111`
- note fill: `#ffe14d`

예시:

```ts
const mermaidThemeVariables = {
  background: "#fff7d6",
  primaryColor: "#ffffff",
  primaryBorderColor: "#111111",
  primaryTextColor: "#111111",
  lineColor: "#111111",
  secondaryColor: "#ffe14d",
  tertiaryColor: "#20e070",
  fontFamily: "Arial, Apple SD Gothic Neo, Noto Sans KR, sans-serif",
};
```

---

## 14. 음성 UX

음성은 말그림의 주연이다. 마이크가 켜졌는지 작게 보여주면 안 된다.

### 흐름

```text
IDLE -> REC -> TRANSCRIPT -> AI RUNNING -> APPLYING -> DONE
```

### 피드백

- REC 상태에서는 Command Strip 전체 색이 바뀐다.
- transcript는 입력창 안에 크게 표시한다.
- AI 처리 중에는 Agent Trace Panel의 새 줄이 즉시 추가된다.
- 도구 적용이 끝나면 캔버스가 짧게 flash된다.
- 음성 인식 실패는 Command Strip에서 바로 복구 액션을 제공한다.

### 모호한 참조

예: "그 노드 이름 바꿔줘"

UI는 후보를 작은 카드가 아니라 굵은 선택 행으로 보여준다.

```text
어떤 노드인가요?
[1] 결제
[2] 결제 실패
[3] 결제 재시도
```

---

## 15. 콘텐츠 톤

짧고 세게 쓴다. 설명하지 말고 상태를 말한다.

| 상황 | 권장 문구 | 피할 문구 |
|---|---|---|
| 빈 상태 | 말하면 여기에 그려집니다. | 이 영역은 생성된 다이어그램을 표시합니다. |
| 듣는 중 | 듣는 중 | 현재 사용자의 음성을 인식하고 있습니다. |
| 처리 중 | 구조를 짜는 중 | AI가 사용자의 명령을 분석하고 있습니다. |
| 성공 | 노드 1개 추가 | 성공적으로 작업이 완료되었습니다. |
| 모호함 | 어떤 노드인가요? | 요청이 모호합니다. |
| 삭제 확인 | 전체 삭제할까요? | 정말로 이 작업을 수행하시겠습니까? |
| 오류 | 렌더 실패 | Mermaid 렌더링 중 오류가 발생했습니다. |

---

## 16. 접근성

브루털리즘이어도 접근성은 낮아지면 안 된다. 강한 시각 언어를 접근성의 장점으로 사용한다.

- 모든 버튼은 키보드 포커스 가능.
- 포커스 링은 4px 이상으로 명확하게 표시.
- 아이콘 단독 버튼은 `aria-label` 필수.
- REC, ERROR, CONFIRM 같은 상태는 텍스트로도 제공.
- 빨강/초록 구분에만 의존하지 않는다.
- Confirmation Dialog는 focus trap을 적용.
- Mermaid raw text 또는 요약을 스크린리더용으로 제공.
- 애니메이션은 300ms 이하로 짧게 유지하고, `prefers-reduced-motion`을 존중한다.

---

## 17. 구현 우선순위

Markdown 기준의 디자인 목표이며, 구현 시에는 아래 순서로 적용한다.

1. CSS 토큰 교체
2. 전체 shell의 굵은 border/grid 적용
3. Command Strip 네오 브루털 스타일 적용
4. Button active 물리 효과 적용
5. Agent Trace Panel을 터미널형 로그로 변경
6. Diagram Canvas border/shadow/flash 적용
7. Confirmation Dialog danger 스타일 적용
8. Mermaid themeVariables 조정
9. 반응형 보완

---

## 18. 최종 판정 기준

아래 질문에 모두 “예”라고 답해야 한다.

- 첫 화면이 랜딩 페이지가 아니라 작업대처럼 보이는가?
- 말하기/입력하기 영역이 가장 강하게 보이는가?
- 패널과 버튼이 굵은 선, 강한 색, 단단한 그림자로 구성되어 있는가?
- AI 도구 호출 로그가 숨겨지지 않고 강하게 드러나는가?
- 상태 변화가 회의 중 멀리서 봐도 구분되는가?
- 과한 장식 없이 실제 작업 흐름을 빠르게 만드는가?
- 네오 브루털리즘이 조잡함이 아니라 의도된 시스템으로 보이는가?
