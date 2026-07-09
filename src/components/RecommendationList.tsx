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

type Props = {
  title: string;
  subtitle?: string;
  items: Recommendation[];
  numbered?: boolean;
};

export default function RecommendationList({ title, subtitle, items, numbered }: Props) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      <ol className="mt-4 space-y-3">
        {items.map((r, i) => (
          <li key={r.id} className="flex gap-3 rounded-lg border border-slate-100 p-3">
            {numbered && (
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                {i + 1}
              </span>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">{r.title}</span>
                <span className="badge border-brand-200 bg-brand-50 text-brand-700">
                  {impactLabel[r.impact]}
                </span>
                <span className="badge border-slate-200 bg-slate-50 text-ink-muted">
                  {effortLabel[r.effort]}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{r.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
