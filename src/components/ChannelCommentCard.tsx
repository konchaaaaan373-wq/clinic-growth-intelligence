import type { ChannelComment } from "../lib/types";

const statusStyle: Record<ChannelComment["status"], { label: string; cls: string }> = {
  good: { label: "良好", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  partial: { label: "一部あり", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  weak: { label: "要改善", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  unknown: { label: "未評価", cls: "border-slate-200 bg-slate-50 text-ink-soft" },
};

export default function ChannelCommentCard({ comment }: { comment: ChannelComment }) {
  const s = statusStyle[comment.status];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-ink">{comment.channelLabel}</h4>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{comment.comment}</p>
    </div>
  );
}
