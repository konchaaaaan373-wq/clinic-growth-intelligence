import type { Finding } from "../lib/types";

const severityStyle: Record<Finding["severity"], string> = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-brand-200 bg-brand-50 text-brand-700",
  info: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const severityLabel: Record<Finding["severity"], string> = {
  high: "優先度 高",
  medium: "優先度 中",
  low: "優先度 低",
  info: "良好",
};

type Props = {
  title: string;
  findings: Finding[];
  emptyText?: string;
};

export default function FindingList({ title, findings, emptyText }: Props) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {findings.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{emptyText ?? "該当する所見はありません。"}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {findings.map((f) => (
            <li key={f.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${severityStyle[f.severity]}`}>
                  {severityLabel[f.severity]}
                </span>
                <span className="text-sm font-semibold text-ink">{f.title}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
