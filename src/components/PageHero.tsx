import { BalloonTrio } from "./BalloonMark";

type Props = {
  /** 見出し上の小さなラベル（例: "Neco Clinic Report｜医療機関向け"） */
  eyebrow?: string;
  /** ページ見出し。波線マーカーは title の中で <span className="marker-underline"> を使って指定する */
  title: React.ReactNode;
  /** 見出し下のリード文 */
  lead?: React.ReactNode;
  /** リード文の下に置く任意要素（CTA・注記など） */
  children?: React.ReactNode;
};

/**
 * 全ページ共通のページヘッダー帯。
 * クリーム地＋薄い紙吹雪＋浮かぶ風船で、どのページでも
 * 「風船のブランド」として同じ顔に見えるようにする。
 * トップページの大きなヒーロー（Hero.tsx）の縮小版という位置づけ。
 */
export default function PageHero({ eyebrow, title, lead, children }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-cream-50 no-print">
      <div aria-hidden className="confetti-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="container-page relative flex items-end justify-between gap-6 py-10 sm:py-12">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wide text-brand-700">{eyebrow}</p>
          )}
          <h1 className="mt-2 text-2xl font-bold leading-snug text-ink sm:text-3xl">{title}</h1>
          {lead && <p className="mt-3 text-[15px] leading-7 text-ink-muted">{lead}</p>}
          {children}
        </div>
        <div className="hidden shrink-0 pb-1 sm:block">
          <BalloonTrio size={34} />
        </div>
      </div>
    </section>
  );
}
