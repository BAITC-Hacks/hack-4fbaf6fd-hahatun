import type { Review } from "@/lib/types";
import { REVIEW_MAX_ROUNDS, REVIEW_PASS_THRESHOLD } from "@/lib/types";
import { REVIEWER_LABELS } from "./conditions";
import { ReviewRound } from "./ReviewRound";

export function ReviewerBoard({ reviews }: { reviews: Review[] }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Порог — {REVIEW_PASS_THRESHOLD} из 6 условий. Ниже порога черновик уходит синтезатору на пересмотр,
        не больше {REVIEW_MAX_ROUNDS} кругов. Метка <span className={REVIEWER_LABELS.code.className}>код</span>{" "}
        — проверка программой, <span className={REVIEWER_LABELS.llm.className}>ревизор</span> — языковой
        моделью.
      </p>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ревизоры ждут черновик.</p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {reviews.map((r) => (
            <ReviewRound key={r.round} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}
