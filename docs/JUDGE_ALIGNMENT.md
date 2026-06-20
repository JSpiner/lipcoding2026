# Judge Alignment Evidence

이 문서는 이전 피드백과 채점 기준을 기준으로 말그림이 어떤 근거를 제시하는지 정리한다.

## 1. Effective Use of Copilot SDK

이전 약점: Copilot SDK가 의존성/메타데이터 수준에 머물고, 실제 플래닝과 도구 실행은 직접 Azure OpenAI 호출과 자체 분기 로직이 담당한다는 평가.

최신 개선:

- `/api/agent` 기본 계획 경로를 `@copilotkit/runtime/v2`의 `BuiltInAgent`로 전환
- `defineTool`로 다이어그램 도구를 등록
- Azure OpenAI를 Copilot SDK agent의 model backend로 연결
- SDK agent가 도구 호출 계획을 만들고, runtime guard가 검증한 뒤 `executeCopilotToolAction`이 Diagram IR에 적용
- 응답 메타데이터로 `agent.source`, `BuiltInAgent`, `defineTool`, 등록 도구 목록을 노출

검증 포인트:

```bash
curl -sS -X POST http://localhost:3001/api/agent \
  -H 'Content-Type: application/json' \
  -d '{"command":"온라인 쇼핑몰 주문 처리 흐름을 플로우차트로 만들어줘"}'
```

기대 근거:

- `agent.source` = `copilot-sdk`
- `agent.copilotRuntime.agent` = `BuiltInAgent`
- `agent.copilotRuntime.toolRegistration` = `defineTool`
- `agent.copilotRuntime.registeredTools`에 다이어그램 도구 목록 포함

## 2. Productivity Impact & Problem Fit

이전 약점: 실제 문제 적합성은 좋지만 시간 절감률, 단계 수 감소, 사용자 검증 자료가 부족하다는 평가.

최신 개선:

- README에 주요 작업별 수동 작업 대비 말그림 사용 시간 비교를 기록
- 생성, 중간 삽입, 타입 전환처럼 반복적인 다이어그램 작업의 중앙값 절감률을 제시
- 핵심 사용자를 개발자/아키텍트, PM/기획자로 유지해 문제-해결 적합성을 좁게 유지

제시 지표:

| 시나리오 | 수동 작업 | 말그림 | 절감률 |
|---|---:|---:|---:|
| 해커톤 진행 플로우차트 생성 | 95초 | 31초 | 67.4% |
| 배포 후 점수 측정 단계 삽입 | 42초 | 14초 | 66.7% |
| 플로우차트에서 시퀀스 전환 | 78초 | 24초 | 69.2% |

## 3. Azure AI & Cloud Integration

이전 약점: Azure OpenAI/Speech는 쓰지만 IaC, Managed Identity, Key Vault, App Insights가 부족하다는 평가.

최신 개선:

- Azure OpenAI: Copilot SDK agent의 model backend
- Azure Speech: short-lived speech token 발급
- Azure Web App: standalone Next.js 배포
- `infra/main.bicep`: Web App, system-assigned Managed Identity, App Insights, Key Vault reference 정의
- `lib/server/telemetry.ts`: `APPLICATIONINSIGHTS_CONNECTION_STRING` 기반 Azure Monitor ingestion endpoint 이벤트 전송

제출 증빙 권장:

- 배포 `/api/agent` 응답에서 `agent.source=\"copilot-sdk\"` 확인
- Web App Identity enabled 화면 캡처
- App Settings의 Key Vault reference 화면 캡처(민감값 마스킹)
- App Insights query에서 `agent_run_completed`, `agent_action_executed`, `agent_execution_ms` 확인

## 4. Functionality & Technical Execution

이전 약점: 전역 인메모리 상태, 일부 하드코딩 의존, 제한적인 오류 처리.

최신 개선:

- 세션별 Diagram IR bucket
- Undo history
- SSE streaming (`status/plan/action/done/error`)
- rate limit + Retry-After
- speech/correction 장애 fallback
- unit 21개 + E2E 19개 통과

검증 명령:

```bash
npm run typecheck
npm test
```

## 5. User Experience & Workflow Design

최신 근거:

- 첫 화면에서 음성 입력, 텍스트 fallback, 캔버스, agent trace, Mermaid source, export가 한 흐름에 배치
- streaming status로 지연 상태 표시
- 도구 로그로 AI 행동 추적 가능
- 파괴 명령 확인/취소
- Undo로 복구 가능
- SVG/PNG export 지원

## 6. Responsible AI, Security & Trust

최신 근거:

- 모델은 Mermaid를 직접 생성하지 않고 허용 도구만 호출
- 파괴적 명령은 서버와 UI에서 confirmation 필요
- ambiguous/destructive speech correction 자동 적용 방지
- HTTP-only session cookie
- API rate limiting
- CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- App Insights telemetry 경로
- Key Vault reference / Managed Identity IaC

## 7. Innovation & Originality

최신 근거:

말그림은 단순 챗봇이나 Mermaid 생성기가 아니라, 음성 명령을 Copilot SDK tool loop로 변환해 Diagram IR을 안전하게 편집한다. 회의 중 설명, 증분 수정, 타입 전환, 문서 내보내기를 하나의 생산성 흐름으로 묶은 점이 차별화 포인트다.

## 제출 직전 체크

- 로컬 또는 배포 `/api/agent`에서 `source: copilot-sdk` 확인
- `npm test` 최신 통과 로그 확보
- App Insights 이벤트 쿼리 캡처
- Key Vault reference/Managed Identity 캡처
- 90초 데모에서 `plan/action/done`, Undo, destructive confirmation을 반드시 시연
