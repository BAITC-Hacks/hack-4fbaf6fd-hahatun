"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEAM_NAME_MAX, getTeamName, normalizeTeamName, setTeamName } from "@/lib/ui/team";
import { cn } from "@/lib/utils";

export function TeamForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefill after mount: sessionStorage is not available during the server render.
  useEffect(() => {
    const input = inputRef.current;
    if (input && !input.value) input.value = getTeamName();
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = normalizeTeamName(inputRef.current?.value ?? "");
    if (!name) {
      setError("Введите название команды");
      inputRef.current?.focus();
      return;
    }
    setTeamName(name);
    router.push("/play");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <label htmlFor="team-name" className="text-sm font-medium">
        Название команды
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          ref={inputRef}
          id="team-name"
          name="teamName"
          type="text"
          required
          maxLength={TEAM_NAME_MAX}
          autoComplete="off"
          placeholder="Например, «Левый берег»"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "team-name-error" : "team-name-hint"}
          onChange={() => error && setError(null)}
          className={cn(
            "h-10 min-w-64 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          )}
        />
        <Button type="submit" size="lg" className="h-10 px-4">
          Стать акимом
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      {error ? (
        <p id="team-name-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id="team-name-hint" className="text-xs text-muted-foreground">
          До {TEAM_NAME_MAX} символов, попадёт в резолюцию
        </p>
      )}
    </form>
  );
}
