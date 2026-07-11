import { Link } from "react-router-dom";
import type { AuditReport } from "../lib/types";
import {
  formatDateTime,
  downloadReportJson,
  BRAND,
  assessInputCompleteness,
  clinicMetaLabel,
} from "../lib/utils";
import { isUrlOnlyAudit } from "../lib/scoring";
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
  const fetchFailed = summary.siteFetchFailed;
  const isUrlOnly = isUrlOnlyAudit(report.input) && !fetchFailed;
  const metaLabel = clinicMetaLabel(report.input);
  const inputCompleteness = assessInputCompleteness(report.input);
  const reAuditHref = `/audit?websiteUrl=${encodeURIComponent(report.input.websiteUrl)}`;

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
          {report.input.clinicName}（{metaLabel}）／ 対象URL: {report.input.websiteUrl} ／
          作成日時: {formatDateTime(report.createdAt)}
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
            {report.input.clinicName}（{metaLabel}）／ 対象URL: {report.input.websiteUrl} ／
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
        <p className="w-full text-xs text-ink-soft no-print">
          ※ PDF保存時は、ブラウザの印刷ダイアログで「ヘッダーとフッター」を<strong>オフ</strong>、
          「背景グラフィック」を<strong>オン</strong>にすると、日時・URL・ページ番号が入らず
          提出用としてきれいに保存できます。
        </p>
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

      {/* 取得失敗の大きな注意（1ページ目・印刷でも表示） */}
      {fetchFailed && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/70 p-5 break-inside-avoid">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-base font-bold text-rose-900">サイト取得に失敗しました</div>
              <p className="mt-1 text-sm font-semibold text-rose-800">
                この結果はサイト品質の評価ではありません（評価不能）。
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                URLの入力誤り、一時的な通信障害、外部アクセス制限（Botブロック等）の可能性があります。
                URLを確認して再診断するか、詳細フォームから情報を追加してください。
              </p>
            </div>
            <Link to={reAuditHref} className="btn-primary whitespace-nowrap no-print">
              再診断する
            </Link>
          </div>
        </div>
      )}

      <ScoreCard
        overallScore={summary.overallScore}
        grade={summary.grade}
        oneLineDiagnosis={summary.oneLineDiagnosis}
        clinicName={report.input.clinicName}
        provisional={isUrlOnly}
        inputCompleteness={fetchFailed ? undefined : inputCompleteness}
      />

      {/* URLのみ診断の注意（1ページ目・印刷でも表示） */}
      {isUrlOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 break-inside-avoid">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-sm font-bold text-amber-900">
                このレポートはHP URLのみで作成されています
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                診療科・所在地・Googleマップ・SNS URLが未入力のため、SEO・MEO・SNS接続・症状ページ評価の一部は
                外部から見える範囲での暫定評価です。情報を追加して再診断すると、評価精度が高まります。
              </p>
            </div>
            <Link to={reAuditHref} className="btn-primary whitespace-nowrap no-print">
              情報を追加して再診断する
            </Link>
          </div>
        </div>
      )}

      <div className="card p-6 break-inside-avoid">
        <h3 className="text-base font-bold text-ink">総評（エグゼクティブサマリー）</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{summary.executiveSummary}</p>

        {/* 1ページ目で「何を直すべきか」が分かる要約 */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {fetchFailed ? "次にすべきこと（3点）" : "今すぐ直すべき3点（要約）"}
          </div>
          <ol className="mt-2 space-y-1.5">
            {report.quickWins.map((q, i) => (
              <li key={q.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="font-medium text-ink">{q.title}</span>
                {q.priority && (
                  <span className="badge border-slate-200 bg-slate-50 text-ink-soft">
                    優先度 {q.priority}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 今すぐ直すべき3点（詳細・アクセント付きで目立たせる） */}
      <div className="rounded-xl border-2 border-brand-200 bg-brand-50/40 p-1.5 break-inside-avoid">
        <RecommendationList
          title={fetchFailed ? "次にすべきこと（詳細）" : "今すぐ直すべき3点（詳細）"}
          subtitle={
            fetchFailed
              ? "サイトを取得できなかったため、まずは再診断・情報追加・アクセス制限の確認を行ってください。"
              : "効果が大きく着手しやすい改善から着手しましょう。各項目に「なぜ重要か／何を直すか／期待される効果」を記載しています。"
          }
          items={report.quickWins}
          numbered
        />
      </div>

      {/* ここから詳細（印刷時は改ページして「結論ページ」と分ける） */}
      <div className="print-break-before border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-ink">詳細レポート</h2>
        <p className="mt-1 text-sm text-ink-soft">
          ここからは各領域のスコア内訳・所見・チャネル別コメントの詳細です。
          1ページ目の結論を裏付ける根拠としてご参照ください。
        </p>
      </div>

      <ScoreBreakdown scores={scores} />

      <div className="grid gap-6 lg:grid-cols-2">
        {report.growthOpportunities.length > 0 && (
          <RecommendationList
            title="伸ばせる余地が大きい3点"
            subtitle="現状スコアが低く、改善インパクトが大きい領域です。"
            items={report.growthOpportunities}
            numbered
          />
        )}
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

      <RiskFindingCard
        findings={report.medicalAdRiskFindings}
        notEvaluable={scores.medicalAdRisk.status === "not_evaluable"}
      />

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
