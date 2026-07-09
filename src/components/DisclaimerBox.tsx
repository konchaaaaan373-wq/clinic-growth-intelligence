type Props = {
  title?: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning";
};

export default function DisclaimerBox({ title, children, tone = "neutral" }: Props) {
  const toneClasses =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-ink-muted";
  return (
    <div className={`rounded-lg border p-4 text-sm leading-relaxed ${toneClasses}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
