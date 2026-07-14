import type { Recommendation } from "../lib/types";

const impactLabel: Record<Recommendation["impact"], string> = {
  high: "優先度 高",
  medium: "優先度 中",
  low: "優先度 低",
};
const effortLabel: Record<Recommendation["effort"], string> = {
  low: "難易度 低",
  medium: "難易度 中",
  high: "難易度 高",
};

type Props = {
  items: Recommendation[];
  numbered?: boolean;
};

function StructuredBody({ r }: { r: Recommendation }) {
  return (
    <div className="mt-2 space-y-2 text-[15px] leading-7">
      {r.whyImportant && (
        <p>
          <span className="font-medium text-ink">なぜ重要か：</span>
          <span className="text-ink-muted">{r.whyImportant}</span>
        </p>
      )}
      {r.whatToFix && (
        <p>
          <span className="font-medium text-ink">具体的に何を直すか：</span>
          <span className="text-ink-muted">{r.whatToFix}</span>
        </p>
      )}
      {r.expectedEffect && (
        <p>
          <span className="font-medium text-ink">改善の狙い：</span>
          <span className="text-ink-muted">{r.expectedEffect}</span>
        </p>
      )}
    </div>
  );
}

/** 改善提案のリスト本体。見出し・枠はセクション側（ReportSection）が持つ */
export default function RecommendationList({ items, numbered }: Props) {
  return (
    <ol className="space-y-4">
      {items.map((r, i) => {
        const structured = !!(r.whyImportant || r.whatToFix || r.expectedEffect);
        const priorityText = r.priority ? `優先度 ${r.priority}` : impactLabel[r.impact];
        const difficultyText = r.difficulty ? `難易度 ${r.difficulty}` : effortLabel[r.effort];
        return (
          <li key={r.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
            {numbered && (
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {i + 1}
              </span>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[15px] font-bold text-ink">{r.title}</span>
                <span className="annotation whitespace-nowrap">
                  {priorityText} ・ {difficultyText}
                </span>
              </div>
              {structured ? (
                <StructuredBody r={r} />
              ) : (
                <p className="mt-1.5 text-[15px] leading-7 text-ink-muted">{r.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
