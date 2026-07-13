import type { RiskFinding } from "../lib/types";

type Props = {
  findings: RiskFinding[];
  /** サイト本文を取得できず評価不能な場合 */
  notEvaluable?: boolean;
};

const severityMeta: Record<RiskFinding["severity"], { label: string; cls: string; rank: number }> = {
  high: { label: "優先確認", cls: "text-amber-800", rank: 3 },
  medium: { label: "要確認", cls: "text-amber-700", rank: 2 },
  low: { label: "文脈確認", cls: "text-ink-soft", rank: 1 },
};

/** 表示順: 優先確認 → 要確認 → 文脈確認（確認優先度の高い順） */
function sortByPriority(findings: RiskFinding[]): RiskFinding[] {
  return [...findings].sort((a, b) => severityMeta[b.severity].rank - severityMeta[a.severity].rank);
}

export default function RiskFindingCard({ findings, notEvaluable }: Props) {
  const ordered = sortByPriority(findings);
  const count = (sev: RiskFinding["severity"]) => findings.filter((f) => f.severity === sev).length;
  const primaryCount = count("high") + count("medium");

  if (notEvaluable) {
    return (
      <p className="border-l-2 border-slate-300 py-1 pl-4 text-sm leading-7 text-ink-muted">
        サイト本文を取得できなかったため、要確認表現の有無は<strong className="text-ink">評価できません</strong>。
        「注意表現なし」という意味ではありません。URLを確認して再診断すると評価できます。
      </p>
    );
  }

  return (
    <div className="print-allow-break">
      <p className="text-[13px] leading-relaxed text-ink-soft">
        サイト本文から機械的に抽出した「要確認の可能性がある表現」を、文脈に応じて
        人による確認の優先度（優先確認 / 要確認 / 文脈確認）で分類した初期スクリーニングの記録です。
        法的判断ではありません。
      </p>

      {findings.length === 0 ? (
        <p className="mt-4 border-l-2 border-slate-300 py-1 pl-4 text-[15px] leading-7 text-ink-muted">
          初期スクリーニングでは、注意が必要な表現は検出されませんでした（保証ではありません）。
        </p>
      ) : (
        <>
          {/* 検出件数の内訳（スクリーニング記録のサマリー行） */}
          <p className="mt-4 text-[13px] text-ink-muted">
            検出 {findings.length} 件
            <span className="text-ink-soft">
              （優先確認 {count("high")} 件 ／ 要確認 {count("medium")} 件 ／ 文脈確認 {count("low")} 件）
            </span>
          </p>

          {primaryCount === 0 && (
            <p className="mt-2 border-l-2 border-slate-300 py-1 pl-4 text-[13px] leading-relaxed text-ink-muted">
              優先確認・要確認にあたる表現は検出されませんでした。以下は文脈確認として記録した
              項目のみで、スコアの減点はありません。
            </p>
          )}

          {/* デスクトップ・印刷: 手続き型の一覧表 */}
          <table className="mt-3 hidden w-full table-fixed border-collapse text-left text-[13px] leading-relaxed sm:table print:table">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] tracking-wide text-ink-soft">
                <th scope="col" className="w-9 py-2 pr-2 font-semibold">
                  No.
                </th>
                <th scope="col" className="w-[24%] py-2 pr-3 font-semibold">
                  検出表現
                </th>
                <th scope="col" className="w-[13%] py-2 pr-3 font-semibold">
                  分類
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  確認理由
                </th>
                <th scope="col" className="py-2 font-semibold">
                  推奨対応
                </th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((f, i) => (
                <tr key={f.id} className="break-inside-avoid border-b border-slate-200 align-top">
                  <td className="py-3 pr-2 tabular-nums text-ink-soft">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-ink">「{f.expression}」</div>
                    {f.where && <div className="mt-0.5 text-xs text-ink-soft">{f.where}</div>}
                    {f.context && (
                      <div className="mt-1 text-xs leading-relaxed text-ink-muted">
                        「… {f.context} …」
                      </div>
                    )}
                  </td>
                  <td className={`py-3 pr-3 font-medium ${severityMeta[f.severity].cls}`}>
                    {severityMeta[f.severity].label}
                    {f.severity === "low" && (
                      <div className="text-[11px] font-normal text-ink-soft">減点なし</div>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-ink-muted">{f.reason}</td>
                  <td className="py-3 text-ink-muted">{f.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* モバイル: 表を横スクロールさせず、同じ情報階層の積み上げ表示にする */}
          <ol className="mt-3 space-y-3 sm:hidden print:hidden">
            {ordered.map((f, i) => (
              <li key={f.id} className="border-t border-slate-200 pt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs tabular-nums text-ink-soft">No.{i + 1}</span>
                  <span className="text-sm font-semibold text-ink">「{f.expression}」</span>
                  <span className={`ml-auto text-xs font-medium ${severityMeta[f.severity].cls}`}>
                    {severityMeta[f.severity].label}
                    {f.severity === "low" && (
                      <span className="ml-1 font-normal text-ink-soft">（減点なし）</span>
                    )}
                  </span>
                </div>
                {f.where && <div className="mt-0.5 text-xs text-ink-soft">{f.where}</div>}
                {f.context && (
                  <div className="mt-1 text-xs leading-relaxed text-ink-muted">
                    「… {f.context} …」
                  </div>
                )}
                <dl className="mt-2 space-y-1 text-[13px] leading-relaxed">
                  <div>
                    <dt className="font-medium text-ink">確認理由</dt>
                    <dd className="text-ink-muted">{f.reason}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">推奨対応</dt>
                    <dd className="text-ink-muted">{f.recommendedAction}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* 注記（分類の定義と位置づけ） */}
      <ul className="mt-4 break-inside-avoid space-y-1 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-ink-soft">
        <li>
          ※ この一覧は初期スクリーニングの記録です。分類は人による確認の優先度を示すもので、法的判断ではありません。
        </li>
        <li>
          ※ 「文脈確認」は受診促進・副作用やリスクの説明などの文脈で検出された確認項目の記録で、
          スコアの減点対象にはしていません。
        </li>
        <li>※ 最終確認は医療広告ガイドラインおよび専門家による確認を前提にしてください。</li>
      </ul>
    </div>
  );
}
