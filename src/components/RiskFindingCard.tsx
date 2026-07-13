import type { RiskFinding } from "../lib/types";

type Props = {
  findings: RiskFinding[];
  /** サイト本文を取得できず評価不能な場合 */
  notEvaluable?: boolean;
};

const severityMeta: Record<RiskFinding["severity"], { label: string; cls: string }> = {
  high: { label: "優先確認", cls: "border-amber-300 bg-amber-100 text-amber-800" },
  medium: { label: "要確認", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  low: { label: "文脈確認", cls: "border-slate-200 bg-slate-100 text-ink-soft" },
};

export default function RiskFindingCard({ findings, notEvaluable }: Props) {
  // 優先確認・要確認は詳細カードで示し、文脈確認（減点なし）は控えめな一覧にとどめる
  const primary = findings.filter((f) => f.severity !== "low");
  const lows = findings.filter((f) => f.severity === "low");

  if (notEvaluable) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-ink-muted">
        サイト本文を取得できなかったため、要確認表現の有無は<strong className="text-ink">評価できません</strong>。
        「注意表現なし」という意味ではありません。URLを確認して再診断すると評価できます。
      </p>
    );
  }

  return (
    <div className="print-allow-break">
      <p className="text-[13px] leading-relaxed text-ink-soft">
        以下は機械的に抽出した「要確認の可能性がある表現」を、文脈に応じて
        <span className="font-medium text-ink-muted">優先確認 / 要確認 / 文脈確認</span>
        に分類したものです。この分類は人が確認する際の優先順位を示すもので、
        違反の断定ではなく、法的判断・法的リスクの評価でもありません。
        「文脈確認」は受診促進・副作用やリスクの説明などの文脈で検出された確認項目で、
        スコアの減点対象にはしていません。
        最終確認は医療広告ガイドラインや専門家確認を前提にしてください。
      </p>

      {findings.length === 0 && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[15px] leading-7 text-ink-muted">
          初期スクリーニングでは、注意が必要な表現は検出されませんでした（保証ではありません）。
        </p>
      )}

      {findings.length > 0 && primary.length === 0 && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[15px] leading-7 text-ink-muted">
          優先確認・要確認にあたる表現は検出されませんでした。以下は文脈確認として記録した
          項目のみで、スコアの減点はありません。
        </p>
      )}

      {primary.length > 0 && (
        <ul className="mt-4 space-y-3">
          {primary.map((f) => (
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
              <dl className="mt-2.5 space-y-1.5 text-[15px] leading-7">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-ink">注意理由</dt>
                  <dd className="text-ink-muted">{f.reason}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-brand-700">推奨対応</dt>
                  <dd className="text-ink-muted">{f.recommendedAction}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {lows.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="text-xs font-semibold text-ink-soft">
            文脈確認（減点なし）{lows.length} 件
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            受診促進・副作用やリスクの説明・患者状態の記述などの文脈で検出された確認項目です。
            参考として検出箇所のみ記載します。
          </p>
          <ul className="mt-2 space-y-1.5">
            {lows.map((f) => (
              <li key={f.id} className="text-xs leading-relaxed text-ink-muted">
                「{f.expression}」{f.where && `（${f.where}）`}
                {f.context && <>：「… {f.context} …」</>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
