# PRD — 말그림(MalGrim) · SpeakDraw

작성일: 2026-06-20
제품 유형: 음성 기반 다이어그램 생성/편집 웹 앱
배포 URL: https://malgrim-web-06201224.azurewebsites.net/

## 1. 제품 요약

말그림은 자연어/음성 명령으로 다이어그램을 생성·편집하는 생산성 도구다.
핵심은 Copilot SDK 중심 에이전트 루프다. 사용자 명령은 `@copilotkit/runtime/v2`의 `BuiltInAgent`가 Azure OpenAI model adapter와 `defineTool` 등록 도구를 사용해 계획(plan) 수립, 가드 적용, 도구 실행(action), 완료(done)까지 처리하고 Mermaid로 렌더링된다.

## 2. 문제 정의

회의나 설계 논의 중 다이어그램을 직접 그리면 흐름이 끊긴다. 박스/화살표 조작 비용 때문에 논의가 지연되고, 구조 정보가 텍스트로만 남는다.

말그림은 이 문제를 말하기 중심 인터랙션으로 해결한다.

## 3. 타깃 사용자

| 사용자 | 문제 | 제공 가치 |
|---|---|---|
| 개발자/아키텍트 | 시스템 흐름 시각화 비용이 높음 | 음성/텍스트 명령으로 즉시 플로우차트/시퀀스 생성 |
| PM/기획자 | 프로세스 다이어그램 작성 시간이 큼 | 자연어로 단계/분기 생성 후 즉시 문서화 |
| 해커톤 참가자 | 빠른 데모 시각화 필요 | 말만으로 다이어그램 생성/편집/내보내기 |

## 4. 목표와 성공 기준

### 제품 목표

- 음성/텍스트 명령으로 플로우차트와 시퀀스 다이어그램 생성
- 증분 편집(삽입/연결/라벨 변경/타입 전환)
- 모델이 Mermaid를 직접 생성하지 않고 도구 액션만 실행
- Mermaid, SVG, PNG 내보내기
- Azure OpenAI/Azure Speech 실제 기능 경로 사용

### Definition of Done

- 배포 URL에서 end-to-end 동작
- `/api/agent`가 Copilot Runtime 중심 루프로 명령을 처리
- `/api/agent` 기본 경로에서 `agent.source="copilot-sdk"`, `BuiltInAgent`, `defineTool` 메타데이터 확인 가능
- `/api/agent` 스트리밍 이벤트(status/plan/action/done) 동작
- 파괴적 명령 확인/취소 및 Undo 제공
- 단위 테스트 + E2E 테스트 통과

## 5. 핵심 기능

### 5.1 다이어그램 생성

예시 명령:
- 해커톤 진행 프로세스를 플로우차트로 생성해줘
- 온라인 쇼핑몰 주문 처리 흐름을 플로우차트로 만들어줘
- 주차장 입찰 로직 플로우차트를 생성해줘

### 5.2 증분 편집

예시 명령:
- 요구사항 정리 전에 유저 인터뷰 단계를 추가해줘
- 배포 후 데모 발표 전에 점수 측정 단계를 추가해줘
- 테스트 단계에 점수 측정/개선 사이클을 추가해줘

### 5.3 타입 전환

현재 다이어그램을 플로우차트↔시퀀스로 전환한다.

### 5.4 음성 입력과 교정

Azure Speech 토큰 기반 인식을 우선 사용하고, 실패 시 브라우저 fallback을 사용한다.
최종 텍스트는 교정 API를 거치며 위험한 교정은 자동 적용하지 않는다.

### 5.5 내보내기

COPY, MMD, SVG, PNG 내보내기를 지원한다.

## 6. Copilot SDK 중심 아키텍처

```text
[Browser / Next.js UI]
  ├─ VoiceInput / CommandInput
  ├─ DiagramCanvas / ExportButtons
  └─ Stream status UI
        │
        ▼
[API /agent]
  ├─ session + rate limit
  ├─ SSE: status/plan/action/done
  └─ Agent thin entrypoint
        │
        ▼
[Copilot Runtime Loop (central)]
  ├─ BuiltInAgent (default planner)
  ├─ Azure OpenAI model adapter
  ├─ defineTool registry
  ├─ planWithCopilotRuntime
  ├─ runtime guards + fallback router
  ├─ executeCopilotToolAction
  └─ tool logs
        │
        ▼
[Diagram IR Store]
  └─ serializeDiagram(IR) → Mermaid
```

## 7. 주요 도구 액션

- create_diagram
- create_order_flow
- create_hackathon_flow
- create_flow_from_steps
- add_node
- insert_node_between
- connect
- relabel
- add_feedback_cycle
- switch_type
- export
- clear

## 8. 비기능 요구사항

- 안정성: Copilot 런타임이 계획/검증/실행 순서를 통제
- 보안: 시크릿은 서버 환경변수/Key Vault reference 사용
- 신뢰: 파괴적 명령 확인 + Undo + 실행 로그
- 운영성: rate limit, 보안 헤더, App Insights telemetry, 배포 스모크 체크

## 9. Azure 구성

- Azure OpenAI: 계획 추론
- Copilot SDK: `BuiltInAgent` + `defineTool` 기반 에이전트 실행 중심
- Azure Speech: 음성 인식
- Azure Web App: 서비스 배포
- Key Vault + Managed Identity: 시크릿 접근(Cloud-Native 경로)
- App Insights: 관측성(지연/오류/429 지표)

## 10. 테스트 전략

- 단위 테스트: planner normalization, tool behavior, serializer, speech correction
- E2E 테스트: 생성/편집/타입전환/음성/교정/내보내기/Undo/회귀
- 배포 스모크: 홈 + `/api/agent` + `/api/correction` + `/api/speech-token`

## 11. 관련 문서

- 상세 기획: docs/PRD.md
- 구현 계획: docs/IMPLEMENTATION_PLAN.md
- 배포 절차: docs/DEPLOYMENT_PROCESS.md
- Cloud-Native 체크리스트: docs/CLOUD_NATIVE_CHECKLIST.md
- 심사 정렬 근거: docs/JUDGE_ALIGNMENT.md
- 점수 이력: judge/score-history.md
