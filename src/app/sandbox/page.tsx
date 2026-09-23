import type { Metadata } from "next";
import { SandboxImport } from "@/components/sandbox/SandboxImport";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Песочница" };

export default function SandboxPage() {
  return (
    <>
      <PageHeader
        title="Песочница: свои данные"
        lead="Загрузите данные районов в формате кейса. Прогоны на своих данных помечаются и не попадают в лидерборд."
      />
      <SandboxImport />
    </>
  );
}
