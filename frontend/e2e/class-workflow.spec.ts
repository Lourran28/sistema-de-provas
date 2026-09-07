import { expect, test, type Page } from "@playwright/test";

const user = { id: "teacher-1", name: "Ana", email: "ana@example.test", role: "TEACHER" };
const now = "2026-09-05T15:00:00Z";
const subject = { id: "subject-1", name: "Português", description: null, createdAt: now, updatedAt: now };

async function authenticate(page: Page) {
  await page.addInitScript(() => localStorage.setItem("provas.access-token", "test-token"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok" } }));
}

test("correction asks only for the class", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/exam-versions", (route) => route.fulfill({ json: [{
    id: "version-1", examId: "exam-1", examTitle: "Prova de Português", label: "A", status: "GENERATED", generatedAt: now,
    questions: [{ id: "vq-1", originalQuestionId: "q-1", position: 1, points: 10, statement: "Questão", imageUrl: null, alternatives: [{ alternativeId: "a-1", text: "Resposta", position: 1 }] }],
    answerKey: [{ questionPosition: 1, correctAlternativeId: "a-1", correctLetter: "A" }]
  }] }));
  await page.goto("/correcao");
  await page.getByLabel("Versão oficial").selectOption("version-1");
  await expect(page.getByLabel("Turma", { exact: true })).toBeVisible();
  await expect(page.getByText("Aluno cadastrado")).toHaveCount(0);
  await expect(page.getByText("Nome do aluno")).toHaveCount(0);
});

test("content form has the requested fields and file import", async ({ page }, testInfo) => {
  await authenticate(page);
  await page.route("**/api/subjects", (route) => route.fulfill({ json: [subject] }));
  await page.route("**/api/contents/topics", (route) => route.fulfill({ json: [] }));
  await page.route(/\/api\/contents(?:\?.*)?$/, (route) => route.fulfill({ json: { items: [], page: { number: 0, size: 12, totalElements: 0, totalPages: 0 } } }));
  await page.goto("/conteudos");
  await page.getByRole("button", { name: "Novo conteúdo" }).click();
  await expect(page.locator("#content-subject")).toBeVisible();
  await expect(page.locator("#content-theme")).toBeVisible();
  await expect(page.locator("#content-title")).toBeVisible();
  await expect(page.getByText("PDF, slides PPTX")).toBeVisible();
  const fileInput = page.locator('input[type="file"][accept*="application/pdf"]');
  await expect(fileInput).toHaveCount(1);
  await fileInput.setInputFiles({
    name: "material.pdf",
    mimeType: "application/pdf",
    buffer: createTextPdf("Conteudo importado do PDF"),
  });
  await expect(page.locator("#content-body")).toHaveValue(/Conteudo importado do PDF/);
  await expect(page.getByText("Texto importado de material.pdf")).toBeVisible();
  await expect(page.getByText("Assunto", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Observações", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("content-form.png"), fullPage: true });
});

test("shows class performance and trend", async ({ page }, testInfo) => {
  await authenticate(page);
  const correction = (id: string, classGroup: string, score: number, createdAt: string) => ({
    id, examVersionId: "version-1", examTitle: "Prova de Português", versionLabel: "A", studentId: null, studentName: "Registro da turma", studentIdentifier: null, classGroup,
    status: "CONFIRMED", score, totalScore: 10, correctCount: score, wrongCount: 10 - score, blankCount: 0, ambiguousCount: 0, reviewedAt: createdAt, createdAt, answers: []
  });
  await page.route("**/api/corrections", (route) => route.fulfill({ json: [correction("c1", "8º A", 5, "2026-08-01T12:00:00Z"), correction("c2", "8º A", 8, "2026-09-01T12:00:00Z"), correction("c3", "8º B", 6, "2026-09-01T12:00:00Z")] }));
  await page.goto("/resultados");
  await expect(page.getByRole("heading", { name: "Desempenho das turmas" })).toBeVisible();
  await expect(page.locator("h2:visible", { hasText: "8º A" })).toBeVisible();
  await expect(page.locator('span:visible:text-is("+30 p.p.")')).toBeVisible();
  await expect(page.getByText("Aluno", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("class-performance.png"), fullPage: true });
});

test("question editing confirms the saved action", async ({ page }) => {
  await authenticate(page);
  let statement = "Questão original";
  const question = () => ({ id: "question-1", subjectId: subject.id, statement, imageUrl: null, questionType: "MULTIPLE_CHOICE", difficulty: "MEDIUM", sourceType: "MANUAL", status: "ACTIVE", contentIds: [], alternatives: [{ id: "alt-1", text: "Certa", position: 1, correct: true }, { id: "alt-2", text: "Errada", position: 2, correct: false }], createdAt: now, updatedAt: now });
  await page.route("**/api/subjects", (route) => route.fulfill({ json: [subject] }));
  await page.route(/\/api\/contents(?:\?.*)?$/, (route) => route.fulfill({ json: { items: [], page: { number: 0, size: 100, totalElements: 0, totalPages: 0 } } }));
  await page.route(/\/api\/questions(?:\?.*)?$/, (route) => route.fulfill({ json: { items: [question()], page: { number: 0, size: 12, totalElements: 1, totalPages: 1 } } }));
  await page.route("**/api/questions/question-1", async (route) => {
    statement = route.request().postDataJSON().statement;
    await route.fulfill({ json: question() });
  });
  await page.goto("/questoes");
  await expect(page.locator("th", { hasText: "Origem" })).toHaveCount(1);
  await expect(page.locator("th", { hasText: "Conteúdo" })).toHaveCount(0);
  await page.getByRole("button", { name: "Editar questão" }).click();
  await expect(page.getByLabel("Conteúdo de origem")).toHaveCount(0);
  await page.getByLabel("Enunciado").fill("Questão atualizada");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText("Questão atualizada com sucesso");
  expect(statement).toBe("Questão atualizada");
});

function createTextPdf(text: string) {
  const escapedText = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${escapedText}) Tj\nET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
