"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { LiveHall } from "./LiveHall";
import { LiveMessage } from "./LiveMessage";
import { StageList } from "./StageList";
import { useLiveRun, type LiveMode, type LiveStatus } from "./useLiveRun";

const MODE_NOTICE: Record<LiveMode, string | null> = {
  server: null,
  fallback: "Сервер консилиума недоступен — показан демонстрационный прогон из заготовки",
  replay: "Демонстрационный прогон",
};

const STATUS_LINE: Partial<Record<LiveStatus, string>> = {
  running: "Заседание идёт. Стадии отмечаются по мере готовности.",
  done: "Заседание завершено. Открываем вердикт…",
};

const CABINET_LINK = (
  <Link href="/play" className={buttonVariants({ variant: "outline" })}>
    Вернуться в кабинет
  </Link>
);

export function LiveRun() {
  const { status, mode, run, restart } = useLiveRun();

  if (status === "loading") return null;
  if (status === "missing") {
    return (
      <LiveMessage title="Набор для консилиума не найден. Соберите пять мер в кабинете.">
        <Link href="/play" className={buttonVariants()}>
          Перейти в кабинет
        </Link>
      </LiveMessage>
    );
  }

  const notice = MODE_NOTICE[mode];
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-3">
        {notice && <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">{notice}</p>}
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {STATUS_LINE[status]}
          {status === "done" && run.runId && (
            <Link href={`/result/${encodeURIComponent(run.runId)}`} className="ml-2 text-foreground underline">
              Открыть вердикт
            </Link>
          )}
        </p>
        <StageList run={run} />
      </div>
      {status === "error" && (
        <LiveMessage tone="destructive" title={run.error ?? "Консилиум остановился с ошибкой."}>
          {CABINET_LINK}
        </LiveMessage>
      )}
      {status === "dropped" && (
        <LiveMessage tone="destructive" title="Связь с сервером прервалась до конца заседания">
          <Button onClick={restart}>
            <RotateCcw data-icon="inline-start" />
            Запустить заново
          </Button>
          {CABINET_LINK}
        </LiveMessage>
      )}
      <LiveHall run={run} />
    </div>
  );
}
