import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/agent", {
    data: { reset: true },
  });

  expect(response.ok()).toBeTruthy();
});

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

test("zooms and pans the diagram canvas", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("아이디어 선정");

  const transformLayer = page.getByTestId("diagram-transform-layer");
  await expect(transformLayer).toBeVisible();

  await page.getByRole("button", { name: "다이어그램 확대" }).click();
  await expect(page.getByText("115%", { exact: true })).toBeVisible();
  await expect(transformLayer).toHaveCSS("transform", /matrix\(1\.15/);

  await page.getByRole("button", { name: "다이어그램 오른쪽 이동" }).click();
  await page.getByRole("button", { name: "다이어그램 아래로 이동" }).click();
  await expect(transformLayer).toHaveCSS("transform", /matrix\(1\.15, 0, 0, 1\.15, 48, 48\)/);

  await page.getByRole("button", { name: "다이어그램 보기 초기화" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(transformLayer).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
});

test("creates a non-empty parking lot bidding flowchart", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("주차장 입찰 로직 플로우차트를 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("flowchart TD");
  await expect(page.locator("pre")).toContainText("입찰 공고 확인");
  await expect(page.locator("pre")).toContainText("입찰 조건 검토");
  await expect(page.locator("pre")).toContainText("입찰가 산정");
  await expect(page.locator("pre")).toContainText("n1 --> n2");
  await expect(page.getByText("create_flow_from_steps").first()).toBeVisible();
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

test("inserts a quantity change step from the cart step", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("온라인 쇼핑몰 주문 처리 흐름을 플로우차트로 그려줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("n1 --> n2");

  await page.getByLabel("텍스트 명령").fill("결제 실패 분기를 추가하고 실패하면 결제 단계로 재시도 루프 넣어줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("결제 실패");

  await page.getByLabel("텍스트 명령").fill("장바구니에서 수량을 변경하는 단계를 추가해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("수량 변경");
  await expect(page.locator("pre")).not.toContainText("n1 --> n2");
  await expect(page.locator("pre")).toContainText(/n1 --> n\d+/);
  await expect(page.locator("pre")).toContainText(/n\d+ --> n2/);
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

test("undoes the latest diagram change", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("아이디어 선정");

  await page.getByLabel("텍스트 명령").fill("요구사항 정리 전에 유저 인터뷰 단계를 추가해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();
  await expect(page.locator("pre")).toContainText("유저 인터뷰");

  await page.getByRole("button", { name: "마지막 변경 되돌리기" }).click();

  await expect(page.locator("pre")).not.toContainText("유저 인터뷰");
  await expect(page.locator("pre")).toContainText("요구사항 정리");
  await expect(page.getByText("undo").first()).toBeVisible();
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

test("corrects speech text through the correction endpoint", async ({ request }) => {
  const response = await request.post("/api/correction", {
    data: { text: "요구 사항 정리 전에 유저 인트뷰 단계를 추가해줘" },
  });
  const payload = await response.json();

  expect(response.status()).toBe(200);
  expect(["rule", "azure-openai"]).toContain(payload.source);
  expect(payload).toMatchObject({
    original: "요구 사항 정리 전에 유저 인트뷰 단계를 추가해줘",
    corrected: "요구사항 정리 전에 유저 인터뷰 단계를 추가해줘",
    risk: "safe",
    applied: true,
  });
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

test("corrects safe final speech text before writing it into the command input", async ({ page }) => {
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
            results: [{ 0: { transcript: "요구 사항 정리 전에 유저 인트뷰 단계를 추가해줘" }, length: 1, isFinal: true }],
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

  await expect(page.getByLabel("텍스트 명령")).toHaveValue("요구사항 정리 전에 유저 인터뷰 단계를 추가해줘");
  await expect(page.getByLabel("음성 교정 제안")).toContainText("AUTO CORRECT");
  await expect(page.locator("pre")).toContainText("아직 생성된 Mermaid 소스가 없습니다.");
  await expect(page.getByText("아직 실행된 도구가 없습니다.")).toBeVisible();
});

test("keeps destructive speech corrections manual", async ({ page }) => {
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
            results: [{ 0: { transcript: "전체 지어줘" }, length: 1, isFinal: true }],
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

  await expect(page.getByLabel("텍스트 명령")).toHaveValue("전체 지어줘");
  await expect(page.getByLabel("음성 교정 제안")).toContainText("전체 지워줘");
  await expect(page.getByLabel("음성 교정 제안")).toContainText("위험하거나 모호한 명령은 자동 적용하지 않았습니다.");
  await expect(page.locator("pre")).toContainText("아직 생성된 Mermaid 소스가 없습니다.");
});

test("falls back safely when correction endpoint fails", async ({ page }) => {
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
            results: [{ 0: { transcript: "요 구 사 항 정리 전에 사용자 인터부 단계를 추가해줘" }, length: 1, isFinal: true }],
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

  await page.route("/api/correction", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 503,
      body: JSON.stringify({ message: "temporary failure" }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "REC" }).click();

  await expect(page.getByLabel("텍스트 명령")).toHaveValue("요구사항 정리 전에 사용자 인터뷰 단계를 추가해줘");
  await expect(page.locator(".voice-readout p")).toHaveText("요구사항 정리 전에 사용자 인터뷰 단계를 추가해줘");
  await expect(page.getByLabel("음성 교정 제안")).toContainText("AUTO CORRECT");
  await expect(page.locator("pre")).toContainText("아직 생성된 Mermaid 소스가 없습니다.");
});

test("keeps UI responsive when correction endpoint is delayed", async ({ page }) => {
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
            results: [{ 0: { transcript: "요 구 사 항 정리 전에 사용자 인터부 단계를 추가해줘" }, length: 1, isFinal: true }],
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

  await page.route("/api/correction", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        original: "요 구 사 항 정리 전에 사용자 인터부 단계를 추가해줘",
        corrected: "요구사항 정리 전에 사용자 인터뷰 단계를 추가해줘",
        confidence: 0.97,
        source: "azure-openai",
        risk: "safe",
        applied: true,
        reason: "Azure OpenAI 기반 교정 결과를 반영했습니다.",
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "REC" }).click();

  await expect(page.getByLabel("텍스트 명령")).toHaveValue("요구사항 정리 전에 사용자 인터뷰 단계를 추가해줘");
  await expect(page.getByLabel("음성 교정 제안")).toContainText("AUTO CORRECT");
  await expect(page.locator("pre")).toContainText("아직 생성된 Mermaid 소스가 없습니다.");
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