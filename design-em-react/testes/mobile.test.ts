import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TeamTalk", exact: true })).toBeVisible();
});

test("navega por toque, retorna e mantém o destino ativo", async ({ page }) => {
  await page.getByRole("navigation").getByRole("button", { name: "Orientações" }).tap();
  await expect(page.getByRole("heading", { name: "Navegação no celular" })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("button", { name: "Orientações" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Voltar para componentes" }).tap();
  await expect(page.getByRole("heading", { name: "Ações claras" })).toBeVisible();
  await page.getByRole("button", { name: "Ação principal", exact: true }).tap();
  await expect(page.getByRole("status")).toHaveText("Ação de exemplo concluída.");
});

for (const tamanho of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test.describe(`viewport ${tamanho.width}x${tamanho.height}`, () => {
    // Define o viewport antes de criar a página: WebKit mobile conserva unidades
    // dinâmicas do viewport anterior quando o tamanho muda por automação.
    test.use({ viewport: tamanho });
    test("preserva toque, rolagem e largura", async ({ page }) => {
      const controles = page.locator("button, input");
      for (const controle of await controles.all()) {
        const retangulo = await controle.boundingBox();
        expect(retangulo?.width).toBeGreaterThanOrEqual(44);
        expect(retangulo?.height).toBeGreaterThanOrEqual(44);
      }
      for (const campo of await page.locator("input").all()) {
        expect(await campo.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (tamanho.width === 390) await page.screenshot({ path: test.info().outputPath("galeria.png") });
      const navegacao = page.getByRole("navigation");
      const antes = await navegacao.boundingBox();
      expect(antes!.y + antes!.height).toBeCloseTo(await page.evaluate(() => innerHeight), 0);
      await page.getByRole("main").evaluate((el) => { el.scrollTop = el.scrollHeight; });
      expect(await navegacao.boundingBox()).toEqual(antes);
      expect(antes!.y + antes!.height).toBeLessThanOrEqual(tamanho.height);
      await expect(page.getByRole("heading", { name: "Estados com texto" })).toBeInViewport();
    });
  });
}

test("mantém foco visível, salto para conteúdo e descrições de erro", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("Tab");
  const focado = page.locator(":focus");
  expect(await focado.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  expect(await focado.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole("textbox", { name: "Campo com erro de exemplo" })).toHaveAttribute("aria-describedby", "exemplo-erro-erro");
});

test.describe("acessibilidade em 320px", () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test("suporta texto ampliado e movimento reduzido", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("navigation")).toBeInViewport();
    expect(await page.getByRole("button", { name: "Ação principal", exact: true }).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  });
});
