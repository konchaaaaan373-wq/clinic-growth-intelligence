import { Link } from "react-router-dom";
import DisclaimerBox from "../components/DisclaimerBox";
import PageHero from "../components/PageHero";
import { MMM_REQUIRED_DATA } from "../lib/scoring";
import { BRAND, buildConsultMailto } from "../lib/utils";
import { balloonColor } from "../lib/palette";

export default function AboutMMMPage() {
  return (
    <>
      <PageHero
        eyebrow={`${BRAND.product}｜解説`}
        title={
          <>
            {BRAND.mmm}｜<span className="marker-underline">MMM</span>
            （マーケティング・ミックス・モデリング）とは
          </>
        }
        lead={
          <>
            {BRAND.mmm} は、<strong className="text-ink">日別初診数などの成果</strong>
            に対して、広告、SEO記事、YouTube、Instagram、TikTok、ポスティング、曜日、休診日、天気などが
            <strong className="text-ink">どれくらい関係しているか</strong>を、
            時系列データから推定する、{BRAND.analytics} の中核機能です。
          </>
        }
      />
      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-ink">クリニックにとっての強み</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            {[
              <>
                オンライン予約だけでなく、電話予約や直接来院を含めた
                <strong className="text-ink">実成果に近づける</strong>点が強みです。
              </>,
              <>
                1つの施策だけを見るのではなく、複数チャネルを同時に評価し、
                <strong className="text-ink">どの施策が初診に効いたか</strong>を分解して推定します。
              </>,
              <>
                個々の患者データではなく、日別の集計データを使うため、
                個人情報に踏み込まずに分析しやすい点も特長です。
              </>,
            ].map((body, i) => (
              <li key={i} className="flex items-baseline gap-2">
                {/* 風船カラーの丸ドット（識別のための彩り） */}
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ backgroundColor: balloonColor(i).hex }}
                />
                <span>{body}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 card p-6">
          <h2 className="text-lg font-bold text-ink">{BRAND.free}（無料診断）との関係</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {BRAND.free} は、{BRAND.mmm} を始める前の
            <strong className="text-ink">「準備度チェック」</strong>です。
            外部から見える集患導線を評価しつつ、MMMに必要なデータのうち何が足りていないかを可視化します。
            実際に施策別の初診寄与を推定するには、以下のようなデータの蓄積が必要になります。
          </p>
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {MMM_REQUIRED_DATA.map((d) => (
              <li key={d} className="text-sm text-ink-muted">
                ・{d}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <DisclaimerBox tone="warning" title="重要な注意">
            MMMは因果を完全に証明するものではなく、
            <strong>施策判断のための推定モデル</strong>です。
            推定結果は入力データの質・量に依存し、実際の初診CPAや寄与度を断定するものではありません。
          </DisclaimerBox>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/audit" className="btn-primary">
            {BRAND.free}を開始
          </Link>
          <Link to="/sample" className="btn-secondary">
            サンプル結果を見る
          </Link>
          <a
            href={buildConsultMailto()}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            {BRAND.analytics}について相談する →
          </a>
        </div>
        </div>
      </div>
    </>
  );
}
