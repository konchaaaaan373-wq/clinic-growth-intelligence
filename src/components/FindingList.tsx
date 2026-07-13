import type { Finding } from "../lib/types";

// 所見の区分。赤/緑の信号機色は使わず、注意喚起はアンバー、それ以外はネイビー/スレートで示す
const severityStyle: Record<Finding["severity"], string> = {
  high: "border-amber-300 bg-amber-100 text-amber-900",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-50 text-ink-muted",
  info: "border-brand-200 bg-brand-50 text-brand-800",
};

const severityLabel: Record<Finding["severity"], string> = {
  high: "優先度 高",
  medium: "優先度 中",
  low: "優先度 低",
  info: "良好",
};

type Props = {
  findings: Finding[];
  emptyText?: string;
};

/** 所見リスト本体。見出しはセクション側が持つ */
export default function FindingList({ findings, emptyText }: Props) {
  if (findings.length === 0) {
    return <p className="text-sm text-ink-soft">{emptyText ?? "該当する所見はありません。"}</p>;
  }
  return (
    <ul className="space-y-3">
      {findings.map((f) => (
        <li key={f.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${severityStyle[f.severity]}`}>{severityLabel[f.severity]}</span>
            <span className="text-sm font-semibold text-ink">{f.title}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.detail}</p>
        </li>
      ))}
    </ul>
  );
}
