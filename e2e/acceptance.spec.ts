import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const GOLDEN = "M7.nura,M8.nura,M10.nura,M12,M5.saryarka";
const EXPERTS = ["Айгерим", "Ерлан", "Гульнара", "Тимур", "Дана", "Дастан"];

async function enterTeam(page: Page, name: string) {
  await page.goto("/");
  await page.getByPlaceholder("Например, «Левый берег»").fill(name);
  await page.getByRole("button", { name: "Стать акимом" }).click();
  await expect(page).toHaveURL(/\/play/);
}

test.describe("Аким на 5 часов — приёмка", () => {
  test("брифинг показывает базовый Score и критические провалы Нуры", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("52.56").first()).toBeVisible();
    await expect(page.getByText("Нура").first()).toBeVisible();
  });

  test("кабинет: живой Score 56.54 для примера кейса и блокировка невалидного набора", async ({ page }) => {
    await enterTeam(page, "E2E приёмка");
    await page.goto(`/play?s=${GOLDEN}`);
    await expect(page.getByText("56.54").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "На консилиум" })).toBeEnabled();

    await page.goto("/play?s=M7.nura,M8.nura,M10.nura,M12");
    await expect(page.getByRole("button", { name: "На консилиум" })).toBeDisabled();
    await expect(page.getByText(/ровно 5 решений/)).toBeVisible();

    await page.goto("/play?s=M1.esil,M3.nura,M12,M10.nura,M9.nura");
    await expect(page.getByRole("button", { name: "На консилиум" })).toBeDisabled();
    await expect(page.getByText(/несовместимы/).first()).toBeVisible();
  });

  test("полный сценарий: консилиум → вердикт → лидерборд → презентация → событие", async ({ page, request }) => {
    await enterTeam(page, "E2E приёмка");
    await page.goto(`/play?s=${GOLDEN}`);
    await page.getByRole("button", { name: "На консилиум" }).click();
    await expect(page).toHaveURL(/\/result\/live/);

    // live page streams stages; done event redirects to /result/<uuid>
    await expect(page).toHaveURL(/\/result\/[0-9a-f-]{36}$/, { timeout: 170_000 });
    const runId = page.url().split("/result/")[1];

    await expect(page.getByText("56.54").first()).toBeVisible();
    await expect(page.getByText("Резолюция").first()).toBeVisible();
    await expect(page.getByText("Как считалось").first()).toBeVisible();
    await expect(page.getByText("Районы до и после").first()).toBeVisible();

    // W2: quarter slider replays the plan; quarter 0 is the baseline, quarter 8 the engine result
    await page.getByText("Районы до и после").first().click();
    const slider = page.getByRole("slider", { name: "Квартал" });
    await expect(slider).toBeVisible();
    await slider.focus();
    await slider.press("Home");
    await expect(page.getByText("Score к кварталу 0: 52.56")).toBeVisible();
    await slider.press("End");
    await expect(page.getByText("Score к кварталу 8: 56.54")).toBeVisible();
    for (const name of EXPERTS) await expect(page.getByText(name).first()).toBeVisible();

    // round-3 UI: event card, pitch link, usage panel
    await expect(page.getByRole("heading", { name: /Внезапное событие/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Перераспределить бюджет" })).toHaveAttribute("href", /\/play\?s=/);
    await expect(page.getByRole("link", { name: /Скачать краткую презентацию/ })).toHaveAttribute("href", `/api/runs/${runId}/pitch`);
    await expect(page.getByText(/длительность:/)).toBeVisible();

    const run = await request.get(`/api/runs/${runId}`);
    expect(run.ok()).toBeTruthy();
    const body = await run.json();
    expect(body.engine.score).toBeCloseTo(56.54, 2);
    if (body.llmEnabled) await expect(page.getByRole("button", { name: "Озвучить резолюцию" })).toBeVisible();
    expect(body.opinions).toHaveLength(6);
    expect(body.reviews.length).toBeGreaterThanOrEqual(1);
    expect(["approve", "approve_with_conditions", "return"]).toContain(body.resolution.outcome);

    const pitch = await request.get(`/api/runs/${runId}/pitch`);
    expect(pitch.ok()).toBeTruthy();
    expect(pitch.headers()["content-type"]).toContain("text/markdown");
    expect(await pitch.text()).toContain("56.54");

    const event = await request.get(`/api/runs/${runId}/event`);
    expect(event.ok()).toBeTruthy();
    const ev = await event.json();
    expect(ev.scoreAfter).toBeLessThan(ev.scoreBefore);

    await page.goto("/leaderboard");
    await expect(page.getByText("E2E приёмка").first()).toBeVisible();
  });

  test("неизвестный прогон даёт 404, невалидное тело даёт 400", async ({ page, request }) => {
    const res = await page.goto("/result/does-not-exist");
    expect(res?.status()).toBe(404);
    const bad = await request.post("/api/run", { data: { teamName: "x", scenario: { decisions: [{ measureId: "M99" }] } } });
    expect(bad.status()).toBe(400);
  });

  test("песочница: свой датасет меняет Score, битый файл даёт ошибки", async ({ page, request }) => {
    const template = (await (await request.get("/dataset-hackalem.json")).json()) as {
      name: string;
      districts: { id: string; indicators: Record<string, number> }[];
    };
    template.name = "Тестовый город";
    template.districts.find((d) => d.id === "nura")!.indicators.S1 = 60;
    const good = test.info().outputPath("ds.json");
    const broken = test.info().outputPath("broken.json");
    await writeFile(good, JSON.stringify(template));
    await writeFile(broken, JSON.stringify({ name: "x" }));

    await page.goto("/sandbox");
    await expect(page.getByRole("heading", { name: "Песочница: свои данные" })).toBeVisible();
    const input = page.getByLabel("Загрузить датасет");

    await input.setInputFiles(broken);
    await expect(page.getByRole("listitem").filter({ hasText: /^districts:/ })).toBeVisible();

    await input.setInputFiles(good);
    await expect(page.getByRole("heading", { name: "Тестовый город" })).toBeVisible();
    await page.getByRole("button", { name: "Играть на этих данных" }).click();
    await expect(page).toHaveURL(/\/play/);
    await expect(page.getByText("Песочница: Тестовый город")).toBeVisible();

    await page.goto(`/play?s=${GOLDEN}`);
    await expect(page.getByText("Песочница: Тестовый город")).toBeVisible();
    await expect(page.getByRole("button", { name: "На консилиум" })).toBeEnabled();
    await expect(page.getByText("56.54")).toHaveCount(0);

    await page.getByRole("button", { name: "Вернуться к данным кейса" }).click();
    await expect(page.getByText("Песочница: Тестовый город")).toHaveCount(0);
    await expect(page.getByText("56.54").first()).toBeVisible();
  });
});
