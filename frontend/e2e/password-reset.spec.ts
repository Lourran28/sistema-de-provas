import { expect, test } from "@playwright/test";

const token = "a".repeat(43);
const user = { id: "test-user", name: "Ana", email: "ana@example.test", role: "TEACHER" };

test("requests another link after success, without submitting stored session", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("provas.access-token", "expired-token"));
  await page.route("**/api/auth/me", route => route.fulfill({ status: 401, json: { message: "Expired" } }));
  const requests: { email: string; authorization?: string }[] = [];
  await page.route("**/api/auth/password/forgot", async route => {
    requests.push({ ...route.request().postDataJSON(), authorization: route.request().headers().authorization });
    await route.fulfill({ status: 204 });
  });
  await page.goto("/esqueci-senha");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.screenshot({ path: testInfo.outputPath("forgot-form.png"), fullPage: true });
  await page.getByRole("button", { name: "Enviar link", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
  await page.getByRole("button", { name: "Solicitar outro link" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("outra@example.test");
  await page.getByRole("button", { name: "Enviar link", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
  expect(requests).toEqual([
    { email: "ana@example.test", authorization: undefined },
    { email: "outra@example.test", authorization: undefined },
  ]);
});

test("allows logged-in user to reset with fragment token and then signs out", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("provas.access-token", "old-session"));
  await page.route("**/api/auth/me", route => route.fulfill({ json: user }));
  const submissions: unknown[] = [];
  await page.route("**/api/auth/password/reset", async route => {
    submissions.push(route.request().postDataJSON());
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ status: 204 });
  });
  await page.goto(`/redefinir-senha#token=${token}`);
  await expect(page.getByRole("heading", { name: "Criar nova senha" })).toBeVisible();
  await page.getByLabel("Nova senha", { exact: true }).fill("new-password");
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("different-password");
  await page.getByRole("button", { name: "Salvar nova senha", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("não são iguais");
  expect(submissions).toHaveLength(0);
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("new-password");
  await page.getByRole("button", { name: "Mostrar senhas", exact: true }).click();
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveAttribute("type", "text");
  await page.screenshot({ path: testInfo.outputPath("reset-form.png"), fullPage: true });
  await page.getByRole("button", { name: "Salvar nova senha", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Senha redefinida" })).toBeVisible();
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  expect(await page.evaluate(() => localStorage.getItem("provas.access-token"))).toBeNull();
  expect(submissions).toEqual([{ token, newPassword: "new-password" }]);
  await page.screenshot({ path: testInfo.outputPath("reset-success.png"), fullPage: true });
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
});

test("handles legacy query link, expired response and request-new-link action", async ({ page }) => {
  await page.route("**/api/auth/password/reset", route => route.fulfill({
    status: 400, json: { message: "Este link expirou. Solicite uma nova redefinição de senha." },
  }));
  await page.goto(`/redefinir-senha?token=${token}`);
  await page.getByLabel("Nova senha", { exact: true }).fill("new-password");
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("new-password");
  await page.getByRole("button", { name: "Salvar nova senha", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("expirou");
  await page.getByRole("link", { name: "Solicitar novo link" }).click();
  await expect(page.getByRole("heading", { name: "Redefinir senha", exact: true })).toBeVisible();
});

test("rejects missing token and keeps the form within the viewport", async ({ page }, testInfo) => {
  await page.goto("/redefinir-senha");
  await expect(page.getByRole("alert")).toContainText("inválido");
  await expect(page.getByRole("button", { name: "Salvar nova senha", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("reset-invalid.png"), fullPage: true });
});

test("profile password change logs out and explains the new login", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("provas.access-token", "old-session"));
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me/password")) return route.fulfill({ status: 204 });
    if (path.endsWith("/auth/me")) return route.fulfill({ json: user });
    return route.fulfill({ json: { status: "ok" } });
  });
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
  await page.getByLabel("Senha atual", { exact: true }).fill("old-password");
  await page.getByLabel("Nova senha", { exact: true }).fill("new-password");
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("new-password");
  await page.getByRole("button", { name: "Salvar nova senha", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status")).toContainText("Senha alterada");
  expect(await page.evaluate(() => localStorage.getItem("provas.access-token"))).toBeNull();
});
