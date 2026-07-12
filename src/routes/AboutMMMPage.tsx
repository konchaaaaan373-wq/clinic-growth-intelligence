import { Link } from "react-router-dom";
import DisclaimerBox from "../components/DisclaimerBox";
import { MMM_REQUIRED_DATA } from "../lib/scoring";
import { BRAND } from "../lib/utils";

export default function AboutMMMPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <span className="badge border-brand-200 bg-brand-50 text-brand-700">解説</span>
        <h1 className="mt-3 text-3xl font-bold text-ink">
          {BRAND.mmm}｜MMM（マーケティング・ミックス・モデリング）とは
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {BRAND.mmm} は、<strong className="text-ink">日別初診数などの成果</strong>に対して、広告、SEO記事、
          YouTube、Instagram、TikTok、ポスティング、曜日、休診日、天気などが
          <strong className="text-ink">どれくらい関係しているか</strong>を、
          時系列データから推定する、{BRAND.analytics} の中核機能です。
        </p>

        <div className="mt-6 card p-6">
          <h2 className="text-lg font-bold text-ink">クリニックにとっての強み</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li className="flex gap-2">
              <span className="text-brand-600">●</span>
              オンライン予約だけでなく、電話予約や直接来院を含めた
              <strong className="text-ink">実成果に近づける</strong>点が強みです。
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">●</span>
              1つの施策だけを見るのではなく、複数チャネルを同時に評価し、
              <strong className="text-ink">どの施策が初診に効いたか</strong>を分解して推定します。
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">●</span>
              個々の患者データではなく、日別の集計データを使うため、
              個人情報に踏み込まずに分析しやすい点も特長です。
            </li>
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

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/audit" className="btn-primary">
            {BRAND.free}を開始
          </Link>
          <Link to="/sample" className="btn-secondary">
            サンプル結果を見る
          </Link>
        </div>
      </div>
    </div>
  );
}
