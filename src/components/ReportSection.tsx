type Props = {
  /** セクション番号（"01" など） */
  no: string;
  title: string;
  /** 見出し直下の補足説明（任意） */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** 印刷時にこのセクションの直前で改ページする */
  printBreakBefore?: boolean;
};

/**
 * レポートの番号付きセクション。
 * カードの箱ではなく、見出し＋ヘアラインの文書スタイルでコンテンツを区切る。
 */
export default function ReportSection({ no, title, description, children, printBreakBefore }: Props) {
  return (
    <section className={printBreakBefore ? "print-page-break" : undefined}>
      <div className="break-inside-avoid break-after-avoid border-b border-slate-300 pb-2">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-bold tabular-nums text-brand-700" aria-hidden>
            {no}
          </span>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
        </div>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{description}</p>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
