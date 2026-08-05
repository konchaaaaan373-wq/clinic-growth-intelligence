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
  const notEvaluable = detail.status === "not_evaluable";
  // 達成率の分母は「評価できた項目の合計点」。未評価項目は減点せず分母から除外している
  const evaluableMax = detail.evaluableMaxScore ?? detail.maxScore;
  const ratio = evaluableMax > 0 ? detail.score / evaluableMax : 0;
  const excluded = detail.maxScore - evaluableMax;
  const unknowns = detail.unknowns ?? [];

  return (
    <div className="break-inside-avoid py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium text-ink">{detail.label}</span>
        {notEvaluable ? (
          <span className="badge border-slate-300 bg-slate-100 text-ink-soft">未評価</span>
        ) : (
          <span className="text-sm tabular-nums text-ink-muted">
            <span className="font-bold text-ink">{detail.score}</span> / {evaluableMax}
            {excluded > 0 && (
              <span className="ml-1.5 text-xs text-ink-soft">（未評価 {excluded}点分は除外）</span>
            )}
          </span>
        )}
      </div>
      {notEvaluable ? (
        <div className="bar-track mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full w-full rounded-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 4px,#f1f5f9 4px,#f1f5f9 8px)",
            }}
          />
        </div>
      ) : (
        <div className="bar-track mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`bar-fill h-full rounded-full ${scoreBarColor(ratio)}`}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{detail.explanation}</p>

      {(detail.positives.length > 0 || detail.negatives.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {detail.positives.length > 0 && (
            <ul className="space-y-1">
              {detail.positives.map((p, i) => (
                <li key={i} className="flex gap-1.5 text-[13px] text-brand-700">
                  <span aria-hidden>✓</span>
                  <span className="text-ink-muted">{p}</span>
                </li>
              ))}
            </ul>
          )}
          {detail.negatives.length > 0 && (
            <ul className="space-y-1">
              {detail.negatives.map((n, i) => (
                <li key={i} className="flex gap-1.5 text-[13px] text-amber-600">
                  <span aria-hidden>△</span>
                  <span className="text-ink-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 未評価項目: 「弱い」ではなく「外からは分からない」。減点していないことを明示 */}
      {unknowns.length > 0 && (
        <ul className="mt-2 space-y-1">
          {unknowns.map((u, i) => (
            <li key={i} className="flex gap-1.5 text-[13px] text-ink-soft">
              <span aria-hidden>？</span>
              <span>{u}（減点していません）</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** スコア内訳の行リスト。見出し・枠はセクション側が持つ。行単位で改ページを避ける */
export default function ScoreBreakdown({ scores }: { scores: Scores }) {
  return (
    <div className="divide-y divide-slate-100">
      {ORDER.map((key) => (
        <ScoreRow key={key} detail={scores[key]} />
      ))}
    </div>
  );
}
