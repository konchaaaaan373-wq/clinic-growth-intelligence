import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import LoadingSteps from "../components/LoadingSteps";
import QuickUrlAuditForm from "../components/QuickUrlAuditForm";
import type { AuditInput } from "../lib/types";
import { requestAudit } from "../lib/api";
import { BRAND, inferClinicNameFromUrl, saveReport } from "../lib/utils";

/** 評価フレームワーク（レポートの領域構成と同じ6領域・100点満点） */
const FRAMEWORK = [
  {
    no: "01",
    label: "HP集患導線",
    max: 25,
    description:
      "予約・電話・LINEなどのCTA、初診案内、診療時間・アクセスといった、来院につながるサイト構成を確認します。",
  },
  {
    no: "02",
    label: "SEO / 医療コンテンツ",
    max: 25,
    description:
      "title・description・見出しの設計、疾患・症状ページ、内部リンク、構造化データの有無を確認します。",
  },
  {
    no: "03",
    label: "MEO準備度",
    max: 15,
    description:
      "住所・電話・診療時間・地図リンクなど、Googleビジネスプロフィールを活かすための土台を確認します。",
  },
  {
    no: "04",
    label: "SNS集患接続",
    max: 15,
    description:
      "YouTube・Instagram・TikTok・LINEの有無と、HP・予約導線への相互接続を確認します。",
  },
  {
    no: "05",
    label: "医療広告スクリーニング",
    max: 10,
    description:
      "確認が望ましい可能性のある表現を機械的に抽出し、人による確認の優先度で分類します（法的判断ではありません）。",
  },
  {
    no: "06",
    label: "MMM準備度",
    max: 10,
    description:
      "初診数モデリング（MMM）に必要なデータのうち、何が揃っていて何が足りないかを確認します。",
  },
];

/** Free → Analytics → MMM の製品階層 */
const PRODUCT_STEPS = [
  {
    step: "1",
    name: BRAND.free,
    tagline: "無料・外部情報にもとづく準備度評価",
    description:
      "HP URLと公開情報から、集患の土台がどこで詰まっているかを整理します。効果測定の前に、現在地を確認するためのレポートです。",
  },
  {
    step: "2",
    name: BRAND.analytics,
    tagline: "有料・実データにもとづく分析基盤",
    description:
      "日別初診数や広告費などの運用データを用いた分析基盤です。施策が実際に効いたかどうかは、こちらの領域で扱います。",
  },
  {
    step: "3",
    name: BRAND.mmm,
    tagline: "初診数を軸にしたモデリング",
    description:
      "初診数を軸にしたマーケティング・ミックス・モデリングで、どの施策が初診にどれだけ寄与したかを推定します。",
  },
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
      <Hero />

      {/* 評価フレームワーク */}
      <section className="container-page py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-ink">6領域・100点満点の評価フレームワーク</h2>
          <p className="mt-3 text-[15px] leading-7 text-ink-muted">
            外部から観測できる情報を、集患に関わる6つの領域に整理して評価します。
            各領域の評価根拠と改善余地は、レポート内に明記します。
          </p>
        </div>

        <div className="mt-8">
          <div className="hidden border-b border-slate-300 pb-2 text-[11px] tracking-wide text-ink-soft sm:grid sm:grid-cols-[3rem,13rem,1fr,4.5rem] sm:gap-x-6">
            <span>No.</span>
            <span>診断領域</span>
            <span>主な確認項目</span>
            <span className="text-right">配点</span>
          </div>
          {FRAMEWORK.map((d) => (
            <div
              key={d.no}
              className="grid grid-cols-[auto,1fr,auto] gap-x-2 gap-y-1.5 border-b border-slate-200 py-4 sm:grid-cols-[3rem,13rem,1fr,4.5rem] sm:gap-x-6"
            >
              <span className="text-sm font-bold tabular-nums text-brand-700">{d.no}</span>
              <h3 className="text-[15px] font-semibold text-ink">{d.label}</h3>
              <span className="text-right text-sm tabular-nums text-ink-muted sm:col-start-4 sm:row-start-1">
                {d.max}点
              </span>
              <p className="col-span-3 text-sm leading-relaxed text-ink-muted sm:col-span-1 sm:col-start-3 sm:row-start-1">
                {d.description}
              </p>
            </div>
          ))}
          <div className="flex items-baseline justify-end gap-4 py-3">
            <span className="text-sm text-ink-soft">合計</span>
            <span className="text-sm font-semibold tabular-nums text-ink">100点</span>
          </div>
        </div>
      </section>

      {/* Free → Analytics → MMM の階層 */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-ink">現在地の確認から、実データによる分析へ</h2>
            <p className="mt-3 text-[15px] leading-7 text-ink-muted">
              {BRAND.free} は、実データにもとづく分析へ進むための最初のステップです。
              外部から見える範囲の評価と、実データによる効果の分析は、明確に分けて提供します。
            </p>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {PRODUCT_STEPS.map((p) => (
              <div key={p.step} className="border-t border-slate-300 pt-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-bold tabular-nums text-brand-700">{p.step}</span>
                  <h3 className="text-base font-semibold text-ink">{p.name}</h3>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{p.tagline}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{p.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/about-mmm"
              className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              MMM（初診数モデリング）とは →
            </Link>
          </div>
        </div>
      </section>

      {/* 前提と限界 */}
      <section className="container-page py-16">
        <div className="border-b border-slate-300 pb-2">
          <h2 className="text-lg font-bold text-ink">前提と限界</h2>
        </div>
        <ul className="mt-4 max-w-3xl space-y-2 text-sm leading-relaxed text-ink-muted">
          <li>
            ・{BRAND.free} は、外部から観測できる情報にもとづく準備度評価であり、効果測定ではありません。
          </li>
          <li>
            ・初診CPA・ROI・施策別の初診寄与は、URLの解析からは算出しません（実データにもとづく分析は{" "}
            {BRAND.analytics} の領域です）。
          </li>
          <li>
            ・医療広告に関する検出は、人による確認の優先度を示す初期スクリーニングであり、法的判断ではありません。
          </li>
          <li>
            ・取得できなかった情報は「評価不能」として扱い、品質の低さとは区別します。患者個人情報は入力しないでください。
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-card sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold text-ink">{BRAND.free} をはじめる</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
              HP URLから、外部情報にもとづく初期レポートを作成します。患者情報は不要です。
              診療科・所在地・SNSなどの情報は、後から追加して評価の精度を高められます。
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
                詳しい情報を入力して作成する →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
