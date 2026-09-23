import type { Draft, Review } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reviewForDraft } from "./conditions";
import { DraftView } from "./DraftView";

interface DraftHistoryProps {
  drafts: Draft[];
  reviews: Review[];
}

const FINAL = "final";

// Tabs are uncontrolled, so this stays server-renderable; the Tabs primitive is a client component.
export function DraftHistory({ drafts, reviews }: DraftHistoryProps) {
  const sorted = [...drafts].sort((a, b) => a.version - b.version);
  const last = sorted.at(-1);
  if (!last) {
    return <p className="text-sm text-muted-foreground">Синтезатор пишет первый черновик.</p>;
  }
  return (
    <Tabs defaultValue={FINAL}>
      <TabsList>
        {sorted.map((d) => (
          <TabsTrigger key={d.version} value={`v${d.version}`} className="px-3">
            Черновик {d.version}
          </TabsTrigger>
        ))}
        <TabsTrigger value={FINAL} className="px-3">
          Итог
        </TabsTrigger>
      </TabsList>
      {sorted.map((d) => (
        <TabsContent key={d.version} value={`v${d.version}`}>
          <DraftView draft={d} review={reviewForDraft(d, reviews)} />
        </TabsContent>
      ))}
      <TabsContent value={FINAL}>
        <DraftView draft={last} review={reviewForDraft(last, reviews)} />
      </TabsContent>
    </Tabs>
  );
}
