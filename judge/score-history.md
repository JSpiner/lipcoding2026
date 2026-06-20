# 채점 기록 (Score History)

채점 기준: [judgement-criteria.md](../../lipcoding-competition-2026/judgements/judgement-criteria.md)
채점 공식: `(j1×25 + j2×18 + j3×18 + j4×16 + j5×12 + j6×6 + j7×5) / 100`

---

## 2026-06-20 14:00 — Round 1 (Baseline)

**프로젝트 상태:** PRD.md + README.md 작성 완료. 소스 코드 없음.

| Judge | 항목 | 가중치 | 점수 | 가중 점수 |
|-------|------|-------:|-----:|----------:|
| J1 | Effective Use of Copilot SDK | 25% | 20 | 500 |
| J2 | Productivity Impact & Problem Fit | 18% | 78 | 1404 |
| J3 | Azure AI & Cloud Integration | 18% | 18 | 324 |
| J4 | Functionality & Technical Execution | 16% | 5 | 80 |
| J5 | User Experience & Workflow Design | 12% | 52 | 624 |
| J6 | Responsible AI, Security & Trust | 6% | 65 | 390 |
| J7 | Innovation & Originality | 5% | 88 | 440 |
| | **Final Score** | **100%** | | **37.62** |

### 주요 강점
- PRD 품질 전문적 — IR 스키마, 도구 분리, 리스크 대응까지 완비
- "음성으로 다이어그램 편집" 컨셉이 대회 테마(입코딩)와 메타적으로 정합
- Responsible AI 원칙(HITL, 결정적 파이프라인, 인젝션 인지)이 설계 전반에 녹아 있음

### 주요 리스크
- **코드 0줄** — J1(25%), J3(18%), J4(16%) 합산 59%가 구현 부재로 큰 감점
- Azure 배포 URL 없음 — 제출 요건 미충족으로 탈락 가능성
- Copilot SDK 실제 연동 미확인 — 최대 가중치(25%) 항목 완전 미검증

### 다음 라운드 개선 과제
1. Next.js 초기화 + IR 파이프라인 + Mermaid 렌더 뼈대 (J4 +35점 기대)
2. Copilot SDK 에이전트 루프 + 핵심 3개 도구 구현 (J1 +40점 기대)
3. Azure Container Apps 배포 + Azure OpenAI 연동 (J3 +40점 기대)

---

## 2026-06-20 12:27 — Round 1 (Current Build)

**프로젝트 상태:** Next.js 앱 구현됨(`app/`, `components/`, `lib/`, `tests/`). `/api/agent` 동작 확인, 테스트 2개 통과. Azure는 설정 키(.env) 수준이며 실제 배포 증거는 아직 없음.

| Judge | 항목 | 가중치 | 점수 | 가중 점수 |
|-------|------|-------:|-----:|----------:|
| J1 | Effective Use of Copilot SDK | 25% | 62 | 1550 |
| J2 | Productivity Impact & Problem Fit | 18% | 84 | 1512 |
| J3 | Azure AI & Cloud Integration | 18% | 45 | 810 |
| J4 | Functionality & Technical Execution | 16% | 72 | 1152 |
| J5 | User Experience & Workflow Design | 12% | 74 | 888 |
| J6 | Responsible AI, Security & Trust | 6% | 78 | 468 |
| J7 | Innovation & Originality | 5% | 86 | 430 |
| | **Final Score** | **100%** | | **68.10** |

### 근거 요약
- 강점: 도구 기반 IR 편집 + Mermaid 렌더 파이프라인, clear 확인 플로우(HITL), 테스트 통과, 실제 API 응답 확인.
- 리스크: Copilot SDK 활용이 핵심 엔진 수준으로 완전 증명되진 않음(로컬 fallback 비중 큼), Azure는 실배포/운영 증거 부족.
- 관찰 이슈: 에이전트 실행 성공 응답에도 상황에 따라 안내 메시지가 혼재될 수 있어 상태 메시지 정리 로직 점검 필요.

### 다음 라운드 우선 과제
1. Copilot SDK 중심 실행 경로를 기본값으로 올리고 로컬 fallback은 예외 경로로 축소
2. Azure OpenAI 실연동 + Azure 배포 URL 확보(심사 증빙 스크린샷/로그 포함)
3. 상태 메시지/에러 메시지 일관성 정리 및 E2E 테스트 2~3개 추가

---

## 2026-06-20 12:53 — Round 2 (Re-check)

**프로젝트 상태:** 단위 테스트 9개 + E2E 테스트 3개 통과 확인. `/api/agent` 실호출 시 `agent.source: azure-openai` 응답 확인. Azure 배포 URL 증빙은 아직 없음.

| Judge | 항목 | 가중치 | 점수 | 가중 점수 |
|-------|------|-------:|-----:|----------:|
| J1 | Effective Use of Copilot SDK | 25% | 79 | 1975 |
| J2 | Productivity Impact & Problem Fit | 18% | 85 | 1530 |
| J3 | Azure AI & Cloud Integration | 18% | 62 | 1116 |
| J4 | Functionality & Technical Execution | 16% | 86 | 1376 |
| J5 | User Experience & Workflow Design | 12% | 80 | 960 |
| J6 | Responsible AI, Security & Trust | 6% | 82 | 492 |
| J7 | Innovation & Originality | 5% | 86 | 430 |
| | **Final Score** | **100%** | | **78.79** |

### 근거 요약
- 강점: 에이전트 API 실동작, Azure OpenAI 경로 응답 확인, 자동화 테스트(유닛+E2E) 통과로 기능 신뢰도 상승.
- 리스크: Azure 배포 URL/운영 증빙이 없어 J3 상한이 제한됨.
- 관찰 이슈: 초기 상태에서 분기 추가 명령 단독 실행 시 대상 노드 부재로 실패 로그가 발생할 수 있어, 선행 안내 UX가 필요함.

### 다음 라운드 우선 과제
1. Azure Container Apps 실제 배포 및 공개 URL/스크린샷 증빙 확보
2. 초기 빈 다이어그램에서 분기 명령이 들어오면 선행 생성 제안(또는 자동 생성) 로직 추가
3. Copilot SDK 중심 경로 비중을 높이고 fallback 트리거 조건 축소

---

## 2026-06-20 13:45 — Round 3 (Azure + Quality Hardening)

**프로젝트 상태:** 단위 테스트 9개 + E2E 3개 통과. Azure OpenAI 실연동 응답 확인(`agent.source: azure-openai`). ACR 이미지 빌드·push 완료(`malgrimacr06201224.azurecr.io/malgrim:20260620133821`). Container Apps 환경 생성됨. 단, Container App URL 최종 배포 미완성.

| Judge | 항목 | 가중치 | 점수 | 가중 점수 |
|-------|------|-------:|-----:|----------:|
| J1 | Effective Use of Copilot SDK | 25% | 81 | 2025 |
| J2 | Productivity Impact & Problem Fit | 18% | 85 | 1530 |
| J3 | Azure AI & Cloud Integration | 18% | 76 | 1368 |
| J4 | Functionality & Technical Execution | 16% | 89 | 1424 |
| J5 | User Experience & Workflow Design | 12% | 82 | 984 |
| J6 | Responsible AI, Security & Trust | 6% | 86 | 516 |
| J7 | Innovation & Originality | 5% | 86 | 430 |
| | **Final Score** | **100%** | | **82.77** |

### 근거 요약
- 강점: Azure OpenAI 실응답 확인, `normalizePlan` 방어 로직 유닛테스트로 검증, `create_hackathon_flow` 결정적 도구로 데모 안정성 향상, AI 환각 방어 2건 구체 케이스 구현+문서화.
- 리스크: Container App 공개 URL 미생성 — J3 상한 제한의 유일하고 최대 원인.

### 다음 라운드 우선 과제
1. `az containerapp create` 실행으로 공개 URL 확보 → J3 +10점 기대 (목표 점수 85 달성 가능)
2. 음성 입력 연동(Azure Speech 또는 Web Speech API) — J5 +5점 기대
3. `switch_type` 데모 시나리오 E2E 테스트 추가

---

<!-- 다음 채점 결과를 아래에 추가하세요 -->
