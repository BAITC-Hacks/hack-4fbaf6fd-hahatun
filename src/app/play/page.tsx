import type { Metadata } from "next";
import { Cabinet } from "@/components/play/Cabinet";
import type { MandateInfo } from "@/components/play/MandateNotice";
import { PageHeader } from "@/components/shell/PageHeader";
import { calculate } from "@/lib/engine";
import type { Decision } from "@/lib/types";
import { sanitizeDecisions } from "@/lib/ui/cabinet";
import { humanizeChange, humanizeText } from "@/lib/ui/humanize";
import { getRun } from "@/lib/ui/run-source";
import { decodeDecisions, encodeDecisions } from "@/lib/ui/scenario";

export const metadata: Metadata = { title: "Кабинет решений" };

const BASE_SCORE = calculate({ decisions: [] }).baseScore;

type Param = string | string[] | undefined;
const one = (v: Param) => (Array.isArray(v) ? v[0] : v);

// «Применить поручение»: /play?from=<runId>&mandate=<index>. Anything invalid is ignored silently.
async function fromMandate(runId?: string, index?: string): Promise<{ decisions: Decision[]; info: MandateInfo } | null> {
  if (!runId || !index || !/^\d+$/.test(index)) return null;
  try {
    const mandate = (await getRun(runId)).resolution.mandates[Number(index)];
    if (!mandate) return null;
    return {
      decisions: mandate.improvement.scenario.decisions,
      info: { change: humanizeChange(mandate.improvement.change), text: humanizeText(mandate.text) },
    };
  } catch {
    return null;
  }
}

export default async function PlayPage({ searchParams }: PageProps<"/play">) {
  const query = await searchParams;
  const mandate = await fromMandate(one(query.from), one(query.mandate));
  // ?s=M7.nura,M8.nura,... is the shareable form of a set.
  const initial = sanitizeDecisions(mandate?.decisions ?? decodeDecisions(one(query.s)));

  return (
    <>
      <PageHeader
        title="Кабинет решений"
        lead="Выберите 5 мер в пределах 100 у.е. — Score пересчитывается сразу."
      />
      <Cabinet
        key={encodeDecisions(initial)}
        initialDecisions={initial}
        baseScore={BASE_SCORE}
        mandate={mandate?.info}
      />
    </>
  );
}
