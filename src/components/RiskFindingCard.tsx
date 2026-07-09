import type { RiskFinding } from "../lib/types";

type Props = {
  findings: RiskFinding[];
};

export default function RiskFindingCard({ findings }: Props) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-ink">医療広告リスク（初期スクリーニング）</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        以下は機械的に抽出した「要確認の可能性がある表現」です。違反の断定ではなく、法的判断でもありません。
        最終確認は医療広告ガイドラインや専門家確認を前提にしてください。
      </p>

      {findings.length === 0 ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          初期スクリーニングでは、注意が必要な表現は検出されませんでした（保証ではありません）。
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {findings.map((f) => (
            <li key={f.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge border-amber-300 bg-amber-100 text-amber-800">
                  要確認表現
                </span>
                <span className="text-sm font-bold text-ink">「{f.expression}」</span>
                {f.where && (
                  <span className="text-xs text-ink-soft">検出箇所: {f.where}</span>
                )}
              </div>
              {f.context && (
                <p className="mt-2 rounded bg-white/70 px-2 py-1 text-xs text-ink-muted">
                  … {f.context} …
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
