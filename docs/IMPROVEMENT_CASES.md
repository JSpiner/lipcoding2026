# 말그림 서비스/기술 개선 사례

> 기준일: 2026-06-20  
> 목적: 구현 중 발견한 문제와 개선 조치를 서비스 안정성, AI 도구 실행 품질, Azure 운영 관점에서 정리한다.

---

## 요약

말그림은 자연어 명령을 Azure OpenAI가 구조화된 action JSON으로 변환하고, 서버가 검증된 도구만 실행해 Diagram IR을 변경하는 구조다. 이 구조는 Mermaid 문법 오류를 줄이는 장점이 있지만, 모델 출력 품질과 Azure rate limit, 개발 서버 캐시 상태에 영향을 받을 수 있다.

이번 개선의 핵심은 다음 세 가지다.

- 모델이 불완전한 도구 호출을 내려도 다이어그램 상태가 망가지지 않게 한다.
- Azure OpenAI 429 throttling이 발생해도 데모 흐름이 끊기지 않게 한다.
- 자주 쓰는 데모 명령은 결정적 도구로 고정해 재현성을 높인다.

---

## 개선 사례 1. 불완전한 AI 도구 호출 방어

### 발견된 문제

`해커톤 진행 프로세스를 플로우차트로 생성해줘` 명령에서 Azure OpenAI가 다음과 같은 불완전한 action을 반환하는 경우가 있었다.

```json
{ "tool": "add_node" }
{ "tool": "connect" }
```

서버는 기존에 누락된 값을 기본값으로 보정했다.

- `add_node`의 label 누락 → `"새 단계"`로 생성
- `connect`의 from/to 누락 → 빈 문자열 전달
- 빈 참조가 resolver에서 첫 번째 노드와 매칭되는 부작용 발생

결과적으로 화면에 `새 단계` 노드가 반복되고, `n1 --> n1` 자기 연결이 여러 개 생겼다.

### 개선 조치

필수 인자가 없는 도구 호출은 실행하지 않도록 검증을 강화했다.

- `add_node`: `label` 필수
- `add_participant`: `label` 필수
- `connect`: `from`, `to` 필수
- `relabel`: `ref`, `newLabel` 필수
- `remove`: `ref` 필수

또한 빈 참조는 어떤 노드와도 매칭하지 않도록 resolver를 수정했다.

### 효과

- 모델이 불완전한 action을 반환해도 IR이 오염되지 않는다.
- 잘못된 노드 반복 생성과 자기 연결 문제가 사라졌다.
- 실패 시 fallback 로그를 남겨 원인을 추적할 수 있다.

### 관련 파일

- `lib/ai/azure-openai.ts`
- `lib/ai/agent.ts`
- `lib/diagram/resolver.ts`

---

## 개선 사례 2. 해커톤 프로세스 결정적 생성 도구 추가

### 발견된 문제

자연어 명령을 매번 모델에게 완전히 맡기면, 같은 요청이라도 모델이 다른 action 조합을 반환할 수 있다. 특히 데모에서 자주 쓰는 명령은 결과가 매번 달라지면 발표 안정성이 낮아진다.

### 개선 조치

`해커톤`, `해코톤`, `hackathon` 키워드가 포함된 명령은 서버 안전 가드에서 `create_hackathon_flow`로 고정했다.

생성되는 기본 흐름은 다음과 같다.

```text
아이디어 선정 → 요구사항 정리 → 프로토타입 구현 → 테스트와 보완 → 배포 → 데모 발표
```

Azure OpenAI를 호출하더라도, 최종 실행 계획은 해당 결정적 도구로 보정된다. 따라서 응답의 source는 `azure-openai`를 유지하면서도 데모 결과는 안정적으로 만든다.

### 효과

- 해커톤 데모 명령의 재현성이 높아졌다.
- 모델이 빈 action을 반환해도 화면이 깨지지 않는다.
- 심사/시연 중 같은 문장으로 같은 결과를 얻을 수 있다.

### 관련 파일

- `lib/diagram/tools.ts`
- `lib/ai/agent.ts`
- `lib/ai/prompts.ts`
- `lib/ai/copilot-runtime.ts`

---

## 개선 사례 3. Azure OpenAI 429 대응

### 발견된 문제

Azure OpenAI 요청 중 다음 오류가 발생했다.

```text
Azure OpenAI request failed: 429
Too Many Requests
```

Azure 설정을 확인한 결과, 기존 배포의 capacity가 1이었다.

```text
Deployment: malgrim-gpt-4o
SKU: Standard
Capacity: 1
Rate limit: 10초당 1 request, 분당 1000 tokens
```

브라우저에서 연속 명령을 실행하거나 API smoke test를 반복하면 이 한도에 쉽게 도달했다.

### 개선 조치

Azure OpenAI deployment capacity를 1에서 5로 높였다.

```text
Capacity: 5
Rate limit: 10초당 5 requests, 분당 5000 tokens
```

또한 앱에서 Azure OpenAI가 429를 반환하면 API가 502로 실패하지 않고 local fallback planner로 전환되도록 했다.

### 효과

- 연속 명령 실행 시 429 발생 가능성이 크게 줄었다.
- 일시적으로 throttle이 발생해도 데모 흐름이 끊기지 않는다.
- Azure 장애와 앱 기능 장애를 분리해 사용자 경험을 안정화했다.

### 관련 파일/리소스

- `lib/ai/azure-openai.ts`
- `lib/ai/agent.ts`
- Azure OpenAI resource: `malgrim-openai-sweden-06201224`
- Azure OpenAI deployment: `malgrim-gpt-4o`

---

## 개선 사례 4. 시퀀스 다이어그램 전환 안정화

### 발견된 문제

모델이 `이걸 시퀀스 다이어그램으로 바꿔줘` 명령을 새 플로우차트 생성으로 오판하는 경우가 있었다. 또 시퀀스 다이어그램 상태에서 `set_direction`이 실행되면 기존 시퀀스가 빈 플로우차트로 바뀔 위험이 있었다.

### 개선 조치

- `switch_type` 도구를 추가했다.
- flowchart → sequence, sequence → flowchart 변환을 지원했다.
- 시퀀스 전환 명령은 서버 안전 가드로 `switch_type` 실행을 보장했다.
- 시퀀스 상태에서 `set_direction`이 호출되면 기존 IR을 보존하고 안내 로그만 남기도록 했다.

### 효과

- 타입 전환 데모의 안정성이 높아졌다.
- 지원하지 않는 방향 변경이 기존 다이어그램을 망가뜨리지 않는다.
- flowchart/sequence 모두 Mermaid 직렬화 테스트 범위에 들어왔다.

### 관련 파일

- `lib/diagram/tools.ts`
- `lib/diagram/serialize.ts`
- `lib/ai/agent.ts`
- `tests/serialize.test.ts`

---

## 개선 사례 5. 테스트와 빌드 검증 추가

### 발견된 문제

구현 계획에는 직렬화기 단위 테스트가 명시되어 있었지만, 초기 구현에는 테스트가 없었다. Mermaid 렌더링은 작은 escape 누락만 있어도 브라우저에서 깨질 수 있다.

### 개선 조치

Node 내장 테스트 러너와 `tsx`를 사용해 TypeScript 테스트를 실행하도록 구성했다.

테스트 범위는 다음과 같다.

- Flowchart label escape
- Edge label escape
- Sequence diagram serialization
- Sequence message colon 처리

### 효과

- Mermaid 직렬화 회귀를 빠르게 잡을 수 있다.
- `npm test`, `npm run typecheck`, `npm run build`로 최소 검증 루틴이 생겼다.
- 데모 전 안정성 확인이 쉬워졌다.

### 관련 파일

- `package.json`
- `tests/serialize.test.ts`

---

## 개선 사례 6. 개발 서버 stale chunk 문제 대응

### 발견된 문제

Next.js dev server 실행 중 `npm run build`가 `.next` 산출물을 다시 쓰면서 다음 오류가 발생했다.

```text
Cannot find module './1331.js'
Require stack: .next/server/webpack-runtime.js
```

dev server와 production build가 같은 `.next` 디렉터리를 건드리며 chunk cache가 꼬인 것으로 판단했다.

### 개선 조치

빌드 후 dev server를 다시 사용할 때는 다음 순서로 정리했다.

```text
1. 3001 포트의 Next.js dev server 종료
2. .next 삭제
3. npm run dev 재시작
4. / 와 /api/agent 200 응답 확인
```

### 효과

- stale chunk로 인한 500 오류를 제거했다.
- 빌드 검증 후 브라우저 데모 환경을 다시 안정화할 수 있다.

### 관련 영역

- Next.js dev server
- `.next` build output

---

## 현재 남은 개선 후보

### 1. PNG export 완성

현재 `export` 도구는 Mermaid 복사 흐름과 로그까지 연결되어 있다. PNG 다운로드는 아직 완성 기능이 아니므로, 3단계에서 SVG/PNG export 버튼과 도구 실행을 연결해야 한다.

### 2. CopilotKit 직접 tool orchestration 강화

현재 CopilotKit v2 runtime boundary와 도구 계약은 노출되어 있지만, 실제 tool loop는 `/api/agent`에서 Azure OpenAI action JSON을 받아 서버가 실행하는 구조다. 심사 기준에서 Copilot SDK 활용도를 더 강하게 보여주려면 CopilotKit handler와 tool registration을 실제 요청 경로에 더 깊게 연결하는 개선이 필요하다.

### 3. 범용 플로우차트 생성 품질 개선

해커톤/주문 처리처럼 데모 핵심 명령은 결정적 도구로 안정화했다. 그 외 새 주제에 대해서는 모델이 `add_node/connect`를 정확히 내려야 하므로, action JSON 스키마 설명과 self-repair 루프를 더 강화할 수 있다.

### 4. Azure retry/backoff 정책 추가

429 발생 시 현재는 즉시 local fallback으로 전환한다. 운영 환경에서는 짧은 exponential backoff 후 재시도하고, 그래도 실패하면 fallback하는 방식이 더 적절하다.

---

## 검증 기록

최근 개선 후 다음 검증을 통과했다.

```text
npm run typecheck
npm test
npm run build
```

API smoke test 결과:

```text
해커톤 진행 프로세스를 플로우차트로 생성해줘
→ source: azure-openai
→ ir.type: flowchart
→ labels: 아이디어 선정, 요구사항 정리, 프로토타입 구현, 테스트와 보완, 배포, 데모 발표
```

Azure OpenAI deployment 확인 결과:

```text
deployment: malgrim-gpt-4o
sku: Standard
capacity: 5
request limit: 5 requests / 10 seconds
token limit: 5000 tokens / 60 seconds
```