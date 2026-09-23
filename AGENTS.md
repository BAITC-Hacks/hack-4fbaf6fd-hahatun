# «Аким на 5 часов» — контекст проекта

Общайся с пользователем на русском. Код, идентификаторы, коммиты — на английском.

## Project Overview

AI-симулятор управления городом для хакатона HackAlem AI (23.09.2026, 5 часов на MVP).
Игрок получает бюджет 100 у.е., выбирает ровно 5 мер из 14 по 5 районам Астаны. Детерминированный
движок считает Astana Quality of Life Score, консилиум LLM-агентов (6 экспертов → синтезатор →
ревизоры → арбитр) объясняет результат, спорит и выносит резолюцию с поручениями.

- Один Next.js 15 (App Router) без отдельного бэкенда. Port **3000**.
- LLM: OpenAI API через Vercel AI SDK, `generateObject` + zod.
- Команда: **Амир** — движок, консилиум, API, README, code-review всех PR; **Мирас** — UI.

## Источник правды (читать перед задачей)

| Что | Где |
|---|---|
| Спека: принципы, стек, контракт типов, пайплайн, экраны | `docs/plan.md` |
| Задачи с ID (`A*` Амир, `M*` Мирас), критерии приёмки, таймлайн | `docs/backlog.md` |
| Числа датасета (районы, меры, веса, синергии, формула) | `docs/source/dataset.md` — в код 1-в-1 |
| Бриф и критерии жюри | `docs/source/brief.md` |
| Правила хакатона, за что дисквалифицируют | `docs/plan.md` §0 |
| Контракт типов между UI и бэком | `src/lib/types.ts` (после задачи A1) |
| Решения и их причины | `docs/DECISIONS.md` |

Код разошёлся со спекой → чинить код или PR в спеку с пометкой напарнику. Молча не расходиться.

## Структура (по спеке, появляется по мере задач)

```
src/app/            page.tsx (брифинг), play/, result/[runId]/, api/run (SSE), api/runs
src/lib/types.ts    КОНТРАКТ — менять только через PR в main + сообщение напарнику
src/lib/data/       districts, measures, weights, synergies — числа из датасета
src/lib/engine/     validator, engine, facts, optimizer — чистые функции, без IO, без LLM
src/lib/consilium/  llm, prompts, experts, synthesizer, reviewers, arbiter, pipeline
src/lib/db/         drizzle + better-sqlite3, файл data/app.db
src/components/     play/, result/, consilium/, ui/ (shadcn)
fixtures/           sample-run.json — полный Run для разработки UI без бэка
```

## Commands

```bash
yarn dev              # http://localhost:3000
yarn typecheck        # next typegen && tsc --noEmit — обязателен перед PR
yarn test             # vitest run: движок, валидатор, ревизор C1
yarn lint             # eslint
yarn build            # next build, прогоняется перед сдачей
```

Next 16 отличается от версий в обучающих данных моделей: перед правкой роутинга, `params`, кэширования
и route handlers читать `node_modules/next/dist/docs/` (см. блок в конце файла).

## Критические правила

- **Код считает, LLM говорит.** Score, валидация, дельты, оптимум, исход резолюции — только код.
  Причина: критерии жюри 3 и 5 требуют, чтобы изменение набора детерминированно меняло Score.
- **Каждое число в тексте LLM берётся из `Fact` с ID.** Ревизор C1 проверяет это кодом.
  Причина: галлюцинация цифры на демо = потеря доверия жюри.
- **Валидатор возвращает все нарушения списком** (ровно 5 мер, ≤ 2 на направление, бюджет ≤ 100,
  конфликты, район для district-мер). Причина: критерий 2 — система не даёт превысить бюджет.
- **Цикл пересмотра ≤ 2 кругов, порог ревизоров 5 из 6.** Причина: демо на сцене не может висеть.
- **Без `OPENAI_API_KEY` приложение работает** (движок живой, консилиум из фикстуры с пометкой).
  Причина: жюри может запустить без ключа, падение = 0 баллов за воспроизводимость.
- **Секреты никогда в git.** `.env` в `.gitignore`, в репо только `.env.example`.
  Причина: правила кибербезопасности хакатона, дисквалификация.
- **Код пишется здесь, не копируется из других репозиториев.** Паттерны из `orbita` — да, файлы — нет.
  Причина: правило «проект создан в рамках хакатона».
- **Коммиты под своим GitHub-аккаунтом, merge без squash.** Причина: правило о личном вкладе каждого.
- **Никаких новых UI-библиотек мимо Tailwind + shadcn/ui + Recharts.** Причина: 5 часов и бандл.
- **`src/lib/types.ts` меняется только через PR в `main`** с сообщением напарнику. Причина: две ветки
  параллельно, расхождение контракта ломает обе.

## Workflow

Ветки: Амир `feat/engine-consilium`, Мирас `feat/ui`. `main` только через PR.

```
/task <ID>   → взять задачу из docs/backlog.md, реализовать в своей ветке, прогнать ворота
/review      → ревью diff против docs/plan.md агентом code-reviewer, ворота, отчёт (делает Амир)
/handoff     → обновить статусы в backlog.md и MEMORY.md в конце сессии
```

Ворота перед PR: `yarn tsc --noEmit`, `yarn test`, в diff нет `.env` и `data/*.db`, `/review` пройден.
Открытый critical/high в ревью = PR не мержится.

## Память

- Личный контекст сессии — `.claude/memory/MEMORY.md` (в `.gitignore`, у каждого свой).
- Общее состояние команды — статусы в `docs/backlog.md` и записи в `docs/DECISIONS.md`.
  Причина: память инструмента не видна напарнику.

## Environment

См. `.env.example`: `OPENAI_API_KEY`, `OPENAI_EXPERT_MODEL`, `OPENAI_JUDGE_MODEL`, `DATABASE_PATH`.
`NEXT_PUBLIC_*` не заводить без нужды — утекает в браузер.

## Active Technologies

Next.js 16.3, React 19.2, TypeScript 5, Tailwind 4 + shadcn/ui, Recharts 3, Vercel AI SDK 7 (`ai`, `@ai-sdk/openai` 4),
zod 4, Drizzle 0.45 + better-sqlite3, Vitest 5. Точные версии в `package.json` и `.claude/project/tech-stack.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
