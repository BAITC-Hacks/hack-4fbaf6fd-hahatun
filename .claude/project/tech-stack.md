# Tech stack

Версии из `package.json` на 23.09.2026.

| Технология | Роль |
|---|---|
| Next.js 16.3 (App Router), React 19.2, TypeScript 5 | приложение целиком: страницы + route handlers |
| Tailwind 4 + shadcn/ui (preset base-nova), lucide-react | UI-кит, единственный |
| Recharts 3 | radar до/после, бары вкладов |
| Vercel AI SDK 7 `ai` + `@ai-sdk/openai` 4, zod 4 | вызовы OpenAI со structured output (`generateObject`) |
| Drizzle ORM 0.45 + better-sqlite3 13 | хранение прогонов `Run`, файл `data/app.db` |
| Vitest 5 (+ vite как peer) | тесты движка и валидатора |
| Docker (один сервис) | воспроизводимость для жюри |

Что осознанно не используем: отдельный бэкенд, Postgres/Redis, авторизация, ML-модели, локальные LLM.
