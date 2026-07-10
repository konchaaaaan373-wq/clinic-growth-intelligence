import type { ScoreDetail, Scores } from "../lib/types";
import { scoreBarColor } from "../lib/utils";

const ORDER: (keyof Scores)[] = [
  "websiteConversion",
  "seoContent",
  "meoReadiness",
  "snsConnection",
  "medicalAdRisk",
  "mmmReadiness",
];

function ScoreRow({ detail }: { detail: ScoreDetail }) {
  const ratio = detail.maxScore > 0 ? detail.score / detail.maxScore : 0;
  return (
    <div className="break-inside-avoid py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{detail.label}</span>
        <span className="text-sm tabular-nums text-ink-muted">
          <span className="font-bold text-ink">{detail.score}</span> / {detail.maxScore}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${scoreBarColor(ratio)}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">{detail.explanation}</p>

      {(detail.positives.length > 0 || detail.negatives.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {detail.positives.length > 0 && (
            <ul className="space-y-1">
              {detail.positives.map((p, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-emerald-700">
                  <span aria-hidden>✓</span>
                  <span className="text-ink-muted">{p}</span>
                </li>
              ))}
            </ul>
          )}
          {detail.negatives.length > 0 && (
            <ul className="space-y-1">
              {detail.negatives.map((n, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-amber-700">
                  <span aria-hidden>△</span>
                  <span className="text-ink-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScoreBreakdown({ scores }: { scores: Scores }) {
  // カード全体は1ページより高くなるため、印刷時はカード単位ではなく行単位で分割を避ける
  return (
    <div className="card print-allow-break p-6">
      <h3 className="text-base font-bold text-ink">スコア内訳</h3>
      <div className="mt-2 divide-y divide-slate-100">
        {ORDER.map((key) => (
          <ScoreRow key={key} detail={scores[key]} />
        ))}
      </div>
    </div>
  );
}
