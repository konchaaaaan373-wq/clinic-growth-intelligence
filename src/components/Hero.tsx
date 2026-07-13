import { Link } from "react-router-dom";
import { BRAND } from "../lib/utils";

/** ヒーローのレポートプレビューに表示する領域別スコア（サンプルレポートと同じ値） */
const PREVIEW_SCORES = [
  { label: "HP集患導線", score: 15, max: 25 },
  { label: "SEO/医療コンテンツ", score: 15, max: 25 },
  { label: "MEO準備度", score: 10, max: 15 },
  { label: "SNS集患接続", score: 7, max: 15 },
  { label: "医療広告スクリーニング", score: 8, max: 10 },
  { label: "MMM準備度", score: 9, max: 10 },
];

/** プレビューに示すレポートの章構成（実際のレポートと同じ番号・見出し） */
const PREVIEW_SECTIONS = [
  { no: "02", title: "優先改善（今すぐ直すべき3点）" },
  { no: "03", title: "スコア内訳（領域別評価）" },
  { no: "04", title: "所見とチャネル別コメント" },
  { no: "05", title: "医療広告スクリーニング（初期スクリーニング）" },
  { no: "06", title: "MMM（初診数モデリング）準備度" },
  { no: "07", title: "前提と限界" },
];

/**
 * レポートそのものを主役にしたヒーロー。
 * 左に位置づけの説明と落ち着いたCTA、右にレポートの文書プレビューを置く。
 */
export default function Hero() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container-page grid gap-12 py-14 sm:py-16 lg:grid-cols-[1fr,minmax(0,26rem)] lg:items-center lg:gap-16 lg:py-20">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-700">
            {BRAND.product}｜医療機関向け
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-snug text-ink sm:text-4xl">
            クリニックの集患力を、
            <br className="hidden sm:block" />
            外部情報から評価するレポート。
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink-muted">
            {BRAND.free} は、HP・SEO・MEO・SNS・医療広告の表現・MMM準備度の6領域を、
            外部から観測できる情報にもとづいて評価し、1つのレポートにまとめます。
            実データによる分析（{BRAND.analytics}）へ進む前の、現在地の確認としてご利用いただけます。
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/audit" className="btn-primary">
              {BRAND.free} をはじめる
            </Link>
            <Link to="/sample" className="btn-secondary">
              サンプルレポートを見る
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-xs leading-relaxed text-ink-soft">
            外部から観測できる情報のみで作成する準備度評価です。効果測定ではなく、
            初診CPA・ROI・施策別の初診寄与は算出しません。患者情報は不要です。
          </p>
        </div>

        {/* レポートの文書プレビュー（サンプルレポートへの入口） */}
        <Link
          to="/sample"
          className="group block"
          aria-label="サンプルレポートを見る"
        >
          <div
            className="rounded-md border border-slate-200 bg-white p-5 shadow-card transition group-hover:shadow-cardHover sm:p-6"
            aria-hidden
          >
            <div className="flex flex-wrap items-baseline justify-between gap-1 border-b-2 border-brand-800 pb-2">
              <span className="text-[10px] font-bold tracking-wide text-brand-800">
                {BRAND.product}
              </span>
              <span className="text-[9px] text-ink-soft">外部情報に基づく初期レポート</span>
            </div>
            <div className="mt-2.5 text-sm font-bold text-ink">{BRAND.free} 診断レポート</div>
            <div className="mt-0.5 text-[10px] text-ink-soft">
              サンプル整形外科クリニック（整形外科・世田谷区）
            </div>

            <div className="mt-3.5 flex items-baseline gap-2 border-b border-slate-200 pb-1.5">
              <span className="text-[10px] font-bold tabular-nums text-brand-700">01</span>
              <span className="text-[11px] font-bold text-ink">総評（エグゼクティブサマリー）</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold leading-none text-brand-700">64</span>
              <span className="text-[10px] text-ink-soft">/ 100・ランク B</span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {PREVIEW_SCORES.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-[10px] text-ink-muted">
                    {s.label}
                  </span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-brand-600"
                      style={{ width: `${(s.score / s.max) * 100}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-ink-soft">
                    {s.score}/{s.max}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3.5 space-y-1 border-t border-slate-100 pt-2.5">
              {PREVIEW_SECTIONS.map((s) => (
                <div key={s.no} className="flex items-baseline gap-2">
                  <span className="text-[9px] font-bold tabular-nums text-brand-700">{s.no}</span>
                  <span className="truncate text-[10px] text-ink-muted">{s.title}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-brand-700 underline-offset-2 group-hover:underline">
            サンプルレポートを見る →
          </p>
        </Link>
      </div>
    </section>
  );
}
