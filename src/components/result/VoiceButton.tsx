"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "loading" | "ready" | "error";

// «Озвучить резолюцию»: fetches the mp3 once (server caches it) and plays it in a native audio element.
export function VoiceButton({ runId }: { runId: string }) {
  const [state, setState] = useState<State>("idle");
  const [src, setSrc] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setState("loading");
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/voice`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(body.error ?? `Озвучка не удалась: HTTP ${res.status}`);
        setState("error");
        return;
      }
      setSrc(URL.createObjectURL(await res.blob()));
      setState("ready");
    } catch {
      setMessage("Озвучка не удалась: сервер недоступен");
      setState("error");
    }
  }

  if (state === "ready" && src) {
    return <audio controls autoPlay src={src} className="h-9 w-full max-w-sm" aria-label="Резолюция арбитра, озвучка" />;
  }
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={load} disabled={state === "loading"} className="w-fit">
        <Volume2 data-icon="inline-start" />
        {state === "loading" ? "Готовим озвучку…" : "Озвучить резолюцию"}
      </Button>
      {state === "error" && message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
