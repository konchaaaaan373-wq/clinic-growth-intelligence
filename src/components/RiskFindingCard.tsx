import type { RiskFinding } from "../lib/types";

type Props = {
  findings: RiskFinding[];
};

const severityMeta: Record<RiskFinding["severity"], { label: string; cls: string }> = {
  high: { label: "優先確認", cls: "border-amber-300 bg-amber-100 text-amber-800" },
  medium: { label: "要確認", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  low: { label: "低リスク・文脈確認", cls: "border-slate-200 bg-slate-100 text-ink-soft" },
};

export default function RiskFindingCard({ findings }: Props) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-ink">医療広告リスク（初期スクリーニング）</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        以下は機械的に抽出した「要確認の可能性がある表現」を、文脈に応じて
        <span className="font-medium text-ink-muted">優先確認 / 要確認 / 低リスク・文脈確認</span>
        に分類したものです。違反の断定ではなく、法的判断でもありません。
        「低リスク・文脈確認」は受診促進・患者状態の記述など、問題になりにくい文脈を含みます。
        最終確認は医療広告ガイドラインや専門家確認を前提にしてください。
      </p>

      {findings.length === 0 ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          初期スクリーニングでは、注意が必要な表現は検出されませんでした（保証ではありません）。
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {findings.map((f) => (
            <li key={f.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${severityMeta[f.severity].cls}`}>
                  {severityMeta[f.severity].label}
                </span>
                <span className="text-sm font-bold text-ink">「{f.expression}」</span>
                {f.where && (
                  <span className="text-xs text-ink-soft">検出箇所: {f.where}</span>
                )}
              </div>
              {f.context && (
                <p className="mt-2 rounded bg-white px-2.5 py-1.5 text-xs text-ink-muted ring-1 ring-slate-200">
                  検出箇所：「… {f.context} …」
                </p>
              )}
              <dl className="mt-2.5 space-y-1.5 text-sm leading-relaxed">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-ink-muted">注意理由</dt>
                  <dd className="text-ink-muted">{f.reason}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-brand-700">推奨対応</dt>
                  <dd className="text-ink-muted">{f.recommendedAction}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
