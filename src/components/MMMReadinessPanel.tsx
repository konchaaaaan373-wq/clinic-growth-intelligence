import type { MMMReadiness } from "../lib/types";
import { MMM_REQUIRED_DATA } from "../lib/scoring";

type Props = {
  readiness: MMMReadiness;
};

export default function MMMReadinessPanel({ readiness }: Props) {
  const ratio = readiness.readinessScore / 10;
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-bold text-ink">MMM（初診数モデリング）準備度</h3>
        <span className="text-sm tabular-nums text-ink-muted">
          <span className="font-bold text-ink">{readiness.readinessScore}</span> / 10
        </span>
      </div>
      <div className="bar-track mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="bar-fill h-full rounded-full bg-brand-600"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>

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

      <details className="mt-4 rounded-lg border border-slate-200 p-4">
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
