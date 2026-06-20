import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("creates a hackathon flowchart from the UI", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "REC" })).toBeVisible();

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("아이디어 선정");
  await expect(page.locator("pre")).toContainText("요구사항 정리");
  await expect(page.locator("pre")).toContainText("프로토타입 구현");
  await expect(page.getByText("create_diagram").first()).toBeVisible();
  await expect(page.locator("pre")).toContainText("flowchart TD");
  await expect(page.locator("pre")).toContainText("n1 --> n2");
  await expect(page.getByRole("button", { name: "MMD" }).first()).toBeEnabled();
  await expect(page.getByRole("button", { name: "SVG" }).first()).toBeEnabled();
  await expect(page.getByRole("button", { name: "PNG" }).first()).toBeEnabled();
});

test("switches the current flowchart to a sequence diagram", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("온라인 쇼핑몰 주문 처리 흐름을 플로우차트로 그려줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("flowchart TD");

  await page.getByLabel("텍스트 명령").fill("이걸 시퀀스 다이어그램으로 바꿔줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("sequenceDiagram");
  await expect(page.locator("pre")).toContainText("participant p1 as 장바구니");
  await expect(page.getByText("switch_type").first()).toBeVisible();
});

test("adds a score measurement step after deployment", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("n5 --> n6");

  await page.getByLabel("텍스트 명령").fill("배포 후에 점수를 측정하는 단계를 추가해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("점수 측정");
  await expect(page.locator("pre")).not.toContainText("n5 --> n6");
  await expect(page.getByText("에이전트가 실행할 도구를 선택하지 못했습니다.")).toHaveCount(0);
  await expect(page.getByText("insert_node_between").first()).toBeVisible();
});

test("inserts a user interview step before requirements", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("n1 --> n2");

  await page.getByLabel("텍스트 명령").fill("요구사항 정리 전에 유저 인터뷰 단계를 추가해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("유저 인터뷰");
  await expect(page.locator("pre")).not.toContainText("n1 --> n2");
  await expect(page.locator("pre")).toContainText("n1 --> n7");
  await expect(page.locator("pre")).toContainText("n7 --> n2");
  await expect(page.getByText("에이전트가 실행할 도구를 선택하지 못했습니다.")).toHaveCount(0);
  await expect(page.getByText("insert_node_between").first()).toBeVisible();
});

test("adds a score and improvement cycle from the testing step", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("n4 --> n5");

  await page.getByLabel("텍스트 명령").fill("테스트와 보완 단계에서 점수를 측정하고 개선하는 사이클을 추가해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("점수 측정");
  await expect(page.locator("pre")).toContainText("개선");
  await expect(page.locator("pre")).toContainText("n4 --> n5");
  await expect(page.locator("pre")).toContainText("n4 --> n7");
  await expect(page.locator("pre")).toContainText("n7 --> n8");
  await expect(page.locator("pre")).toContainText("n8 --> n4");
  await expect(page.getByText("에이전트가 실행할 도구를 선택하지 못했습니다.")).toHaveCount(0);
  await expect(page.getByText("add_feedback_cycle").first()).toBeVisible();
});

test("asks for confirmation before clearing and then clears the diagram", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("아이디어 선정");

  await page.getByLabel("텍스트 명령").fill("전체 지워줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.getByText("전체 다이어그램을 삭제할까요?")).toBeVisible();
  await page.getByRole("button", { name: "삭제 승인" }).click();

  await expect(page.locator("pre")).toContainText("아직 생성된 Mermaid 소스가 없습니다.");
  await expect(page.getByText("clear").first()).toBeVisible();
});

test("exposes a speech token endpoint without leaking long-lived keys", async ({ request }) => {
  const response = await request.get("/api/speech-token");
  const payload = await response.json();

  expect([200, 503]).toContain(response.status());

  if (response.status() === 200) {
    expect(payload).toMatchObject({ source: "azure-speech" });
    expect(payload.region).toBeTruthy();
    expect(payload.token).toBeTruthy();
    expect(payload).not.toHaveProperty("key");
  } else {
    expect(payload).toMatchObject({ fallback: "browser-speech" });
  }
});

test("writes recognized speech into the text command input without auto-running", async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition extends EventTarget {
      lang = "ko-KR";
      interimResults = true;
      maxAlternatives = 1;
      onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ 0: { transcript: "테스트 입력" }, length: 1, isFinal: false }],
          });
        }, 0);
      }

      stop() {
        this.onend?.();
      }
    }

    Object.defineProperty(window, "SpeechRecognition", {
      value: MockSpeechRecognition,
      configurable: true,
    });
  });

  await page.route("/api/speech-token", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 503,
      body: JSON.stringify({ fallback: "browser-speech" }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "REC" }).click();

  await expect(page.getByLabel("텍스트 명령")).toHaveValue("테스트 입력");
  await expect(page.locator(".voice-readout p")).toHaveText("테스트 입력");
  await expect(page.locator("pre")).toContainText("아직 생성된 Mermaid 소스가 없습니다.");
  await expect(page.getByText("아직 실행된 도구가 없습니다.")).toBeVisible();
});

test("downloads a rendered diagram image without canvas security errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("flowchart TD");
  await expect(page.locator(".diagram-stage svg")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG" }).first().click();
  const download = await downloadPromise;

  expect(["malgrim-diagram.png", "malgrim-diagram.svg"]).toContain(download.suggestedFilename());
  expect(pageErrors.join("\n")).not.toContain("Tainted canvases");
  expect(pageErrors.join("\n")).not.toContain("toBlob");
});

test("keeps diagram labels in exported SVG assets", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator(".diagram-stage svg")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG" }).first().click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(downloadPath).toBeTruthy();
  const exportedSvg = await readFile(downloadPath!, "utf8");

  expect(exportedSvg).toContain("아이디어 선정");
  expect(exportedSvg).toContain("요구사항 정리");
  expect(exportedSvg).toContain("프로토타입 구현");
  expect(exportedSvg).not.toContain("foreignObject");
});