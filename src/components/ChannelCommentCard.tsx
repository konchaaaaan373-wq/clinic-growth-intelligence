import type { ChannelComment } from "../lib/types";

// 信号機色（緑/赤）は使わず、ネイビー＝整っている／アンバー＝確認・改善の注意喚起のみで示す
const statusStyle: Record<ChannelComment["status"], { label: string; cls: string }> = {
  good: { label: "良好", cls: "border-brand-200 bg-brand-50 text-brand-800" },
  partial: { label: "一部あり", cls: "border-slate-200 bg-slate-50 text-ink-muted" },
  weak: { label: "要改善", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  unknown: { label: "未評価", cls: "border-slate-200 bg-white text-ink-soft" },
};

export default function ChannelCommentCard({ comment }: { comment: ChannelComment }) {
  const s = statusStyle[comment.status];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">{comment.channelLabel}</h4>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{comment.comment}</p>
    </div>
  );
}
