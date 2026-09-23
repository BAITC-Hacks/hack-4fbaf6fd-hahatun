# Tech stack

Версии вписать после задачи A0 из `package.json`.

| Технология | Роль |
|---|---|
| Next.js 15 (App Router), React 19, TypeScript | приложение целиком: страницы + route handlers |
| Tailwind + shadcn/ui, lucide-react | UI-кит, единственный |
| Recharts | radar до/после, бары вкладов |
| Vercel AI SDK `ai` + `@ai-sdk/openai`, zod | вызовы OpenAI со structured output (`generateObject`) |
| Drizzle ORM + better-sqlite3 | хранение прогонов `Run`, файл `data/app.db` |
| Vitest | тесты движка и валидатора |
| Docker (один сервис) | воспроизводимость для жюри |

Что осознанно не используем: отдельный бэкенд, Postgres/Redis, авторизация, ML-модели, локальные LLM.
