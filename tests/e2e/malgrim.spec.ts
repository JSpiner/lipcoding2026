import { expect, test } from "@playwright/test";

test("creates a hackathon flowchart from the UI", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("텍스트 명령").fill("해커톤 진행 프로세스를 플로우차트로 생성해줘");
  await page.getByRole("button", { name: "명령 실행" }).click();

  await expect(page.locator("pre")).toContainText("아이디어 선정");
  await expect(page.locator("pre")).toContainText("요구사항 정리");
  await expect(page.locator("pre")).toContainText("프로토타입 구현");
  await expect(page.getByText("create_diagram").first()).toBeVisible();
  await expect(page.locator("pre")).toContainText("flowchart TD");
  await expect(page.locator("pre")).toContainText("n1 --> n2");
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