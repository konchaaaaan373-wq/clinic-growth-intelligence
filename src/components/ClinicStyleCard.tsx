import type { QualitativeReview } from "../lib/types";

type Props = {
  qualitative: QualitativeReview;
};

/**
 * 集患スタイル診断カード。
 * 点数と独立した質的評価（タイプ分け＋講評）を、レポートの中で
 * いちばん「読んで楽しい」パートとして見せる。
 */
export default function ClinicStyleCard({ qualitative }: Props) {
  const { style, strengths, opportunities, narrative } = qualitative;

  return (
    <div className="card break-inside-avoid p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          集患スタイル診断
        </span>
        <span className="annotation">点数とは別の、質的なタイプ分けです</span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div
          className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-5xl"
          aria-hidden
        >
          {style.emoji}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-ink">{style.name}</h2>
          <p className="mt-0.5 text-[15px] font-medium text-brand-700">{style.tagline}</p>
          <p className="mt-2 text-[15px] leading-7 text-ink-muted">{style.description}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">💪 いいところ</h3>
          <ul className="mt-2 space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-1.5 text-[14px] leading-relaxed">
                <span aria-hidden className="text-brand-700">
                  ✓
                </span>
                <span className="text-ink-muted">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        {opportunities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ink">🎯 もったいないポイント</h3>
            <ul className="mt-2 space-y-1.5">
              {opportunities.map((o, i) => (
                <li key={i} className="flex gap-1.5 text-[14px] leading-relaxed">
                  <span aria-hidden className="text-amber-600">
                    →
                  </span>
                  <span className="text-ink-muted">{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-5 border-t border-slate-100 pt-4 text-[13px] leading-relaxed text-ink-soft">
        {narrative}
      </p>
    </div>
  );
}
