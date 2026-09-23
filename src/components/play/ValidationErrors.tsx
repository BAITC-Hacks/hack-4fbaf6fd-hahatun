import { CircleAlert } from "lucide-react";
import type { ValidationError } from "@/lib/types";

interface ValidationErrorsProps {
  errors: ValidationError[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) return null;
  return (
    <ul aria-label="Что мешает отправить" className="flex flex-col gap-2 text-sm text-destructive">
      {errors.map((e, i) => (
        <li key={`${e.code}-${i}`} className="flex gap-2 leading-snug">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{e.message}</span>
        </li>
      ))}
    </ul>
  );
}
