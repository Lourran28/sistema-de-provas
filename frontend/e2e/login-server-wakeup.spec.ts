import { expect, test } from "@playwright/test";

test("explains a slow server start during login", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, json: { message: "Unauthorized" } }));
  await page.route("**/api/auth/login", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route.fulfill({ status: 503, json: { message: "Servidor indisponível" } });
  });

  await page.goto("/login");
  await page.getByLabel("E-mail").fill("professor@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-segura");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page.getByRole("status")).toContainText("Iniciando o servidor", { timeout: 4_000 });
});
