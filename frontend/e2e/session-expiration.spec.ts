import { expect, test } from "@playwright/test";

const user = { id: "teacher-1", name: "Ana", email: "ana@example.test", role: "TEACHER" };

test("redirects to login when an authenticated request expires", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("provas.access-token", "expired-token"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok" } }));
  await page.route("**/api/subjects", (route) => route.fulfill({ json: [] }));
  await page.route(/\/api\/contents(?:\?.*)?$/, (route) => route.fulfill({
    status: 401,
    json: { message: "Autenticação necessária para acessar este recurso." },
  }));

  await page.goto("/conteudos");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status")).toContainText("Sua sessão expirou");
  await expect(page.evaluate(() => localStorage.getItem("provas.access-token"))).resolves.toBeNull();
});
