# Ресёрч «Аким на 5 часов» (2026-09-23)

## A. Рынок и аналоги
| Проект | Что это | Что взять |
|---|---|---|
| Democracy 4 | policy-sim, слайдеры политик | цепочка мера → метрика |
| Frostpunk | кризис-менеджмент | дилеммы как карточки с ценой и риском |
| SimCity / Cities: Skylines | city-builder | heat-карта района по QoL |
| Balancing Act | муниципальный бюджет-симулятор | budget bar, красный при overspend |
| Participatory Budgeting apps | голосование за проекты | карточка меры: цена, лаг, конфликты |
| UrbanFootprint / Replica | цифровые двойники | before/after toggle |
| OECD / World Bank | гос. симуляторы политик | блок «как считалось» рядом со Score |
| SimCity arXiv 2510.01297, CitySim 2506.21805, UrbanLLM | LLM-агенты города | именованные роли-эксперты |
| Generative Agents (Stanford) | агенты с рефлексией | судьи как рефлексия |
| LiPUP-MA arXiv 2412.20505 | multi-agent урбан-планирование | ближайший прецедент консилиума для питча |

## B. UX-паттерны
budget bar; карточки мер с бейджами конфликтов/синергий; radar 1 район + город before/after; дельты стрелками; heat-overlay карты; what-if side-by-side; прогресс консилиума построчно.

## C. Мульти-агент
Разные персоны обязательны; hard cap 2 итерации; судья даёт конкретный фидбек; structured outputs strict; эксперты параллельно; Responses API рекомендуемый, Chat Completions жив; эксперты nano/mini, судьи mid-tier; reasoning-модели не брать. ID моделей и цены на 09.2026 сверить на platform.openai.com/docs/pricing.

## D. Стек
Next.js fullstack + Vercel AI SDK выигрывает по скорости, демо, README, Docker. Движок как `lib/engine.ts`. Recharts + shadcn/ui + zod.

## E. Что брать из orbita
- Паттерны LLM-слоя: retry на 429 с Retry-After и backoff; `promptFingerprint` (версия + sha256 системного промпта); `knowledgeContext()` с текущей датой; JSON-контракт «сначала reason, потом verdict»; graceful degradation при пустом ключе; трейс вызовов (model, prompt_version, tokens, cost, duration).
- `majorityAnswers` из `eval-stats.ts` как идея агрегации голосов.
- Кэш вердиктов по sha256(fingerprint + вход).
- Файлы: `backend/src/integrations/llm/llm.client.ts`, `llm-trace.ts`, `judge-prompts.ts`, `eval-stats.ts`.
- Не брать: BullMQ-конвейер, golden eval harness, auth, MinIO, Caddy, NestJS-обвязку. Фронт orbita на MUI 6 без графиков.
