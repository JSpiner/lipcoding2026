# Docker 기반 Azure 배포 프로세스

이 문서는 말그림(SpeakDraw) Next.js 앱을 Docker 이미지로 패키징하고 Azure에 배포한 절차를 기록한다. 비밀값은 저장소에 커밋하지 않고, Azure 배포 환경의 환경 변수 또는 시크릿으로 주입한다.

## 현재 사용 리소스

- Resource group: `rg-hackathon-web-260620110035`
- Azure Container Registry: `malgrimacr06201224.azurecr.io`
- Container Apps environment: `malgrim-aca-env`
- Azure OpenAI resource: `malgrim-openai-sweden-06201224`
- Azure OpenAI deployment: `malgrim-gpt-4o`
- Runtime port: `3000`

## 저장소 배포 준비

Next.js standalone 출력으로 Docker 이미지를 작게 만든다.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
```

Dockerfile은 `npm ci` 후 `npm run build`를 실행하고, 최종 이미지는 `.next/standalone`과 `.next/static`만 복사한다.

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

`.dockerignore`에는 로컬 비밀값과 빌드 산출물을 반드시 제외한다.

```gitignore
.git
.next
node_modules
test-results
playwright-report
coverage
.env
.env*.local
*.log
tsconfig.tsbuildinfo
```

## 환경 변수 원칙

로컬 개발은 `.env.local`을 사용하고, Azure 배포에는 `.env.local`을 업로드하지 않는다. Azure Container Apps 시크릿/환경 변수로 아래 값만 주입한다.

```text
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_OPENAI_DEPLOYMENT
AZURE_OPENAI_API_VERSION
AZURE_SPEECH_KEY
AZURE_SPEECH_REGION
NEXT_PUBLIC_APP_URL
COPILOTKIT_TELEMETRY_DISABLED
```

주의할 점:

- `NEXT_PUBLIC_` 접두사는 브라우저에 노출된다.
- API 키는 절대 `NEXT_PUBLIC_` 변수로 만들지 않는다.
- `.env.local`과 실제 키 값은 git, Docker 이미지, 문서, 로그에 남기지 않는다.

## 사전 확인

Azure 로그인과 provider 등록 상태를 확인한다.

```bash
az account show --query '{subscription:name,id:id,user:user.name}' -o table
az provider register -n Microsoft.ContainerRegistry --wait
az provider register -n Microsoft.App --wait
az provider register -n Microsoft.OperationalInsights --wait
```

로컬 환경 변수 파일에 필요한 값이 있는지만 확인한다. 값 자체는 출력하지 않는다.

```bash
set -a
source .env.local
set +a

for name in \
  AZURE_OPENAI_ENDPOINT \
  AZURE_OPENAI_API_KEY \
  AZURE_OPENAI_DEPLOYMENT \
  AZURE_OPENAI_API_VERSION \
  AZURE_SPEECH_KEY \
  AZURE_SPEECH_REGION; do
  if [[ -n "$(printenv "$name")" ]]; then
    printf '%s=set\n' "$name"
  else
    printf '%s=missing\n' "$name"
  fi
done
```

## Azure 리소스 생성 또는 재사용

```bash
RESOURCE_GROUP=rg-hackathon-web-260620110035
LOCATION=koreacentral
ACR_NAME=malgrimacr06201224
ACA_ENV=malgrim-aca-env

az acr show -g "$RESOURCE_GROUP" -n "$ACR_NAME" >/dev/null 2>&1 || \
  az acr create \
    -g "$RESOURCE_GROUP" \
    -n "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    -o none

az containerapp env show -g "$RESOURCE_GROUP" -n "$ACA_ENV" >/dev/null 2>&1 || \
  az containerapp env create \
    -g "$RESOURCE_GROUP" \
    -n "$ACA_ENV" \
    --location "$LOCATION" \
    -o none

az acr show -g "$RESOURCE_GROUP" -n "$ACR_NAME" --query loginServer -o tsv
az containerapp env show -g "$RESOURCE_GROUP" -n "$ACA_ENV" --query properties.provisioningState -o tsv
```

## Docker 이미지 빌드와 Push

처음에는 `az acr build`를 시도했으나 현재 구독/레지스트리 정책에서 `ACR Tasks`가 허용되지 않아 실패했다.

```text
TasksOperationsNotAllowed: ACR Tasks requests for the registry are not permitted.
```

따라서 로컬 Docker로 `linux/amd64` 이미지를 빌드한 뒤 ACR에 push했다.

```bash
RESOURCE_GROUP=rg-hackathon-web-260620110035
ACR_NAME=malgrimacr06201224

LOGIN_SERVER=$(az acr show -g "$RESOURCE_GROUP" -n "$ACR_NAME" --query loginServer -o tsv)
IMAGE_TAG="malgrim:$(date +%Y%m%d%H%M%S)"
FULL_IMAGE="$LOGIN_SERVER/$IMAGE_TAG"

az acr login -n "$ACR_NAME" -o none
docker buildx build --platform linux/amd64 -t "$FULL_IMAGE" --push .

printf 'full_image=%s\n' "$FULL_IMAGE"
```

이번 배포에서 확인된 이미지 예시는 다음과 같다.

```text
malgrimacr06201224.azurecr.io/malgrim:20260620133821
```

## Container App 생성 또는 업데이트

아래 명령은 Container App이 없으면 만들고, 있으면 새 이미지와 환경 변수로 업데이트한다. 실제 앱 이름은 배포 대상에 맞게 지정한다.

```bash
RESOURCE_GROUP=rg-hackathon-web-260620110035
ACR_NAME=malgrimacr06201224
ACA_ENV=malgrim-aca-env
APP_NAME=malgrim-app
LOGIN_SERVER=$(az acr show -g "$RESOURCE_GROUP" -n "$ACR_NAME" --query loginServer -o tsv)
FULL_IMAGE="$LOGIN_SERVER/malgrim:<IMAGE_TAG>"

set -a
source .env.local
set +a

ACR_USERNAME=$(az acr credential show -g "$RESOURCE_GROUP" -n "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show -g "$RESOURCE_GROUP" -n "$ACR_NAME" --query 'passwords[0].value' -o tsv)

if az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" >/dev/null 2>&1; then
  az containerapp update \
    -g "$RESOURCE_GROUP" \
    -n "$APP_NAME" \
    --image "$FULL_IMAGE" \
    --set-env-vars \
      AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
      AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
      AZURE_OPENAI_API_VERSION="$AZURE_OPENAI_API_VERSION" \
      AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key \
      AZURE_SPEECH_KEY=secretref:azure-speech-key \
      AZURE_SPEECH_REGION="$AZURE_SPEECH_REGION" \
      NEXT_PUBLIC_APP_URL="https://<APP_FQDN>" \
      COPILOTKIT_TELEMETRY_DISABLED="true" \
    --secrets \
      azure-openai-api-key="$AZURE_OPENAI_API_KEY" \
      azure-speech-key="$AZURE_SPEECH_KEY" \
    -o none
else
  az containerapp create \
    -g "$RESOURCE_GROUP" \
    -n "$APP_NAME" \
    --environment "$ACA_ENV" \
    --image "$FULL_IMAGE" \
    --target-port 3000 \
    --ingress external \
    --registry-server "$LOGIN_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --secrets \
      azure-openai-api-key="$AZURE_OPENAI_API_KEY" \
      azure-speech-key="$AZURE_SPEECH_KEY" \
    --env-vars \
      AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
      AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key \
      AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
      AZURE_OPENAI_API_VERSION="$AZURE_OPENAI_API_VERSION" \
      AZURE_SPEECH_KEY=secretref:azure-speech-key \
      AZURE_SPEECH_REGION="$AZURE_SPEECH_REGION" \
      NEXT_PUBLIC_APP_URL="https://<APP_FQDN>" \
      COPILOTKIT_TELEMETRY_DISABLED="true" \
    -o none
fi
```

생성 후 실제 FQDN을 확인한다.

```bash
az containerapp show \
  -g "$RESOURCE_GROUP" \
  -n "$APP_NAME" \
  --query properties.configuration.ingress.fqdn \
  -o tsv
```

필요하면 확인된 FQDN으로 `NEXT_PUBLIC_APP_URL`을 한 번 더 업데이트한다.

```bash
APP_FQDN=$(az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query properties.configuration.ingress.fqdn -o tsv)

az containerapp update \
  -g "$RESOURCE_GROUP" \
  -n "$APP_NAME" \
  --set-env-vars NEXT_PUBLIC_APP_URL="https://$APP_FQDN" \
  -o none
```

## 배포 검증

HTTP와 API 상태를 먼저 확인한다.

```bash
APP_FQDN=$(az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query properties.configuration.ingress.fqdn -o tsv)

curl -I -L --max-time 60 "https://$APP_FQDN/"
curl -sS --max-time 60 "https://$APP_FQDN/api/agent" | head -c 1000
```

Azure OpenAI 연동 smoke test를 실행한다.

```bash
curl -sS -X POST "https://$APP_FQDN/api/agent" \
  -H 'Content-Type: application/json' \
  -d '{"command":"해커톤 진행 프로세스를 플로우차트로 생성해줘"}' | \
  node -e 'let data=""; process.stdin.on("data", c => data += c); process.stdin.on("end", () => { const json = JSON.parse(data); console.log(JSON.stringify({ source: json.agent?.source, irType: json.ir?.type, labels: json.ir?.nodes?.map(node => node.label).slice(0, 3), message: json.message }, null, 2)); });'
```

정상 예시는 다음과 같다.

```json
{
  "source": "azure-openai",
  "irType": "flowchart",
  "labels": [
    "아이디어 선정",
    "요구사항 정리",
    "프로토타입 구현"
  ]
}
```

브라우저 E2E는 배포 URL을 대상으로 Playwright 설정을 확장하거나, 수동으로 다음 흐름을 확인한다.

1. 첫 화면이 정상 렌더링되는지 확인한다.
2. `해커톤 진행 프로세스를 플로우차트로 생성해줘` 명령을 실행한다.
3. `아이디어 선정`, `요구사항 정리`, `프로토타입 구현` 노드가 보이는지 확인한다.
4. `시퀀스 다이어그램으로 바꿔줘` 명령을 실행한다.
5. Mermaid 소스가 `sequenceDiagram`으로 바뀌는지 확인한다.
6. `초기화해줘` 명령 후 확인 UI가 뜨고, 확인을 누르면 빈 상태가 되는지 확인한다.

## 문제 해결 기록

- `az acr build`는 `TasksOperationsNotAllowed`로 실패했다. 이 환경에서는 로컬 Docker buildx + ACR push를 사용한다.
- `.env.local`은 `.dockerignore`로 제외되어 이미지에 포함되지 않는다.
- Next.js는 Docker 내부에서 `npm run build`를 실행하고 standalone 서버를 `node server.js`로 실행한다.
- Container Apps의 target port는 Dockerfile의 `PORT=3000`과 맞춰 `3000`으로 설정한다.
- Azure OpenAI 429가 발생하면 현재 앱은 로컬 fallback으로 응답할 수 있다. 실제 Azure 연동 여부는 API 응답의 `agent.source`가 `azure-openai`인지 확인한다.

## 배포 전 최종 체크리스트

- [ ] `git status --short`로 의도하지 않은 변경 확인
- [ ] `.env.local`이 git과 Docker 이미지에 포함되지 않는지 확인
- [ ] `npm run typecheck` 통과
- [ ] `npm test` 통과
- [ ] Docker 이미지 build/push 성공
- [ ] Container App revision 상태 정상
- [ ] `/` HTTP 200 확인
- [ ] `/api/agent` GET 확인
- [ ] `/api/agent` POST smoke test에서 `source: azure-openai` 확인
- [ ] 브라우저에서 플로우차트 생성, 시퀀스 전환, 초기화 확인