"use client";

import { Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearSandbox } from "@/lib/ui/sandbox";

interface SandboxNoticeProps {
  name: string;
  onExit?: () => void; // default: drop the sandbox and open the cabinet on the case data
}

/** Mode strip: this screen runs on imported data, not on the case dataset. */
export function SandboxNotice({ name, onExit }: SandboxNoticeProps) {
  const router = useRouter();
  function exit() {
    if (onExit) return onExit();
    clearSandbox();
    router.push("/play");
  }
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm"
    >
      <Database className="size-4 shrink-0 text-outcome-conditions" aria-hidden />
      <p className="min-w-0">
        Песочница: {name} ·{" "}
        <button type="button" onClick={exit} className="underline underline-offset-4 hover:text-foreground">
          вернуться к данным кейса
        </button>
      </p>
    </div>
  );
}
