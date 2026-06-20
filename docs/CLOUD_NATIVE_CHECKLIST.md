# Cloud-Native Upgrade Checklist

이 문서는 심사 항목 `Azure AI & Cloud Integration`, `Responsible AI, Security & Trust` 만점 근거를 만들기 위한 체크리스트다.

## 1) IaC로 배포 정의

- 파일: `infra/main.bicep`
- 포함 리소스
  - App Service Plan
  - Web App (System Assigned Managed Identity)
  - Application Insights
  - Key Vault(existing) 참조
- 목표
  - 포털 수동 설정 없이 동일 환경 재현

## 2) Managed Identity + Key Vault

- Web App에 시스템 할당 ID 활성화
- Key Vault Access Policy 또는 RBAC로 secret 읽기 권한 부여
- App Settings는 Key Vault reference(`@Microsoft.KeyVault(...)`) 사용
- 확인 항목
  - `AZURE_OPENAI_API_KEY`, `AZURE_SPEECH_KEY`가 평문 저장되지 않음
  - 앱 재시작 후 API 정상 동작

## 3) 관측성(App Insights)

- `APPLICATIONINSIGHTS_CONNECTION_STRING` 설정
- 최소 추적 이벤트
  - `agent_plan_created`
  - `agent_action_executed`
  - `agent_run_completed`
  - `agent_rate_limited`
  - `agent_execution_ms`
  - agent exception
- 구현 파일
  - `lib/server/telemetry.ts`: `APPLICATIONINSIGHTS_CONNECTION_STRING`을 파싱해 Azure Monitor ingestion endpoint(`/v2/track`)로 event/metric/exception 전송
  - `app/api/agent/route.ts`: SSE plan/action/done, 429, exception 경로에 telemetry 연결
- 대시보드에서 확인할 지표
  - p95 latency
  - 4xx/5xx 비율
  - rate limit hit 횟수

## 4) 보안/신뢰 운영 검증

- 보안 헤더 적용 확인(CSP/HSTS/X-Frame-Options)
- rate limiting 동작 확인(429 + Retry-After)
- 세션 분리 확인(브라우저 2개 동시 테스트)
- 파괴적 명령 수동 승인 + Undo 동작 재검증

## 5) 제출용 증빙 패키지

- IaC 파일(`infra/main.bicep`)
- 배포 후 App Settings 스냅샷(민감정보 마스킹)
- App Insights 쿼리 결과 캡처
- Key Vault access policy 또는 RBAC 설정 캡처
- 스모크 테스트 로그

## 실행 예시

```bash
az deployment group create \
  -g <resource-group> \
  -f infra/main.bicep \
  -p appName=<web-app-name> keyVaultName=<key-vault-name> openAiEndpoint=<endpoint> openAiDeployment=<deployment> speechRegion=<region>
```
