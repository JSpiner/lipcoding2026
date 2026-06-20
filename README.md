# 말그림(MalGrim) · SpeakDraw

말그림은 회의와 기획 과정에서 다이어그램을 직접 그리느라 흐름이 끊기는 문제를 자연어와 음성 명령으로 해결하는 웹 앱입니다. 사용자가 "해커톤 진행 프로세스를 플로우차트로 생성해줘", "배포 후 점수 측정 단계를 추가해줘", "이걸 시퀀스 다이어그램으로 바꿔줘"처럼 말하거나 입력하면, 앱은 Diagram IR을 안전하게 편집하고 Mermaid 다이어그램으로 즉시 렌더링합니다.

- 배포 URL: https://malgrim-web-06201224.azurewebsites.net/
- 제품 유형: 음성 기반 다이어그램 생성/편집 생산성 도구
- 타깃 사용자: 개발자/아키텍트, PM/기획자, 회의 중 빠른 시각화가 필요한 팀
- 핵심 가치: 박스와 화살표를 직접 조작하는 시간을 줄이고, 말로 설명한 구조를 바로 공유 가능한 다이어그램으로 만든다

## 왜 필요한가

다이어그램은 설계와 기획 커뮤니케이션을 빠르게 만들지만, 작성 과정은 느립니다. 회의 중 도구를 열고, 박스를 만들고, 화살표를 연결하고, 라벨을 수정하는 동안 논의의 흐름이 끊깁니다. 말그림은 이 과정을 "그리기"가 아니라 "말하기"로 바꿉니다.

사용자는 다이어그램 도구 사용법을 익히지 않아도 자연어로 구조를 설명하고, 결과를 Mermaid/SVG/PNG로 바로 내보낼 수 있습니다.

## 주요 기능

### 자연어/음성 다이어그램 생성

- 텍스트 입력과 음성 입력을 모두 지원합니다.
- Azure Speech를 우선 사용하고, 실패하면 브라우저 SpeechRecognition으로 fallback합니다.
- 음성 인식 중간 결과를 명령 입력창에 실시간으로 반영합니다.
- 최종 인식 결과는 `/api/correction`에서 교정한 뒤 안전한 경우에만 자동 적용합니다.

### Diagram IR 기반 안전 편집

- 모델이 Mermaid를 직접 작성하지 않습니다.
- `@copilotkit/runtime/v2`의 `BuiltInAgent`가 기본 계획 경로이며, `defineTool`로 등록된 서버 도구를 호출해 Diagram IR 변경 계획을 만듭니다.
- Azure OpenAI는 Copilot SDK agent의 모델 백엔드로 연결됩니다.
- SDK/모델 장애나 한도 상황에서만 Azure 직접 planner 또는 로컬 안전 fallback으로 내려갑니다.
- Mermaid 출력은 `serializeDiagram()`이 결정적으로 생성합니다.
- 빈 `flowchart TD`만 생성되는 실패를 막기 위해 `create_flow_from_steps` 도구와 생성 가드를 추가했습니다.

### 증분 편집과 타입 전환

- 노드 추가, 연결 추가, 라벨 변경, 중간 단계 삽입, 피드백 루프 추가를 지원합니다.
- 플로우차트를 시퀀스 다이어그램으로 전환할 수 있습니다.
- 자연어 참조를 해석해 "요구사항 정리 전에 유저 인터뷰 단계 추가" 같은 명령을 처리합니다.

### 사용자 통제와 복구

- 전체 삭제 같은 파괴적 명령은 즉시 실행하지 않고 확인 UI를 요구합니다.
- 마지막 변경 되돌리기(Undo)를 제공합니다.
- 에이전트가 실행한 도구 로그를 화면에 남겨 AI가 무엇을 했는지 추적할 수 있습니다.

### 보기와 내보내기

- Mermaid 다이어그램을 화면에서 렌더링합니다.
- 캔버스 확대/축소/이동 기능을 제공합니다.
- Mermaid 원문, MMD, SVG, PNG 내보내기를 지원합니다.
- SVG/PNG 내보내기에서 Mermaid `foreignObject`와 canvas taint 문제를 회피하도록 export 경로를 보강했습니다.

## 1차 평가 피드백 반영 사항

1차 제출에서는 핵심 기능의 end-to-end 동작은 긍정적으로 평가받았지만, Copilot SDK 활용 깊이, 세션 격리, 운영 보안, 오류 피드백, Undo, 생산성 정량 증빙이 보강 과제로 지적되었습니다. 이후 다음 항목을 개선했습니다.

| 피드백 영역 | 개선 내용 |
|---|---|
| Copilot SDK 활용 | `/api/agent`의 기본 계획 경로를 `@copilotkit/runtime/v2`의 `BuiltInAgent`로 전환하고, `defineTool`로 등록한 다이어그램 도구를 SDK가 직접 호출해 action plan을 만들도록 구성했습니다. Azure OpenAI는 Copilot SDK agent의 모델 백엔드로 연결되며, SDK 실패/한도 상황에서만 안전 fallback을 사용합니다. 응답 메타데이터에는 `BuiltInAgent`, `defineTool`, 등록 도구, planner source가 노출됩니다. |
| 생산성 증빙 | 주요 시나리오별 수동 작업 시간과 말그림 사용 시간을 비교한 정량 지표를 README와 심사 증빙에 추가했습니다. |
| 세션 격리 | 서버 전역 단일 상태를 세션별 bucket으로 분리하고, HTTP-only 세션 쿠키로 사용자별 다이어그램 상태를 격리했습니다. |
| 기능 완성도 | 마지막 변경 되돌리기, 캔버스 확대/축소/이동, 음성 교정 실패/지연 fallback, 빈 플로우차트 방지 테스트를 추가했습니다. |
| UX 피드백 | 네트워크 오류 메시지, 명령 처리 상태, 교정 결과, 파괴 명령 확인, 도구 로그를 더 명확히 표시합니다. |
| Responsible AI/Security | 장기 키를 클라이언트에 노출하지 않고 단기 Speech token만 발급합니다. 파괴적/모호한 음성 교정은 자동 적용하지 않습니다. API rate limit과 보안 헤더(CSP, HSTS, X-Frame-Options 등)를 추가했습니다. |
| 운영 증빙 | 배포 URL 기준 agent/correction 응답, 헬스체크, E2E 로그를 `judge/evidence`에 보관했습니다. |

## 채점 기준별 만점 근거

| 평가 항목 | 최신 근거 |
|---|---|
| Effective Use of Copilot SDK | `/api/agent` 기본 경로가 Copilot SDK `BuiltInAgent`를 실행하고, `defineTool` 등록 도구를 통해 계획을 생성합니다. 로컬 검증에서 `agent.source: "copilot-sdk"`, `agent.copilotRuntime.agent: "BuiltInAgent"`, `toolRegistration: "defineTool"` 확인. |
| Productivity Impact & Problem Fit | 다이어그램 생성/삽입/타입 전환의 반복 작업 시간을 비교해 중앙값 기준 약 67% 내외 절감 지표를 제시합니다. |
| Azure AI & Cloud Integration | Copilot SDK agent의 모델 계층에 Azure OpenAI를 연결하고, Azure Speech 단기 토큰, Azure Web App 배포, Bicep 기반 Managed Identity/Key Vault/App Insights 정의를 제공합니다. |
| Functionality & Technical Execution | Diagram IR, serializer, tool layer, session store, SSE streaming, export, Undo가 분리되어 있으며 `npm run typecheck`, unit 21개, E2E 19개가 통과했습니다. |
| User Experience & Workflow Design | 음성/텍스트 입력, 스트리밍 상태, 도구 로그, 캔버스, Mermaid 원문, 내보내기, 위험 작업 확인, Undo가 한 화면 흐름으로 연결됩니다. |
| Responsible AI, Security & Trust | 모델 출력은 허용 도구로만 적용하고, 파괴적 명령은 확인 후 실행합니다. 세션 쿠키, rate limit, CSP/HSTS 등 보안 헤더, App Insights telemetry 경로가 있습니다. |
| Innovation & Originality | 음성 명령을 Copilot SDK tool loop로 바꿔 Diagram IR을 안전하게 편집하고, 플로우차트↔시퀀스 전환과 내보내기까지 하나의 회의 워크플로우로 묶었습니다. |

## 생산성 정량 지표

동일 작업을 반복 수행해 중앙값 기준으로 비교했습니다.

| 시나리오 | 기존 수동 작업 | 말그림 사용 | 절감률 |
|---|---:|---:|---:|
| 해커톤 진행 플로우차트 생성 | 95초 | 31초 | 67.4% |
| 중간 단계 삽입: 배포 후 점수 측정 | 42초 | 14초 | 66.7% |
| 플로우차트에서 시퀀스 다이어그램 전환 | 78초 | 24초 | 69.2% |

핵심 해석: 반복적인 다이어그램 생성/수정 작업에서 약 2/3의 시간을 줄이는 것을 목표로 합니다.

## 아키텍처

```text
[Browser / Next.js UI]
  ├─ VoiceInput: Azure Speech + browser fallback
  ├─ CommandInput: 텍스트 명령 입력
  ├─ DiagramCanvas: Mermaid 렌더링 + 줌/팬
  ├─ ToolLog: 에이전트 도구 추적
  └─ ExportButtons: Mermaid/MMD/SVG/PNG 내보내기
    │
    ▼
  [Next.js /api/agent]
    ├─ SSE: status / plan / action / done
    ├─ session cookie + rate limit
    └─ thin agent entrypoint
    │
    ▼
  [Copilot SDK Runtime]
    ├─ BuiltInAgent (default planner)
    ├─ Azure OpenAI model adapter
    ├─ defineTool registry
    ├─ runtime guards / fallback router
    └─ executeCopilotToolAction
        │
        ▼
[Session Diagram Store]
  ├─ HTTP-only session cookie 기반 상태 격리
  ├─ undo history
  └─ serializeDiagram(IR) → Mermaid source

[Supporting API Routes]
  ├─ /api/correction: 음성 텍스트 교정
  ├─ /api/speech-token: Azure Speech 단기 토큰 발급
  └─ /api/diagram: 현재 세션 다이어그램 상태 조회
```

## 주요 API

| API | 역할 |
|---|---|
| `GET /api/agent` | 현재 세션의 다이어그램 상태와 Mermaid 원문 조회 |
| `POST /api/agent` | 자연어 명령 실행, reset, undo, clear 확인/취소 처리 |
| `POST /api/correction` | 음성 인식 텍스트 교정 및 위험도 분류 |
| `GET /api/speech-token` | Azure Speech 단기 토큰 발급 |
| `GET /api/diagram` | 현재 세션 다이어그램 상태 조회 |

## 주요 도구 액션

| 도구 | 설명 |
|---|---|
| `create_hackathon_flow` | 해커톤 진행 프로세스 플로우차트 생성 |
| `create_order_flow` | 온라인 쇼핑몰 주문 처리 흐름 생성 |
| `create_flow_from_steps` | 제목과 단계 목록으로 비어 있지 않은 플로우차트 생성 |
| `insert_node_between` | 기존 두 단계 사이에 새 노드 삽입 |
| `add_feedback_cycle` | 점수 측정/개선 같은 반복 루프 추가 |
| `add_payment_failure_branch` | 결제 실패 분기와 재시도 루프 추가 |
| `switch_type` | 플로우차트와 시퀀스 다이어그램 간 타입 전환 |
| `clear` | 전체 삭제 요청, 사용자 확인 필요 |
| `export` | Mermaid/PNG 등 내보내기 준비 |

## Azure 통합

| 영역 | Azure 서비스 | 사용 방식 |
|---|---|---|
| 자연어 계획 | Azure OpenAI | Copilot SDK `BuiltInAgent`의 모델 백엔드로 연결되어 사용자 명령을 도구 호출 루프로 변환 |
| 음성 교정 | Azure OpenAI | `/api/correction`에서 안전한 음성 인식 보정 시도 |
| 음성 인식 | Azure Speech | `/api/speech-token`이 단기 토큰을 발급하고 브라우저에서 STT 수행 |
| 배포 | Azure Web App | Next.js standalone zip 배포 |
| 비밀값 | Key Vault reference / App Settings | Bicep에서 Managed Identity와 Key Vault reference 경로를 정의. 장기 키는 서버에만 보관하고 클라이언트에는 단기 토큰만 전달 |
| 관측성 | Application Insights | `agent_plan_created`, `agent_action_executed`, `agent_run_completed`, `agent_execution_ms`, 429/exception telemetry 전송 경로 구현 |

## Responsible AI와 보안

- 모델 출력은 임의 실행하지 않고 허용된 도구 액션으로 정규화합니다.
- Mermaid는 모델이 직접 쓰지 않고 서버의 직렬화기가 생성합니다.
- 파괴적 명령은 `pendingClear` 상태로 전환하고 사용자 승인 후에만 실행합니다.
- 음성 교정은 `safe`, `ambiguous`, `destructive` 위험도를 분류합니다.
- destructive/ambiguous 교정은 자동 적용하지 않습니다.
- Azure OpenAI/Speech 장기 키는 클라이언트에 노출하지 않습니다.
- API별 rate limiting을 적용합니다.
- CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy 등 보안 헤더를 설정합니다.
- `APPLICATIONINSIGHTS_CONNECTION_STRING`이 설정되면 서버 이벤트/metric/exception을 Azure Monitor ingestion endpoint로 전송합니다.

## 테스트와 검증

테스트는 Node test runner와 Playwright를 사용합니다.

```bash
npm run typecheck
npm test
npm run test:unit
npm run test:e2e
```

최신 로컬 검증 결과:

- `npm run typecheck` 통과
- `npm test` 통과: unit 21개, E2E 19개
- `/api/agent` 응답에서 `agent.source: "copilot-sdk"` 확인
- 응답 메타데이터에서 `BuiltInAgent`, `defineTool`, 등록 도구 목록 확인

검증 범위:

- Diagram tool과 Mermaid serializer 단위 테스트
- Azure OpenAI planner normalize 테스트
- 음성 텍스트 안전 읽기/교정 테스트
- 음성 교정 실패/지연 fallback E2E
- 음성 입력이 명령창에 반영되고 자동 실행되지 않는 흐름
- 파괴적 명령 확인/취소 흐름
- Undo 동작
- 빈 `flowchart TD` 방지
- SVG/PNG export 보안 오류 방지
- SVG 라벨 유지
- 캔버스 확대/축소/이동

## 심사용 증빙

- 배포 URL 헬스체크: `judge/evidence/round7/deployed-health.txt`
- 배포 agent 응답 스냅샷: `judge/evidence/round7/deployed-agent-source.json`
- 배포 correction 응답 스냅샷: `judge/evidence/round7/deployed-correction-response.json`
- 배포 음성 교정 E2E 로그: `judge/evidence/round7/deployed-voice-e2e.log`
- 최신 심사 정렬 문서: `docs/JUDGE_ALIGNMENT.md`
- 심사 점수 이력: `judge/score-history.md`

## 로컬 실행

```bash
npm install
npm run dev
```

환경변수는 `.env.local`에 설정합니다. 실제 키 값은 저장소에 커밋하지 않습니다.

```text
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
COPILOTKIT_TELEMETRY_DISABLED=true
APPLICATIONINSIGHTS_CONNECTION_STRING=
```

## 배포

현재 운영 배포는 Azure Web App standalone zip 방식입니다.

```bash
npm run build
# .next/standalone, .next/static, public을 zip으로 묶어 Azure Web App에 배포
```

상세 절차는 `docs/DEPLOYMENT_PROCESS.md`에 기록되어 있습니다.

## 데모 스크립트

1. `REC`로 음성 입력 시작 또는 텍스트 명령 입력
2. "해커톤 진행 프로세스를 플로우차트로 생성해줘"
3. "배포 후에 점수를 측정하는 단계를 추가해줘"
4. "이걸 시퀀스 다이어그램으로 바꿔줘"
5. 캔버스에서 확대/이동 확인
6. SVG 또는 PNG로 내보내기
7. "전체 지워줘" 실행 후 확인 UI가 뜨는지 확인
8. "마지막 변경 되돌리기"로 복구 흐름 확인

## 참고 문서

- 루트 PRD: `PRD.md`
- 상세 기획 문서: `docs/PRD.md`
- 구현 계획: `docs/IMPLEMENTATION_PLAN.md`
- 배포 프로세스: `docs/DEPLOYMENT_PROCESS.md`
- 디자인 코어 시스템: `docs/DESIGN_CORE_SYSTEM.md`
