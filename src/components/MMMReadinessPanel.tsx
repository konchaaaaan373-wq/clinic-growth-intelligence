import type { MMMReadiness } from "../lib/types";
import { MMM_REQUIRED_DATA } from "../lib/scoring";

type Props = {
  readiness: MMMReadiness;
};

const MMM_FULL_SCORE = 10;
const HATCH_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 4px,#f1f5f9 4px,#f1f5f9 8px)",
} as const;

export default function MMMReadinessPanel({ readiness }: Props) {
  // 達成率方式: 分母は「評価できた項目の合計点」。未評価項目は減点しない。
  // バーは満点(10)を全幅とし、未評価分はハッチングで示す（スコア内訳と同じ表現）
  const max = readiness.readinessMaxScore ?? MMM_FULL_SCORE;
  const notEvaluable = readiness.notEvaluable || max <= 0;
  const fillPct = (readiness.readinessScore / MMM_FULL_SCORE) * 100;
  const excludedPct = ((MMM_FULL_SCORE - max) / MMM_FULL_SCORE) * 100;
  return (
    <div className="print-allow-break">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium text-ink">準備度スコア</span>
        {notEvaluable ? (
          <span className="badge border-slate-300 bg-slate-100 text-ink-soft">
            未評価（情報を追加すると評価できます）
          </span>
        ) : (
          <span className="text-sm tabular-nums text-ink-muted">
            <span className="font-bold text-ink">{readiness.readinessScore}</span> / {max}
            {max < MMM_FULL_SCORE && (
              <span className="ml-1.5 text-xs text-ink-soft">
                （未評価 {MMM_FULL_SCORE - max}点分は除外）
              </span>
            )}
          </span>
        )}
      </div>
      {notEvaluable ? (
        <div className="bar-track mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="bar-hatch h-full w-full rounded-full" style={HATCH_STYLE} />
        </div>
      ) : (
        <div className="bar-track relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          {excludedPct > 0 && (
            <div
              className="bar-hatch absolute inset-y-0 right-0"
              style={{ width: `${excludedPct}%`, ...HATCH_STYLE }}
              aria-hidden
            />
          )}
          <div
            className="bar-fill absolute inset-y-0 left-0 rounded-full bg-brand-600"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            現在そろっているシグナル
          </div>
          <ul className="mt-2 space-y-1">
            {readiness.availableSignals.length === 0 && (
              <li className="text-sm text-ink-soft">まだ十分なシグナルがありません。</li>
            )}
            {readiness.availableSignals.map((s, i) => (
              <li key={i} className="flex gap-1.5 text-sm text-ink-muted">
                <span className="text-brand-600" aria-hidden>
                  ✓
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            まだ足りていないデータ
          </div>
          <ul className="mt-2 space-y-1">
            {readiness.missingData.map((s, i) => (
              <li key={i} className="flex gap-1.5 text-sm text-ink-muted">
                <span className="text-amber-600" aria-hidden>
                  ・
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-brand-100 bg-brand-50/50 p-4">
        <div className="text-sm font-semibold text-brand-800">次に集めるとよいデータ</div>
        <ol className="mt-2 space-y-1">
          {readiness.nextDataToCollect.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-muted">
              <span className="font-bold text-brand-700">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <details className="no-print mt-4 rounded-lg border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          MMMを始めるために必要なデータ一覧（全体）
        </summary>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {MMM_REQUIRED_DATA.map((d, i) => (
            <li key={i} className="text-sm text-ink-muted">
              ・{d}
            </li>
          ))}
        </ul>
      </details>

      <p className="mt-4 text-xs leading-relaxed text-ink-soft">{readiness.paidPlanMessage}</p>
    </div>
  );
}
