import { Link } from "react-router-dom";
import { BRAND } from "../lib/utils";
import { SAMPLE_REPORT } from "../lib/sampleReport";
import type { ScoreDetail } from "../lib/types";
import { balloonColor } from "../lib/palette";
import StyleIcon from "./StyleIcon";

// ヒーローのプレビューはサンプルレポートの実計算値から導出する。
// スコアリングのルール変更が入っても、ここが古い数値のまま残らない。
const s = SAMPLE_REPORT.scores;
const PREVIEW_SCORES: { label: string; d: ScoreDetail }[] = [
  { label: "HP集患導線", d: s.websiteConversion },
  { label: "SEO/医療コンテンツ", d: s.seoContent },
  { label: "MEO準備度", d: s.meoReadiness },
  { label: "SNS集患接続", d: s.snsConnection },
  { label: "医療広告スクリーニング", d: s.medicalAdRisk },
  { label: "MMM準備度", d: s.mmmReadiness },
];
const PREVIEW_OVERALL = SAMPLE_REPORT.summary.overallScore;
const PREVIEW_GRADE = SAMPLE_REPORT.summary.grade;
const PREVIEW_STYLE = SAMPLE_REPORT.qualitative?.style;

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
 * 風船のキービジュアル（Canvaで作成）を主役にしたヒーロー。
 * 左に位置づけの説明とCTA、右に風船の絵と、その上に重ねた
 * レポートプレビュー（スクラップブック風）を置く。
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-cream-50">
      {/* 多色の紙吹雪ドット（ごく薄く。印刷では出さない） */}
      <div aria-hidden className="confetti-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="container-page relative grid gap-12 py-14 sm:py-16 lg:grid-cols-[1fr,minmax(0,27rem)] lg:items-center lg:gap-16 lg:py-20">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-700">
            {BRAND.product}｜医療機関向け
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-snug text-ink sm:text-4xl">
            外部から見える
            <span className="marker-underline">集患導線</span>を、
            <br className="hidden sm:block" />
            評価するレポート。
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

        {/* 風船のキービジュアル + レポートプレビュー（サンプルレポートへの入口） */}
        <div className="relative">
          <img
            src="/images/balloons-hero.png"
            alt=""
            aria-hidden
            width={1280}
            height={720}
            className="w-full rotate-1 rounded-3xl border-8 border-white object-cover shadow-card"
          />
          <Link
            to="/sample"
            className="group relative z-10 mx-auto -mt-14 block max-w-[22rem] sm:-mt-20"
            aria-label="サンプルレポートを見る"
          >
            {/* マスキングテープ風の留め */}
            <span
              aria-hidden
              className="absolute -top-2.5 left-1/2 z-20 h-5 w-16 -translate-x-1/2 -rotate-3 rounded-sm bg-sunny-400/70"
            />
            <div
              className="-rotate-1 rounded-xl border border-slate-200 bg-white p-5 shadow-card transition group-hover:rotate-0 group-hover:shadow-cardHover sm:p-6"
              aria-hidden
            >
              <div className="flex flex-wrap items-baseline justify-between gap-1 border-b-2 border-brand-700 pb-2">
                <span className="text-[10px] font-bold tracking-wide text-brand-700">
                  {BRAND.product}
                </span>
                <span className="text-[9px] text-ink-soft">外部情報に基づく初期レポート</span>
              </div>
              <div className="mt-2.5 font-display text-sm font-bold text-ink">
                {BRAND.free} 診断レポート
              </div>
              <div className="mt-0.5 text-[10px] text-ink-soft">
                サンプル整形外科クリニック（整形外科・世田谷区）
              </div>

              <div className="mt-3.5 flex items-baseline gap-2 border-b border-slate-200 pb-1.5">
                <span className="text-[10px] font-bold tabular-nums text-brand-700">01</span>
                <span className="text-[11px] font-bold text-ink">総評（エグゼクティブサマリー）</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold leading-none text-brand-600">
                  {PREVIEW_OVERALL ?? "—"}
                </span>
                <span className="text-[10px] text-ink-soft">
                  / 100{PREVIEW_GRADE ? `・ランク ${PREVIEW_GRADE}` : ""}
                </span>
                {PREVIEW_STYLE && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-ink-muted">
                    <StyleIcon style={PREVIEW_STYLE} size={12} className="text-brand-700" />
                    {PREVIEW_STYLE.name}
                  </span>
                )}
              </div>
              <div className="mt-2.5 space-y-1.5">
                {PREVIEW_SCORES.map(({ label, d }, i) => {
                  const evalMax = d.evaluableMaxScore ?? d.maxScore;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 truncate text-[10px] text-ink-muted">
                        {label}
                      </span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${(d.score / d.maxScore) * 100}%`,
                            backgroundColor: balloonColor(i).hex,
                          }}
                        />
                      </span>
                      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-ink-soft">
                        {d.score}/{evalMax}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3.5 space-y-1 border-t border-slate-100 pt-2.5">
                {PREVIEW_SECTIONS.map((sec, i) => (
                  <div key={sec.no} className="flex items-baseline gap-2">
                    <span
                      className="text-[9px] font-bold tabular-nums"
                      style={{ color: balloonColor(i + 1).hex }}
                    >
                      {sec.no}
                    </span>
                    <span className="truncate text-[10px] text-ink-muted">{sec.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs font-bold text-brand-700 underline-offset-2 group-hover:underline">
              サンプルレポートを見る →
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
