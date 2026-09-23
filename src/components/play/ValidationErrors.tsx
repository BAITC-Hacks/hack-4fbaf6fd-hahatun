import { CircleAlert } from "lucide-react";
import type { ValidationError } from "@/lib/types";

interface ValidationErrorsProps {
  errors: ValidationError[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) return null;
  return (
    <ul aria-label="Нарушения правил" className="flex flex-col gap-1.5 rounded-md bg-destructive/10 p-3 text-destructive">
      {errors.map((e, i) => (
        <li key={`${e.code}-${i}`} className="flex gap-2 text-xs">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-mono text-[0.68rem] opacity-80">{e.code}</span> {e.message}
          </span>
        </li>
      ))}
    </ul>
  );
}
