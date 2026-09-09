import { expect, test } from "@playwright/test";

const now = "2026-09-09T12:00:00Z";
const expectedAnswers = ["B", "D", "A", "A", "C", "C", "D", "B", "A", "D"];
const version = {
  id: "version-rotated",
  examId: "exam-rotated",
  examTitle: "Prova fotografada",
  label: "A",
  status: "GENERATED",
  generatedAt: now,
  questions: Array.from({ length: 10 }, (_, questionIndex) => ({
    id: `version-question-${questionIndex + 1}`,
    originalQuestionId: `question-${questionIndex + 1}`,
    position: questionIndex + 1,
    points: 1,
    statement: `Questão ${questionIndex + 1}`,
    imageUrl: null,
    alternatives: Array.from({ length: 4 }, (_, alternativeIndex) => ({
      alternativeId: `alternative-${questionIndex + 1}-${alternativeIndex + 1}`,
      text: `Alternativa ${alternativeIndex + 1}`,
      position: alternativeIndex + 1,
    })),
  })),
  answerKey: [],
};

test("reads a rotated answer card by its printed grid", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 720, height: 1280 });
  await page.setContent(buildRotatedCard());
  const photographedCard = await page.screenshot({ type: "png" });

  await page.addInitScript(() => localStorage.setItem("provas.access-token", "test-token"));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    json: { id: "teacher-1", name: "Ana", email: "ana@example.test", role: "TEACHER" },
  }));
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok" } }));
  await page.route("**/api/exam-versions", (route) => route.fulfill({ json: [version] }));

  await page.goto("/correcao");
  await page.getByLabel("Versão oficial").selectOption(version.id);
  await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles({
    name: "cartao-girado.png",
    mimeType: "image/png",
    buffer: photographedCard,
  });

  await expect(page.getByText("Análise concluída")).toBeVisible();
  const analysisSummary = page.getByText("Análise concluída").locator("..");
  await expect(analysisSummary.getByText("Marcadas", { exact: true }).locator("..")).toContainText("10");
  await expect(analysisSummary.getByText("Em branco", { exact: true }).locator("..")).toContainText("0");
  await expect(analysisSummary.getByText("Para revisar", { exact: true }).locator("..")).toContainText("0");

  for (let questionIndex = 0; questionIndex < expectedAnswers.length; questionIndex += 1) {
    const group = page.getByRole("group", { name: `Resposta da questão ${questionIndex + 1}`, exact: true });
    await expect(group.locator('button[aria-pressed="true"]')).toHaveText(expectedAnswers[questionIndex]);
  }

  await page.screenshot({ path: testInfo.outputPath("rotated-card-result.png"), fullPage: true });
});

function buildRotatedCard() {
  const rowLines = Array.from({ length: 12 }, (_, index) => `<line x1="0" y1="${index * 34}" x2="520" y2="${index * 34}" />`).join("");
  const columnPositions = [0, 124.8, 223.6, 322.4, 421.2, 520];
  const columnLines = columnPositions.map((position) => `<line x1="${position}" y1="0" x2="${position}" y2="374" />`).join("");
  const bubbles = expectedAnswers.flatMap((answer, questionIndex) => Array.from({ length: 4 }, (_, alternativeIndex) => {
    const centerX = 520 * (0.24 + ((alternativeIndex + 0.5) * 0.76) / 4);
    const centerY = (questionIndex + 1.5) * 34;
    const marked = "ABCD"[alternativeIndex] === answer;
    return `<circle cx="${centerX}" cy="${centerY}" r="8.5" fill="${marked ? "#3b1d82" : "#ffffff"}" stroke="#172033" stroke-width="1.5" />`;
  })).join("");

  return `
    <style>html,body { margin: 0; width: 720px; height: 1280px; overflow: hidden; }</style>
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
      <rect width="720" height="1280" fill="#c8bca4" />
      <rect x="40" y="55" width="190" height="110" fill="#172033" />
      <rect x="490" y="80" width="150" height="95" fill="#273244" />
      <path d="M70 245 L635 260 L620 1010 L45 995 Z" fill="#ffffff" />
      <g transform="translate(560 350) rotate(90) skewX(-2)" stroke="#475569" stroke-width="1" fill="none">
        ${rowLines}
        ${columnLines}
        ${bubbles}
      </g>
    </svg>`;
}
