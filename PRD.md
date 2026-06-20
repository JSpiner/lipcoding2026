# PRD — 말그림(MalGrim) · SpeakDraw

작성일: 2026-06-20  
제품 유형: 음성 기반 다이어그램 생성/편집 웹 앱  
배포 URL: https://malgrim-web-06201224.azurewebsites.net/

## 1. 제품 요약

말그림은 사용자가 말하거나 텍스트로 입력한 자연어 명령을 다이어그램으로 변환하는 생산성 도구다. 사용자는 회의나 설계 논의 중에 "주문 처리 흐름을 플로우차트로 그려줘", "결제 뒤에 승인 단계를 추가해줘", "이걸 시퀀스 다이어그램으로 바꿔줘"처럼 말하면 앱이 Diagram IR을 갱신하고 Mermaid 다이어그램으로 렌더링한다.

핵심 가치는 다이어그램 작성의 드래그/정렬/연결 작업을 자연어 명령과 음성 입력으로 대체해, 논의 중단 없이 구조를 시각화하는 것이다.

## 2. 문제 정의

다이어그램은 설계와 기획 커뮤니케이션에 효과적이지만 작성 비용이 높다. 박스를 만들고 화살표를 잇고 라벨을 정리하는 동안 회의 흐름이 끊기며, 결국 중요한 구조가 텍스트 메모로만 남는 일이 잦다.

말그림은 "구조를 말로 설명할 수 있다"는 점에 집중한다. 사용자는 도구 조작을 배우지 않고도 말로 프로세스, 시퀀스, 분기, 수정 의도를 전달하고 즉시 시각 결과를 확인할 수 있다.

## 3. 타깃 사용자

| 사용자 | 문제 | 제공 가치 |
|---|---|---|
| 개발자/아키텍트 | 시스템 흐름, API 호출, 배포 절차를 빠르게 시각화하기 어렵다 | 음성/텍스트 명령으로 플로우차트와 시퀀스 다이어그램을 즉시 생성 |
| PM/기획자 | 업무 프로세스 문서화에 다이어그램 도구 사용 비용이 든다 | 자연어로 단계와 분기를 말하면 문서에 붙일 수 있는 다이어그램 생성 |
| 해커톤/회의 참가자 | 실시간 논의 중 시각 자료를 만들 시간이 부족하다 | 논의 흐름을 끊지 않고 바로 공유 가능한 Mermaid/SVG/PNG 산출물 확보 |

## 4. 목표와 성공 기준

### 제품 목표

- 음성 또는 텍스트 명령으로 플로우차트와 시퀀스 다이어그램을 생성한다.
- 기존 다이어그램에 노드, 연결, 분기, 피드백 루프를 증분 편집한다.
- 모델이 Mermaid를 직접 쓰지 않고, 검증된 도구 호출로 Diagram IR을 수정하게 한다.
- 생성 결과를 Mermaid 텍스트, SVG, PNG로 내보낸다.
- Azure OpenAI와 Azure Speech를 실제 기능 경로에 사용한다.
- Azure Web App 배포 URL에서 end-to-end 동작한다.

### Definition of Done

- 공개 배포 URL에서 앱 홈이 정상 로드된다.
- `/api/agent`가 자연어 명령을 받아 Diagram IR과 Mermaid를 생성한다.
- "주차장 입찰 로직 플로우차트를 생성해줘" 같은 일반 생성 요청이 빈 `flowchart TD`로 끝나지 않고 실제 단계/엣지를 포함한다.
- Azure Speech 또는 브라우저 Speech fallback으로 음성 입력을 텍스트 명령창에 반영한다.
- 음성 교정 API가 안전한 교정은 적용하고 파괴적/모호한 교정은 수동 확인 흐름을 유지한다.
- 단위 테스트와 E2E 테스트가 핵심 플로우를 검증한다.

## 5. 핵심 기능

### 5.1 다이어그램 생성

사용자는 자연어로 다이어그램 생성을 요청한다.

예시:

- "해커톤 진행 프로세스를 플로우차트로 생성해줘"
- "온라인 쇼핑몰 주문 처리 흐름을 플로우차트로 만들어줘"
- "주차장 입찰 로직 플로우차트를 생성해줘"

서버는 Azure OpenAI 기반 planner와 deterministic guard를 함께 사용해 도구 액션을 만들고, 도구 실행 결과를 Diagram IR에 반영한다.

### 5.2 증분 편집

사용자는 기존 다이어그램에 새 단계나 연결을 추가할 수 있다.

예시:

- "배포 후 데모 발표 전에 점수 측정 단계를 추가해줘"
- "요구사항 정리 전에 유저 인터뷰 단계를 넣어줘"
- "장바구니에서 수량 변경 단계를 거쳐 결제로 가게 해줘"
- "테스트 단계에서 점수를 측정하고 개선하는 사이클을 넣어줘"

도구 실행은 기존 엣지를 안전하게 재배선하고, 노드 ID에 직접 의존하지 않는 자연어 참조를 해석한다.

### 5.3 타입 전환

현재 플로우차트를 시퀀스 다이어그램으로 변환할 수 있다. 사용자는 "이걸 시퀀스 다이어그램으로 바꿔줘"처럼 요청하고, 앱은 기존 의미를 최대한 보존해 Mermaid sequence diagram으로 직렬화한다.

### 5.4 음성 입력과 교정

브라우저는 Azure Speech token을 받아 음성 인식을 우선 사용하고, 실패 시 브라우저 SpeechRecognition fallback을 사용한다. 인식 중간 결과는 명령 입력창에 실시간으로 표시된다.

최종 인식 텍스트는 `/api/correction`을 통해 교정된다. 안전한 오인식은 자동 반영하고, "전체 지어줘"처럼 파괴적 명령으로 교정될 수 있는 입력은 자동 실행하지 않고 사용자 판단을 요구한다.

### 5.5 내보내기

사용자는 생성된 다이어그램을 다음 형식으로 내보낼 수 있다.

- Mermaid 텍스트 복사
- `.mmd` 다운로드
- SVG 다운로드
- PNG 다운로드

Mermaid 렌더링에서 발생할 수 있는 canvas taint 문제를 피하기 위해 SVG를 정리하고, foreignObject 라벨을 SVG text로 변환해 내보낸 이미지에도 라벨이 유지되도록 한다.

## 6. 비기능 요구사항

| 항목 | 요구사항 |
|---|---|
| 안정성 | 모델이 Mermaid를 직접 출력하지 않고 검증된 도구 액션만 적용한다. |
| 보안 | Azure OpenAI/Speech 키는 서버 환경변수로만 보관하고 클라이언트에 장기 키를 노출하지 않는다. |
| 책임 있는 AI | 전체 삭제 등 파괴적 작업은 확인 플로우를 거친다. |
| 성능 | 음성 인식 중간 결과를 즉시 입력창에 반영하고, 교정이 늦으면 fallback 결과로 UX 지연을 줄인다. |
| 접근성 | 텍스트 입력 fallback을 제공해 마이크가 없어도 핵심 기능을 사용할 수 있다. |
| 배포 | Azure Web App에서 standalone Next.js 앱으로 운영한다. |

## 7. 시스템 아키텍처

```text
[Browser / Next.js UI]
  ├─ CommandInput: 텍스트 명령 입력
  ├─ VoiceInput: Azure Speech / browser SpeechRecognition
  ├─ DiagramCanvas: Mermaid SVG 렌더링
  └─ ExportButtons: Mermaid/SVG/PNG 내보내기
        │
        ▼
[Next.js API Routes]
  ├─ /api/agent: 명령 해석, planner 실행, Diagram IR 갱신
  ├─ /api/correction: 음성 인식 텍스트 교정
  ├─ /api/speech-token: Azure Speech 단기 토큰 발급
  └─ /api/diagram: 현재 Diagram IR 조회
        │
        ▼
[AI / Tool Layer]
  ├─ Azure OpenAI planner
  ├─ Copilot runtime metadata
  ├─ deterministic guards
  └─ diagram tools
        │
        ▼
[Diagram IR Store]
  └─ serializeDiagram(IR) → Mermaid source
```

## 8. 주요 도구 액션

| 도구 | 역할 |
|---|---|
| `create_diagram` | 빈 다이어그램 생성 |
| `create_order_flow` | 온라인 쇼핑몰 주문 흐름 템플릿 생성 |
| `create_hackathon_flow` | 해커톤 진행 프로세스 템플릿 생성 |
| `create_flow_from_steps` | 제목과 단계 목록으로 실질적인 플로우차트 생성 |
| `add_node` | 노드 추가 |
| `connect` | 노드 간 연결 추가 |
| `insert_node_between` | 두 단계 사이에 새 노드 삽입 |
| `add_feedback_cycle` | 점수 측정/개선 같은 피드백 루프 추가 |
| `relabel` | 라벨 변경 |
| `switch_type` | 플로우차트/시퀀스 타입 전환 |
| `clear` | 전체 삭제 요청 처리 |

## 9. 데이터 모델

```ts
type FlowchartIR = {
  type: "flowchart";
  direction: "TD" | "LR";
  title?: string;
  nodes: { id: string; label: string; shape?: "rect" | "round" | "diamond" }[];
  edges: { id: string; from: string; to: string; label?: string }[];
};

type SequenceIR = {
  type: "sequence";
  title?: string;
  participants: { id: string; label: string }[];
  messages: { id: string; from: string; to: string; label: string; kind?: "sync" | "async" | "return" }[];
};

type DiagramIR = FlowchartIR | SequenceIR;
```

## 10. Azure 구성

| 영역 | 서비스 | 용도 |
|---|---|---|
| 모델 추론 | Azure OpenAI | 자연어 명령을 도구 액션 계획으로 변환 |
| 음성 인식 | Azure Speech | 브라우저 음성 입력을 텍스트로 변환 |
| 배포 | Azure Web App | Next.js standalone 앱 운영 |
| 시크릿 | App Settings / 환경변수 | API 키와 배포 설정 보관 |

현재 공개 배포 URL은 `https://malgrim-web-06201224.azurewebsites.net/`이다.

## 11. 테스트 전략

- 단위 테스트: Diagram tool, planner normalization, serializer, speech correction, Azure correction fallback 검증
- E2E 테스트: 주요 사용자 명령, 음성 입력 반영, 음성 교정 UI, 내보내기, PNG/SVG 라벨 유지, 빈 flowchart 방지 검증
- 배포 스모크 테스트: 공개 URL 홈, `/api/agent`, `/api/correction` 응답 확인

## 12. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 모델이 빈 액션 또는 빈 `create_diagram`만 반환 | deterministic guard와 `create_flow_from_steps`로 생성 요청 보정 |
| 음성 인식 오타 | 규칙 기반 교정과 Azure OpenAI 보조 교정 적용 |
| 파괴적 명령 오인식 | destructive risk 분류 후 자동 적용 방지 |
| Mermaid export 보안 오류 | sanitized SVG 기반 PNG 생성 및 fallback 제공 |
| dev/build `.next` 충돌 | 배포 빌드 전 dev 서버 종료, `.next` 임시 이동 후 build 수행 |

## 13. 관련 문서

- 상세 기획 원문: [docs/PRD.md](docs/PRD.md)
- 구현 계획: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- 배포 프로세스: [docs/DEPLOYMENT_PROCESS.md](docs/DEPLOYMENT_PROCESS.md)
- 심사/검증 이력: [judge/score-history.md](judge/score-history.md)
