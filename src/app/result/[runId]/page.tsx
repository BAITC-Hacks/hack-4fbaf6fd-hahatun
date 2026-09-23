import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Вердикт" };

export default async function ResultPage({ params }: PageProps<"/result/[runId]">) {
  const { runId } = await params;

  return (
    <PageHeader
      eyebrow={
        <>
          Шаг 3 из 3 · прогон <span className="normal-case">{runId}</span>
        </>
      }
      title="Вердикт"
      lead="Итоговый Score, изменения по районам и резолюция консилиума."
    />
  );
}
