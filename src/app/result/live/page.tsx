import type { Metadata } from "next";
import { LiveRun } from "@/components/live/LiveRun";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Консилиум" };

export default function LiveRunPage() {
  return (
    <>
      <PageHeader
        title="Консилиум"
        lead="Эксперты, ревизоры и арбитр разбирают ваш набор. Обычно это 20–40 секунд."
      />
      <LiveRun />
    </>
  );
}
