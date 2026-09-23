import { describe, expect, it } from "vitest";
import sample from "../../../fixtures/sample-run.json";
import type { Run } from "@/lib/types";
import { humanizeChange, humanizeRun, humanizeText } from "./humanize";

const CODE = /\bM(1[0-4]|[1-9])\b/;

describe("humanize", () => {
  it("rewrites backend change strings without codes", () => {
    expect(humanizeChange("M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура")).toBe("Чистое топливо в Сарыарке → линия ЛРТ в Нуре");
    expect(humanizeChange("M7 Есиль → M7 Нура")).toBe("Школа и детсад в Есиле → школа и детсад в Нуре");
    expect(humanizeChange("M5 Сарыарка → M14 Аварийные бригады ЖКХ + раннее оповещение (город)")).toBe(
      "Чистое топливо в Сарыарке → аварийные бригады ЖКХ на весь город",
    );
    expect(humanizeChange("M12 город → M3 Линия ЛРТ / расширение, Нура")).toBe(
      "Цифровая платформа обращений на весь город → линия ЛРТ в Нуре",
    );
  });
  it("replaces codes in free text and keeps numbers", () => {
    expect(humanizeText("синергия M10+M12 даёт +2")).toBe("синергия «освещение и камеры» + «цифровая платформа обращений» даёт +2");
    expect(humanizeText("Вклад M5 «Перевод частного сектора» +0.17")).toBe("Вклад «чистое топливо» +0.17");
    expect(humanizeText("M1 и M13 несовместимы. M5 снижает смог")).toBe(
      "«Автобусные полосы» и «модернизация сетей» несовместимы. «Чистое топливо» снижает смог",
    );
    expect(humanizeText("M7 «Школа + детсад (модульное строительство)»: укажите район")).toBe("«Школа и детсад»: укажите район");
    expect(humanizeText("M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура, Score 57.21 (+0.66)")).toBe(
      "Чистое топливо в Сарыарке → линия ЛРТ в Нуре, Score 57.21 (+0.66)",
    );
    expect(humanizeText("Оптимизатор предлагает M7 Есиль → M7 Нура.")).toBe(
      "Оптимизатор предлагает школа и детсад в Есиле → школа и детсад в Нуре.",
    );
  });
  it("leaves no measure codes in a humanized run", () => {
    const run = humanizeRun(sample as Run);
    const { scenario: _scenario, engine, ...rest } = run; // decisions keep ids by design
    void _scenario;
    expect(JSON.stringify({ ...rest, synergies: engine.synergies })).not.toMatch(
      /"(?:change|text|summary|risk|tradeoff|justification|reason|topic|quote|caveat)":"[^"]*\bM(1[0-4]|[1-9])\b/,
    );
    expect(run.engine.score).toBe(56.54);
    expect(CODE.test(run.resolution.mandates[0].improvement.change)).toBe(false);
  });
});
