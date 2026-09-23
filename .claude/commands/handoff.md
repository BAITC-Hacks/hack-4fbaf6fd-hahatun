---
description: Конец сессии — обновить статусы задач в docs/backlog.md, личную память .claude/memory/MEMORY.md и сказать напарнику, что изменилось в контракте.
---

1. `git status`, `git log --oneline -10`, `git diff main --stat` — что реально сделано в ветке.
2. `docs/backlog.md`: статусы задач по факту (`wip` / `review` / `done`). `done` только если критерии приёмки
   закрыты и код в `main` или в PR с зелёными воротами.
3. `.claude/memory/MEMORY.md`: что сделано, где остановился, что дальше, решения. Формат — Current Status /
   Last Session / Next Steps / Key Decisions.
4. Если менялся `src/lib/types.ts` или `docs/plan.md` — отдельной строкой в ответе: «напарнику: изменилось X».
5. Решения уровня проекта (не «как назвал переменную», а «почему так, а не иначе») → `docs/DECISIONS.md`.
Коммит и push — только по явной просьбе.
