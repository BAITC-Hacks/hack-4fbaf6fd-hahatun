import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Кабинет решений" };

export default function PlayPage() {
  return (
    <PageHeader
      eyebrow="Шаг 2 из 3"
      title="Кабинет решений"
      lead="Выберите пять мер и районы для них. Score пересчитывается сразу, а консилиум откроется, когда набор пройдёт проверку."
    />
  );
}
