import type { Recommendation } from "../lib/types";

const impactLabel: Record<Recommendation["impact"], string> = {
  high: "効果 大",
  medium: "効果 中",
  low: "効果 小",
};
const effortLabel: Record<Recommendation["effort"], string> = {
  low: "着手 容易",
  medium: "着手 中",
  high: "着手 重",
};

const priorityStyle: Record<string, string> = {
  高: "border-rose-200 bg-rose-50 text-rose-700",
  中: "border-amber-200 bg-amber-50 text-amber-700",
  低: "border-slate-200 bg-slate-50 text-ink-muted",
};
const difficultyStyle = "border-slate-200 bg-slate-50 text-ink-muted";

type Props = {
  title: string;
  subtitle?: string;
  items: Recommendation[];
  numbered?: boolean;
};

function StructuredBody({ r }: { r: Recommendation }) {
  return (
    <div className="mt-2 space-y-2 text-sm leading-relaxed">
      {r.whyImportant && (
        <p>
          <span className="font-semibold text-ink">なぜ重要か：</span>
          <span className="text-ink-muted">{r.whyImportant}</span>
        </p>
      )}
      {r.whatToFix && (
        <p>
          <span className="font-semibold text-ink">具体的に何を直すか：</span>
          <span className="text-ink-muted">{r.whatToFix}</span>
        </p>
      )}
      {r.expectedEffect && (
        <p>
          <span className="font-semibold text-ink">期待される効果：</span>
          <span className="text-ink-muted">{r.expectedEffect}</span>
        </p>
      )}
    </div>
  );
}

export default function RecommendationList({ title, subtitle, items, numbered }: Props) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      <ol className="mt-4 space-y-4">
        {items.map((r, i) => {
          const structured = !!(r.whyImportant || r.whatToFix || r.expectedEffect);
          return (
            <li key={r.id} className="flex gap-3 rounded-lg border border-slate-200 p-4">
              {numbered && (
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                  {i + 1}
                </span>
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{r.title}</span>
                  {r.priority ? (
                    <span className={`badge ${priorityStyle[r.priority] ?? difficultyStyle}`}>
                      優先度 {r.priority}
                    </span>
                  ) : (
                    <span className="badge border-brand-200 bg-brand-50 text-brand-700">
                      {impactLabel[r.impact]}
                    </span>
                  )}
                  {r.difficulty ? (
                    <span className={`badge ${difficultyStyle}`}>難易度 {r.difficulty}</span>
                  ) : (
                    <span className="badge border-slate-200 bg-slate-50 text-ink-muted">
                      {effortLabel[r.effort]}
                    </span>
                  )}
                </div>
                {structured ? (
                  <StructuredBody r={r} />
                ) : (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{r.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
