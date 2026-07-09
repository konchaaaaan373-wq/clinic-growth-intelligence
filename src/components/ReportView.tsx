import { Link } from "react-router-dom";
import type { AuditReport } from "../lib/types";
import { formatDateTime, downloadReportJson, BRAND } from "../lib/utils";
import ScoreCard from "./ScoreCard";
import ScoreBreakdown from "./ScoreBreakdown";
import FindingList from "./FindingList";
import RecommendationList from "./RecommendationList";
import ChannelCommentCard from "./ChannelCommentCard";
import RiskFindingCard from "./RiskFindingCard";
import MMMReadinessPanel from "./MMMReadinessPanel";
import PaidPlanCTA from "./PaidPlanCTA";
import NextStepsFunnel from "./NextStepsFunnel";
import DisclaimerBox from "./DisclaimerBox";

type Props = {
  report: AuditReport;
  isSample?: boolean;
};

export default function ReportView({ report, isSample }: Props) {
  const { summary, scores } = report;

  return (
    <div className="space-y-6 print-full">
      {/* 印刷（PDF）時のみ表示するブランドヘッダー */}
      <div className="hidden print:block border-b border-slate-200 pb-3">
        <div className="text-xs font-semibold tracking-wide text-brand-700">{BRAND.product}</div>
        <div className="text-lg font-bold text-ink">
          {BRAND.free} 診断レポート
          {isSample && "（サンプル）"}
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">
          {report.input.clinicName}（{report.input.specialty}・{report.input.location}）／ 作成日時:{" "}
          {formatDateTime(report.createdAt)}
        </div>
      </div>

      {/* ヘッダー行（画面表示用） */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-700">
            {BRAND.product}・{BRAND.free}
          </p>
          <h1 className="text-2xl font-bold text-ink">診断レポート</h1>
          <p className="text-sm text-ink-soft">
            {report.input.clinicName}（{report.input.specialty}・{report.input.location}）／
            作成日時: {formatDateTime(report.createdAt)}
            {isSample && "（サンプル）"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            印刷 / PDF保存
          </button>
          <button onClick={() => downloadReportJson(report)} className="btn-secondary">
            JSONダウンロード
          </button>
        </div>
      </div>

      {report.notices.length > 0 && (
        <DisclaimerBox tone="neutral">
          <ul className="space-y-1">
            {report.notices.map((n, i) => (
              <li key={i}>・{n}</li>
            ))}
          </ul>
        </DisclaimerBox>
      )}

      <ScoreCard
        overallScore={summary.overallScore}
        grade={summary.grade}
        oneLineDiagnosis={summary.oneLineDiagnosis}
        clinicName={report.input.clinicName}
      />

      <div className="card p-6">
        <h3 className="text-base font-bold text-ink">総評（エグゼクティブサマリー）</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{summary.executiveSummary}</p>
      </div>

      {/* URLのみで診断した場合の情報追加案内 */}
      {report.input.source === "quick-url" && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5 no-print">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-sm font-bold text-brand-800">
                このレポートはHP URLのみで作成されています
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                診療科、所在地、Googleマップ、YouTube、Instagram、TikTok、LINE、予約URLを追加すると、
                SEO・MEO・SNS接続・MMM準備度の評価精度が高まります。
              </p>
            </div>
            <Link
              to={`/audit?websiteUrl=${encodeURIComponent(report.input.websiteUrl)}`}
              className="btn-primary whitespace-nowrap"
            >
              情報を追加して再診断する
            </Link>
          </div>
        </div>
      )}

      {/* 今すぐ直すべき3点（最重要・アクセント付きで目立たせる） */}
      <div className="rounded-xl border-2 border-brand-200 bg-brand-50/40 p-1.5">
        <RecommendationList
          title="今すぐ直すべき3点"
          subtitle="効果が大きく着手しやすい改善から着手しましょう。各項目に「なぜ重要か／何を直すか／期待される効果」を記載しています。"
          items={report.quickWins}
          numbered
        />
      </div>

      <ScoreBreakdown scores={scores} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendationList
          title="伸ばせる余地が大きい3点"
          subtitle="現状スコアが低く、改善インパクトが大きい領域です。"
          items={report.growthOpportunities}
          numbered
        />
        <FindingList title="主な所見" findings={report.findings} />
      </div>

      <div>
        <h3 className="mb-3 text-base font-bold text-ink">チャネル別コメント</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.channelComments.map((c) => (
            <ChannelCommentCard key={c.channel} comment={c} />
          ))}
        </div>
      </div>

      <RiskFindingCard findings={report.medicalAdRiskFindings} />

      <MMMReadinessPanel readiness={report.mmmReadiness} />

      <NextStepsFunnel />

      <div className="no-print">
        <PaidPlanCTA clinicName={report.input.clinicName} />
      </div>

      {/* 生データ（折りたたみ・任意参照） */}
      <details className="card p-6 no-print">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          解析の生データを表示（技術的な詳細）
        </summary>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(report.rawDiagnostics, null, 2)}
        </pre>
      </details>
    </div>
  );
}
