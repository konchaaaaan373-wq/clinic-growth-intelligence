import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import FeatureCard from "../components/FeatureCard";
import DisclaimerBox from "../components/DisclaimerBox";
import LoadingSteps from "../components/LoadingSteps";
import QuickUrlAuditForm from "../components/QuickUrlAuditForm";
import type { AuditInput } from "../lib/types";
import { requestAudit } from "../lib/api";
import { BRAND, inferClinicNameFromUrl, saveReport } from "../lib/utils";

const icons = {
  hp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h18M8 21h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  map: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  sns: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.2 11l6.6-3.6M8.2 13l6.6 3.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

const SAMPLE_SCORES = [
  { label: "HP集患導線", score: 15, max: 25 },
  { label: "SEO/医療コンテンツ", score: 15, max: 25 },
  { label: "MEO準備度", score: 10, max: 15 },
  { label: "SNS集患接続", score: 7, max: 15 },
  { label: "医療広告リスク", score: 8, max: 10 },
  { label: "MMM準備度", score: 9, max: 10 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleQuickAudit(websiteUrl: string) {
    setSubmitting(true);
    setError(null);

    const quickInput: AuditInput = {
      clinicName: inferClinicNameFromUrl(websiteUrl),
      websiteUrl,
      specialty: "未指定",
      location: "未指定",
      consent: true,
      source: "quick-url",
    };

    const result = await requestAudit(quickInput);

    if (result.ok) {
      saveReport(result.report);
      navigate("/results", { state: { report: result.report } });
    } else {
      setSubmitting(false);
      setError(result.error);
    }
  }

  if (submitting) {
    return (
      <div className="container-page py-16">
        <LoadingSteps />
      </div>
    );
  }

  return (
    <>
      <Hero onQuickAudit={handleQuickAudit} submitting={submitting} error={error} />

      {/* できること */}
      <section className="container-page py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-ink">外部から見える集患導線を、横断的に診断</h2>
          <p className="mt-3 text-ink-muted">
            HP、MEO、SNS、医療広告リスクを外部から観測できる範囲で自動チェック。
            広告出稿の前に、集患の土台がどこで詰まっているかを可視化します。
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={icons.hp} title="HP集患導線の診断" description="予約・電話・LINEのCTA、初診案内、診療時間・アクセスなど、来院につながる導線を評価します。" />
          <FeatureCard icon={icons.search} title="SEO/医療コンテンツ" description="title・description・見出し、疾患/症状ページ、内部リンク、構造化データの有無を確認します。" />
          <FeatureCard icon={icons.map} title="MEO準備度" description="住所・電話・診療時間・地図リンクなど、Googleビジネスプロフィールを活かす土台を評価します。" />
          <FeatureCard icon={icons.sns} title="SNS集患接続" description="YouTube/Instagram/TikTok/LINEの有無と、HP・予約への相互接続を確認します。" />
          <FeatureCard icon={icons.shield} title="医療広告リスクの初期チェック" description="文脈により確認が望ましい表現を機械的にスクリーニングします（違反の断定ではありません）。" />
          <FeatureCard icon={icons.chart} title="MMM準備度" description="日別初診数の推定モデル（MMM）を始めるために、どのデータが足りないかを可視化します。" />
        </div>
      </section>

      {/* 無料版 / 有料版 */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div className="card p-6">
            <span className="badge border-brand-200 bg-brand-50 text-brand-700">
              {BRAND.free}でわかること
            </span>
            <ul className="mt-4 space-y-3 text-sm text-ink-muted">
              {[
                "外部から見える集患導線の改善余地を確認できる",
                "HP・MEO・SNS・医療広告上の要確認表現を横断して診断できる",
                "「実際に初診数に効いたか」を測るために、どのデータが足りないかがわかる",
                `${BRAND.mmm}（初診寄与の推定）への準備度が分かる`,
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-brand-600">●</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <span className="badge border-slate-200 bg-slate-50 text-ink-muted">
              {BRAND.analytics}でできること（将来構想）
            </span>
            <ul className="mt-4 space-y-3 text-sm text-ink-muted">
              {[
                "日別初診数を目的変数にする",
                "HP記事・広告・YouTube・SNS・ポスティング・MEO・休診日・曜日・祝日・天気などを説明変数にする",
                `${BRAND.mmm}で、どの施策が初診数にどれだけ寄与したかを推定する`,
                "施策別の推定CPA、来月の施策提案、予算配分提案を出す",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-ink-soft">○</span>
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/about-mmm" className="mt-5 inline-block text-sm font-medium text-brand-700 hover:underline">
              MMM（初診数モデリング）とは →
            </Link>
          </div>
        </div>
      </section>

      {/* 診断スコアの例 */}
      <section className="container-page py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-ink">診断スコアの例</h2>
          <p className="mt-3 text-ink-muted">
            総合100点満点で、6つの観点をスコア化します。以下は「サンプル整形外科クリニック」の例です。
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="card flex flex-col items-center justify-center p-8 lg:col-span-1">
            <div className="text-5xl font-bold text-brand-700">64</div>
            <div className="mt-1 text-sm text-ink-soft">/ 100 ・ ランク B</div>
            <Link to="/sample" className="btn-secondary mt-5">
              サンプル結果を見る
            </Link>
          </div>
          <div className="card p-6 lg:col-span-2">
            <div className="space-y-3">
              {SAMPLE_SCORES.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink">{s.label}</span>
                    <span className="tabular-nums text-ink-muted">
                      {s.score}/{s.max}
                    </span>
                  </div>
                  <div className="bar-track mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bar-fill h-full rounded-full bg-brand-600"
                      style={{ width: `${(s.score / s.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 注意書き + CTA */}
      <section className="container-page pb-20">
        <DisclaimerBox title="ご利用にあたっての前提" tone="warning">
          外部URLだけでは、真のマーケティング効果、実際の初診CPA、新患数への寄与、広告費対効果、
          直接来院を含めた実成果は算出できません。本診断は「外部から見える集患力診断」および
          「MMM準備診断（施策効果測定のための事前監査）」として提供しており、効果を断定するものではありません。
          患者個人情報は入力しないでください。
        </DisclaimerBox>
        <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-6 sm:p-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold text-ink">
              まずはHP URLから、外部集患力を確認
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              患者情報は不要です。外部情報に基づく初期レポートを作成します。詳しい情報は後から追加できます。
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-xl">
            <QuickUrlAuditForm
              onSubmit={handleQuickAudit}
              submitting={submitting}
              variant="compact"
              externalError={error}
            />
            <div className="mt-3 text-center">
              <Link
                to="/audit"
                className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                詳しく入力して診断する →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
