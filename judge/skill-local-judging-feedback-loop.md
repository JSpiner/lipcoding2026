# Skill: Local Judging Feedback Loop

## Purpose
이 스킬은 현재 작업 폴더의 과제를 7명의 AI 심사위원 시점으로 평가하고, 최종 점수를 계산한 뒤, 개선안을 반영하는 피드백 루프를 수행하기 위한 실행 가이드다.

## Inputs
- 평가 대상 루트: 현재 폴더 전체
- 필수 참고 문서:
  - `docs/PRD.md`
  - `README.md` (있으면)
  - 소스 코드 및 배포/설정 관련 문서
- 심사 기준 파일:
  - `judge/judge-1-copilot-sdk.md`
  - `judge/judge-2-productivity-fit.md`
  - `judge/judge-3-azure-integration.md`
  - `judge/judge-4-technical-execution.md`
  - `judge/judge-5-ux-workflow.md`
  - `judge/judge-6-responsible-ai-security.md`
  - `judge/judge-7-innovation.md`

## Judge Weights
대회 기준 가중치를 그대로 사용한다.
- Judge 1: 25
- Judge 2: 18
- Judge 3: 18
- Judge 4: 16
- Judge 5: 12
- Judge 6: 6
- Judge 7: 5

최종 점수 계산식:
- `final_score = (j1*25 + j2*18 + j3*18 + j4*16 + j5*12 + j6*6 + j7*5) / 100`

## Execution Rules
1. 현재 폴더를 훑어 실제 구현 상태를 파악한다.
2. 각 judge 파일의 기준으로 0~100 정수 점수를 독립 채점한다.
3. 각 심사위원은 다음을 반드시 출력한다.
   - Score
   - Verdict 1문장
   - Strengths 최대 3개
   - Weaknesses 최대 3개
   - One Improvement 1개
4. 7개 점수를 가중 평균하여 `final_score`를 계산한다.
5. 약점에서 중복되는 항목을 묶어 Top 3 개선 과제를 도출한다.
6. 개선 과제는 반드시 실행 가능한 작업 단위로 작성한다.
7. 필요 시 코드/문서 수정 후 재채점한다.
8. 루프는 최대 3라운드 수행한다.

## Feedback Loop Strategy
라운드마다 아래 단계를 반복한다.
1. Baseline Evaluate: 7명 채점 + 최종 점수 계산
2. Plan Fixes: 점수 상승 기대치가 큰 항목부터 개선 우선순위 설정
3. Apply Changes: 최소 변경으로 핵심 리스크부터 수정
4. Re-Evaluate: 동일 기준으로 재채점
5. Compare: 라운드 간 점수/리스크 증감 비교

종료 조건:
- `final_score >= 85` 달성
- 또는 최근 라운드 대비 점수 상승폭 `< 2점`
- 또는 3라운드 도달

## Output Format
아래 형식으로 결과를 반환한다.

```md
# Local Judge Report (Round <n>)

## 1) Per-Judge Scores
- Judge 1 (Copilot SDK): <0-100>
- Judge 2 (Productivity Fit): <0-100>
- Judge 3 (Azure Integration): <0-100>
- Judge 4 (Technical Execution): <0-100>
- Judge 5 (UX Workflow): <0-100>
- Judge 6 (Responsible AI/Security): <0-100>
- Judge 7 (Innovation): <0-100>

## 2) Weighted Final Score
- Final Score: <0.00-100.00>
- Formula: (j1*25 + j2*18 + j3*18 + j4*16 + j5*12 + j6*6 + j7*5)/100

## 3) Consolidated Findings
- Top Strengths:
  - <item>
  - <item>
  - <item>
- Top Risks:
  - <item>
  - <item>
  - <item>

## 4) Top 3 Improvement Tasks (Next Round)
1. <task, expected impact, owner>
2. <task, expected impact, owner>
3. <task, expected impact, owner>

## 5) Round Delta
- Previous Final Score: <score or N/A>
- Current Final Score: <score>
- Delta: <+/-score>
- Decision: <continue loop or stop>
```

## Operating Prompt (Copy/Paste)
아래 프롬프트를 실행하면 이 스킬 방식으로 동작한다.

```text
Run the Local Judging Feedback Loop skill in the current folder.
1) Evaluate this project with all seven judge markdown files in judge/.
2) Score each judge from 0 to 100 (integer).
3) Compute weighted final score using official weights (25,18,18,16,12,6,5).
4) Produce consolidated findings and Top 3 improvement tasks.
5) Apply high-impact fixes where possible, then re-evaluate.
6) Repeat up to 3 rounds or until final score >= 85.
Return the report in the exact Output Format.
```

## Notes
- 점수는 후해야 하거나 박해야 하지 않다. 증거 기반으로 채점한다.
- 기능 개수보다 문제 적합성과 완성도, 신뢰성, Azure/Copilot SDK의 실질적 활용을 우선한다.
- 보안/프라이버시/오류 처리 누락은 작은 기능 부족보다 더 크게 감점한다.
