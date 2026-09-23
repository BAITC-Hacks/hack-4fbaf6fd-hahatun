# «Аким на 5 часов» — спека MVP

Дата: 2026-09-23. Хакатон HackAlem AI, 5 часов. Команда: Амир (движок, консилиум, API, README, code-review), Мирас (UI).
Источник требований: бриф задачи и «Датасет районов» (копии в `docs/source/`).

## 0. Правила хакатона, влияющие на код и процесс

Из инструкций организаторов (участие, кибербезопасность, README). Нарушение = дисквалификация.

1. **Секреты никогда не попадают в git.** `.env` в `.gitignore` с первого коммита, в репо только `.env.example` с пустыми значениями. Перед каждым push: `git diff --cached | grep -i "sk-"` пусто. Не публиковать ключи в презентации и чатах.
2. **Итоговый код только в репозитории команды, выданном платформой:** `github.com/BAITC-Hacks/hack-4fbaf6fd-hahatun`. Репозиторий приватный, доступ только команде и организаторам.
3. **Личный вклад каждого участника.** У Амира и Мираса свои ветки и свои коммиты под своими GitHub-аккаунтами. Squash при merge не делаем, чтобы история авторства сохранилась.
4. **Проект создаётся в рамках хакатона.** Из `orbita` переносим паттерны и идеи, не файлы. Никаких копий модулей.
5. **AI-агент использовать обязательно** (Codex или любой другой), это разрешено явно. Результаты AI проверяем сами: type-check, тесты, code-review.
6. **Данные:** только синтетический датасет организаторов. Реальные или персональные данные не используем. После хакатона удалить временные ключи.
7. **README по 11 пунктам организаторов** (раздел 10 ниже). Только то, что подтверждается кодом, ничего не выдумывать.
8. **Сдача:** последняя версия в `main`, затем на платформе «Сдать решение» с названием и описанием. Обновлять можно до дедлайна. Сдать черновик за 60 минут до конца, потом обновлять.
9. **Сеть:** только официальная сеть площадки, без хотспотов. Заранее проверить, что `yarn install` и OpenAI API работают из этой сети.
10. **Физика:** пересадки после старта запрещены, выходы суммарно ≤ 60 минут с отметкой у стюарда, последний час без выходов. Планировать перерывы до отметки 4:00.

## 1. Цель и критерии жюри

| Критерий | Баллы | Чем закрываем |
|---|---|---|
| Соответствие и работоспособность | 25 | три экрана, полный сценарий «бюджет → 5 решений → Score → объяснение» |
| Техническая реализация, agentic AI | 25 | детерминированный движок + консилиум с ревизорами, циклом пересмотра и арбитром |
| README и воспроизводимость | 25 | один `yarn dev`, один Dockerfile, `.env.example`, диаграмма, золотой тест |
| Ценность и применимость | 15 | резолюция с поручениями, перцентиль относительно всех валидных наборов |
| Потенциал и оригинальность | 10 | LLM не трогает числа, факты с ID, проверка цитат кодом, путь к Laya-судьям |

Must-have из брифа закрыты все: единый бюджет, 5 направлений, контроль бюджета, AI-анализ, Score, объяснение сильных сторон, рисков и последствий.

## 2. Принципы

1. **Код считает, LLM говорит.** Валидация, Score, дельты, оптимум, исход резолюции — код. LLM объясняет, спорит, пишет текст.
2. **Факты с ID.** Движок выдаёт пронумерованные факты (`F7: Нура S1 38 → 48`). Любая цифра в тексте LLM обязана быть среди фактов, это проверяет код.
3. **Ворота между шагами.** Каждый шаг отдаёт результат следующему только через zod-схему и проверку.
4. **Жёсткий cap.** Максимум 2 круга пересмотра. Дальше отдаём как есть с бейджем «проверено N из 6».
5. **Работает без ключа.** Пустой `OPENAI_API_KEY` → движок и оптимизатор работают, консилиум заменяется фикстурой с пометкой. Демо не падает.

## 3. Стек

- Next.js 16 App Router (фактическая версия после скаффолда 16.3), TypeScript, yarn.
- Tailwind + shadcn/ui, Recharts (radar, bar), lucide-react.
- Vercel AI SDK (`ai`, `@ai-sdk/openai`), `generateObject` + zod. Модели через env: `OPENAI_EXPERT_MODEL` (дешёвая), `OPENAI_JUDGE_MODEL` (средняя). ID моделей сверить на platform.openai.com/docs/pricing при старте.
- SQLite через Drizzle (`better-sqlite3`), файл `data/app.db`. Хранит прогоны для реплея и лидерборда.
- Vitest для движка. Один Dockerfile, `docker-compose.yml` с одним сервисом и volume под `data/`.
- Без авторизации. Команда вводит имя при запуске прогона.

## 4. Структура

```
src/
  app/
    page.tsx                    брифинг
    play/page.tsx               кабинет решений
    result/[runId]/page.tsx     вердикт + зал заседаний
    leaderboard/page.tsx        (Could)
    api/run/route.ts            POST → SSE ConsiliumEvent
    api/runs/route.ts           GET список прогонов
    api/runs/[id]/route.ts      GET прогон для реплея
  lib/
    types.ts                    КОНТРАКТ, меняется только через PR в main
    data/{districts,measures,weights,synergies}.ts
    engine/{validator,engine,facts,optimizer}.ts   чистые функции, без IO
    consilium/{llm,prompts,experts,synthesizer,reviewers,arbiter,pipeline}.ts
    db/{schema,client}.ts
  components/
    play/*   result/*   consilium/*   ui/* (shadcn)
fixtures/
  sample-run.json               полный прогон для разработки UI без бэка
docs/
  plan.md  backlog.md  source/
```

Движок импортируется и на клиенте (живой Score в кабинете), и на сервере (прогон). Один модуль, нет расхождений.

## 5. Контракт типов (`src/lib/types.ts`)

```ts
export type Direction = 'transport' | 'ecology' | 'social' | 'safety' | 'service';
export type Indicator = 'T1'|'T2'|'E1'|'E2'|'S1'|'S2'|'B1'|'B2'|'C1'|'C2';
export type DistrictId = 'esil' | 'almaty' | 'saryarka' | 'baikonur' | 'nura';
export type MeasureId = `M${1|2|3|4|5|6|7|8|9|10|11|12|13|14}`;

export interface Measure {
  id: MeasureId; direction: Direction; title: string;
  scope: 'district' | 'city'; cost: number; lag: number;
  effects: Partial<Record<Indicator, number>>;
}
export interface Decision { measureId: MeasureId; districtId?: DistrictId }
export interface Scenario { decisions: Decision[] }          // ровно 5

export type ValidationCode = 'COUNT'|'BUDGET'|'DUPLICATE'|'DISTRICT_REQUIRED'|'DISTRICT_FORBIDDEN'|'DIRECTION_CAP'|'CONFLICT';
export interface ValidationError { code: ValidationCode; message: string }
export interface ValidationResult { ok: boolean; errors: ValidationError[]; cost: number; remaining: number }

export interface DistrictResult {
  id: DistrictId; before: Record<Indicator, number>; after: Record<Indicator, number>;
  dBefore: number; dAfter: number;
}
export interface EngineResult {
  baseScore: number; score: number; delta: number;
  dAvg: number; minDistrict: { id: DistrictId; value: number };
  nCrit: number; criticals: { districtId: DistrictId; indicator: Indicator; value: number }[];
  districts: DistrictResult[];
  contributions: { measureId: MeasureId; delta: number }[];   // score(all) − score(all − m)
  synergies: string[];
}
export interface Improvement { scenario: Scenario; score: number; delta: number; change: string }
export interface OptimizerResult { bestScore: number; bestScenario: Scenario; percentile: number; improvements: Improvement[] }

export interface Fact { id: string; text: string; value?: number; scope: Direction | 'general' }

export type ExpertRole = Direction | 'finance';
export interface ExpertOpinion {
  role: ExpertRole; name: string; stance: 'support' | 'concern';
  summary: string; risk: string; tradeoff: string; factRefs: string[];
  suggestion?: Decision;
}
export interface Draft {
  version: number; strengths: string[]; risks: string[]; consequences: string[];
  recommendation: { improvement?: Improvement; text: string }; text: string;
}
export type ConditionId = 'C1'|'C2'|'C3'|'C4'|'C5'|'C6';
export interface ReviewCondition { id: ConditionId; by: 'code' | 'llm'; passed: boolean; reason: string; quote?: string }
export interface Review { round: number; conditions: ReviewCondition[]; passed: number; total: 6; ok: boolean }

export type Outcome = 'approve' | 'approve_with_conditions' | 'return';
export interface Resolution {
  outcome: Outcome;                                   // выбирает код
  disputes: { topic: string; sideTaken: ExpertRole; reason: string; factRefs: string[] }[];
  justification: string;
  mandates: { improvement: Improvement; text: string }[];
  caveat?: string;
}

export type Stage = 'validate' | 'engine' | 'optimize' | 'experts' | 'draft' | 'review' | 'arbiter' | 'persist';
export type ConsiliumEvent =
  | { type: 'stage'; stage: Stage; status: 'start' | 'done' | 'error'; message?: string }
  | { type: 'engine'; result: EngineResult; facts: Fact[] }
  | { type: 'optimizer'; result: OptimizerResult }
  | { type: 'expert'; opinion: ExpertOpinion }
  | { type: 'draft'; draft: Draft }
  | { type: 'review'; review: Review }
  | { type: 'resolution'; resolution: Resolution }
  | { type: 'done'; runId: string }
  | { type: 'error'; message: string };

export interface Run {
  id: string; teamName: string; createdAt: string; scenario: Scenario;
  engine: EngineResult; optimizer: OptimizerResult; opinions: ExpertOpinion[];
  drafts: Draft[]; reviews: Review[]; resolution: Resolution; llmEnabled: boolean;
  usage: { calls: number; tokens: number; costUsd: number; durationMs: number };
}
```

## 6. Движок (`lib/engine`)

**Валидатор** проверяет 8 правил брифа и возвращает все нарушения списком, не первое. Порядок решений не важен.

**Расчёт** строго по разделу 3 датасета: эффект × (8 − L)/8, синергии фиксированные в районе первой меры пары, clip 0..100, D_d по весам, D_avg по населению, Score = 0.7·D_avg + 0.3·min(D_d) − N_crit (строго < 40). Округление только при показе.

**Золотой тест:** база 52.56; пример M7 Нура + M8 Нура + M10 Нура + M12 + M5 Сарыарка = 56.54, N_crit 0. Проверено кодом до старта.

**Вклад меры:** score(набор) − score(набор без меры). Правила при выкидывании не проверяются, считается только формула.

**Факты:** генератор формирует список из EngineResult и OptimizerResult: итог, дельта, слабейший район, каждое критическое значение, каждое изменение показателя ≥ 1 пункта, вклад каждой меры, остаток бюджета, перцентиль, три улучшения. Каждому факту `scope` по направлению, чтобы эксперт получал своё.

**Оптимизатор:** полный перебор. 14 мер → C(14,5)=2002 комбинации ID, фильтр по лимиту 2 на направление и конфликтам, затем перебор районов для district-мер. Ожидается < 3 млн наборов, TS считает секунды. Результат кэшируется в `data/optimum.json` при первом запуске. Перцентиль = доля валидных наборов со Score ≤ пользовательского. Улучшения = лучшие 3 соседа (замена одной меры или её района), каждый валиден.

## 7. Консилиум (`lib/consilium`)

Пайплайн в `pipeline.ts`, эмитит `ConsiliumEvent` в SSE. Стадии:

1. `validate` → при ошибке `error` и стоп.
2. `engine` → `EngineResult` + `Fact[]`.
3. `optimize`.
4. `experts`: 6 параллельных вызовов дешёвой модели. Роли и имена: Айгерим (транспорт), Ерлан (экология), Гульнара (соцсфера), Тимур (безопасность), Дана (сервисы), Дастан (финансист). Вход: сценарий, факты своего scope + general, 3 улучшения. Выход по схеме `ExpertOpinion`, `factRefs` обязателен, код отбрасывает ссылки на несуществующие факты.
5. `draft`: синтезатор на средней модели. Вход: все мнения, все факты. Выход `Draft` v1. В JSON порядок полей: сначала strengths/risks/consequences, потом recommendation, потом text.
6. `review`: ревизоры.
   - C1 код: каждое число в `text` (regex, допуск ±0.05 и целые округления) найдено среди `Fact.value`.
   - C2 код: `recommendation.improvement` валиден и его score > пользовательского.
   - C3 LLM: назван слабейший район и причина.
   - C4 LLM: у каждой из 5 мер описан эффект.
   - C5 LLM: минимум один риск и один компромисс с причиной.
   - C6 LLM: нет утверждений о механизмах вне датасета.
   LLM-условия — один вызов средней модели со схемой `{conditions: [{id, reason, passed}]}` (reason раньше passed). Порог: passed ≥ 5. При провале синтезатору уходит список проваленных условий с reason и quote, он пишет v2. Максимум 2 круга. Все черновики и ревью сохраняются.
7. `arbiter`: исход выбирает код по таблице:

   | Outcome | Условие |
   |---|---|
   | approve | delta > 0 и nCrit = 0 и dAfter слабейшего района > dBefore |
   | approve_with_conditions | delta > 0, но nCrit > 0 или слабейший район не вырос |
   | return | delta ≤ 0, или последнее review не ok |

   LLM-арбитр получает исход, мнения, факты, последний draft, review, улучшения. Пишет `disputes` (только там, где эксперты расходятся по одной мере), `justification`, `mandates` (только из переданных улучшений, код отбрасывает чужие), `caveat` если review не 6/6.
8. `persist`: запись `Run` в SQLite, событие `done` с `runId`.

**LLM-обёртка (`llm.ts`)**, паттерны из `orbita`, написанные заново: retry на 429 с `Retry-After` и backoff (4 попытки), `promptFingerprint` = версия + sha256 системного промпта, текущая дата в системном промпте, трейс каждого вызова (роль, модель, версия промпта, токены, стоимость, длительность) в `Run.usage`, режим `disabled` при пустом ключе с фикстурными ответами.

**Оценка латентности:** эксперты 3–5 с, черновик 8 с, ревизоры 5 с, пересмотр +13 с, арбитр 5 с. Итого 20–40 с, прогресс стримится.

## 8. UI

**Брифинг `/`.** Пять плиток районов с цветом по D, профиль района в одну строку, базовый Score 52.56, бюджет 100, критические провалы Нуры красным. Поле «Название команды», кнопка «Стать акимом».

**Кабинет `/play`.** Слева каталог 14 карточек по 5 направлениям: цена, лаг, эффекты, бейджи «синергия с M2», «конфликт с M3». Выбор района для district-мер. Справа липкая панель: budget bar (красный при > 100), счётчик 5/5, лимит по направлениям, живой Score и дельта от движка на клиенте, список ошибок валидатора. Кнопка «На консилиум» активна только при `ok`.

**Вердикт `/result/[runId]`.** Шапка: Score, дельта, перцентиль, слабейший район, N_crit, бейдж «проверено N из 6», печать исхода. Radar выбранного района до/после с переключателем района, таблица 10 показателей со стрелками. Блок «Как считалось» с формулой.

**Зал заседаний** (внутри вердикта):
- Стол экспертов: 6 карточек, появляются по событиям, пульс пока думает, цвет позиции, риск, `factRefs` чипами, раскрытие.
- Табло ревизоров: 6 строк ✓/✕ с reason, метка «код» или «ревизор», итог «5 из 6, порог пройден» или «на пересмотр».
- История черновиков: вкладки v1, v2, итог. На отклонённом абзацы с `quote` подсвечены красным и рядом reason; в следующем зелёным изменённое (diff по абзацам).
- Резолюция арбитра: документ «Постановляю / Обоснование / Поручения», печать зелёная/жёлтая/красная, споры раскрываются «Арбитр принял сторону финансиста, потому что F15».
- Кнопка «Применить поручение» подставляет улучшение в кабинет и запускает новый прогон.

**Лидерборд `/leaderboard`** (Could): команды, Score, исход, время.

Пока прогон идёт, экран вердикта показывает стадии построчно, без спиннера. При обрыве SSE клиент делает GET прогона по `runId`.

## 9. Тесты

- Vitest: валидатор (по кейсу на каждый код ошибки), движок (золотой тест, синергия, clip, N_crit), оптимизатор (валидность улучшений, перцентиль ∈ [0,1]), ревизор C1 (число не из фактов ловится).
- Ручной прогон трёх сидов перед демо: пример из датасета, самый дешёвый набор за 61, набор «всё в Есиль».

## 10. README (11 пунктов организаторов, обязательный состав)

1. Название. 2. Проблема и для кого. 3. Что реализовано. 4. Сценарий от входа до результата. 5. Технологии: языки, фреймворки, AI-модели, API. 6. Архитектура с диаграммой пайплайна и таблицей «код считает, LLM говорит». 7. Установка и запуск: `yarn`, `.env`, `yarn dev`, Docker в одну команду. 8. Как проверить: три сида, ожидаемый Score, золотой тест. 9. Данные и интеграции: синтетический датасет организаторов, OpenAI API. 10. Ограничения. 11. Ссылка на деплой, если есть.
Плюс потенциал развития: Laya как System-1 судья после накопления золотого набора вердиктов, события-шоки, реальные данные районов. Только то, что есть в коде.

## 11. Git

- `main` стабильный, только через PR. Ветки: Амир `feat/engine-consilium`, Мирас `feat/ui`.
- Контракт типов и фикстура едут в `main` первыми (задача A1), после этого ветки расходятся.
- Изменение `types.ts` только через PR с пометкой в чате.
- Code-review каждого PR делает Амир (`/code-review`) до merge. Merge без squash.

## 12. Решения

- 2026-09-23: один Next.js без отдельного бэка, двое фулстеков и 25 баллов за воспроизводимость.
- 2026-09-23: без CatBoost/ML, оптимум находится перебором, ML бы приближал известную формулу.
- 2026-09-23: Laya не в MVP (Python-сервис, точность 0.36 без дообучения), остаётся в потенциале развития; интерфейс `Reviewer` с двумя реализациями.
- 2026-09-23: исход резолюции выбирает таблица условий в коде, LLM-арбитр пишет обоснование и разбирает споры.
- 2026-09-23: порог ревизоров 5 из 6, cap 2 круга.
- 2026-09-23: из `orbita` только паттерны, не файлы (правило «проект создан в рамках хакатона»).

## 13. Вне скоупа

Авторизация, реальные данные, мультигород, локальные модели, мобильная вёрстка ниже 768px, i18n.
