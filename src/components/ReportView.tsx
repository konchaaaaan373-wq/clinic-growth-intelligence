import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { AuditReport } from "../lib/types";
import {
  formatDateTime,
  downloadReportJson,
  buildReportFileBaseName,
  BRAND,
  assessInputCompleteness,
  clinicMetaLabel,
} from "../lib/utils";
import { isUrlOnlyAudit } from "../lib/scoring";
import ScoreCard from "./ScoreCard";
import ReportSection from "./ReportSection";
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
  const fileBaseName = buildReportFileBaseName(report);

  // PDF保存（ブラウザ印刷）の初期ファイル名は document.title に依存するため、
  // レポート表示中はタイトルを診断ごとにユニークな値へ差し替え、離脱時に元へ戻す。
  useEffect(() => {
    const prevTitle = document.title;
    document.title = fileBaseName;
    return () => {
      document.title = prevTitle;
    };
  }, [fileBaseName]);

  return (
    <div className="space-y-8 print-full">
      {/* 印刷（PDF）時のみ表示するタイトルブロック */}
      <div className="hidden print:block border-b-2 border-brand-800 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm font-bold tracking-wide text-brand-800">{BRAND.product}</div>
          <div className="text-[11px] text-ink-soft">外部情報に基づく初期レポート</div>
        </div>
        <div className="mt-1.5 text-2xl font-bold leading-snug text-ink">
          {BRAND.free} 診断レポート
          {isSample && "（サンプル）"}
        </div>
        <dl className="mt-2.5 space-y-0.5 text-xs text-ink-muted">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-soft">医療機関</dt>
            <dd>
              {report.input.clinicName}（{metaLabel}）
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-soft">対象URL</dt>
            <dd>{report.input.websiteUrl}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-soft">作成日時</dt>
            <dd>{formatDateTime(report.createdAt)}</dd>
          </div>
        </dl>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-soft">
          本レポートは、URL・外部から観測できる情報に基づく準備度評価です。
          実データによる効果測定（初診CPA・施策寄与の算出）は行いません。詳細は末尾の「前提と限界」をご参照ください。
        </p>
      </div>

      {/* ヘッダー行（画面表示用） */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-700">
            {BRAND.product}・{BRAND.free}
          </p>
          <h1 className="text-[28px] font-bold leading-snug text-ink">診断レポート</h1>
          <p className="text-sm text-ink-soft">
            {report.input.clinicName}（{metaLabel}）／ 対象URL: {report.input.websiteUrl} ／
            作成日時: {formatDateTime(report.createdAt)}
            {isSample && "（サンプル）"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-primary">
            PDF保存 / 印刷
          </button>
          {/* JSONは開発/デバッグ用途。本番UIでは非表示（DEV時のみ表示） */}
          {import.meta.env.DEV && (
            <button onClick={() => downloadReportJson(report)} className="btn-secondary">
              開発用: JSONを保存
            </button>
          )}
        </div>
        <p className="w-full text-xs text-ink-soft no-print">
          ※ PDF保存時は、ブラウザの印刷設定で「ヘッダーとフッター」を<strong>オフ</strong>、
          「背景グラフィック」を<strong>オン</strong>にしてください。日時・URL・ページ番号が入らず、
          提出用としてきれいに保存できます。
        </p>
      </div>

      {/* 画面用の注意書き。印刷では末尾「前提と限界」に集約する */}
      {report.notices.length > 0 && (
        <div className="no-print">
          <DisclaimerBox tone="neutral">
            <ul className="space-y-1">
              {report.notices.map((n, i) => (
                <li key={i}>・{n}</li>
              ))}
            </ul>
          </DisclaimerBox>
        </div>
      )}

      {/* 取得失敗の大きな注意（1ページ目・印刷でも表示） */}
      {fetchFailed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-5 break-inside-avoid">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-base font-bold text-amber-900">サイト取得に失敗しました</div>
              <p className="mt-1 text-[15px] font-medium text-amber-900">
                この結果はサイト品質の評価ではありません（評価不能）。
              </p>
              <p className="mt-1.5 text-[15px] leading-7 text-ink-muted">
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
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-5 break-inside-avoid">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-[15px] font-bold text-amber-900">
                このレポートはHP URLのみで作成されています
              </div>
              <p className="mt-1.5 text-[15px] leading-7 text-ink-muted">
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

      {/* 01 総評: エグゼクティブサマリー＋優先対応の要約（印刷1ページ目の結論） */}
      <ReportSection no="01" title="総評（エグゼクティブサマリー）">
        <p className="text-[15px] leading-7 text-ink-muted">{summary.executiveSummary}</p>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {fetchFailed ? "次にすべきこと（3点・詳細は 02）" : "今すぐ直すべき3点（要約・詳細は 02）"}
          </div>
          <ol className="mt-2 space-y-1.5">
            {report.quickWins.map((q, i) => (
              <li key={q.id} className="flex items-baseline gap-2 text-[15px]">
                <span className="flex h-5 w-5 flex-shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="font-medium text-ink">{q.title}</span>
                {q.priority && <span className="annotation whitespace-nowrap">優先度 {q.priority}</span>}
              </li>
            ))}
          </ol>
        </div>
      </ReportSection>

      {/* 02 優先改善: 01の要約と同じ番号の詳細。印刷では改ページして
          1ページ目をエグゼクティブページとして独立させる */}
      <ReportSection
        no="02"
        printBreakBefore
        title={fetchFailed ? "次にすべきこと（詳細）" : "優先改善（今すぐ直すべき3点）"}
        description={
          fetchFailed
            ? "サイトを取得できなかったため、まずは再診断・情報追加・アクセス制限の確認を行ってください。"
            : "01「総評」の要約と同じ番号の項目です。各項目に「なぜ重要か／何を直すか／改善の狙い」を記載しています。優先度が高く着手しやすい改善から着手しましょう。"
        }
      >
        <RecommendationList items={report.quickWins} numbered />
      </ReportSection>

      {/* 03 スコア内訳 */}
      <ReportSection
        no="03"
        title="スコア内訳（領域別評価）"
        description="各領域の評価根拠です。✓は確認できた点、△は改善余地・確認事項を示します。"
      >
        <ScoreBreakdown scores={scores} />
      </ReportSection>

      {/* 04 所見とチャネル別コメント */}
      <ReportSection no="04" title="所見とチャネル別コメント">
        <div className="grid gap-8 lg:grid-cols-2">
          {report.growthOpportunities.length > 0 && (
            <div>
              <h3 className="text-[15px] font-semibold text-ink">伸ばせる余地が大きい3点</h3>
              <p className="mt-1 text-[13px] text-ink-soft">
                現状スコアが低く、改善余地が大きい領域です。
              </p>
              <div className="mt-3">
                <RecommendationList items={report.growthOpportunities} numbered />
              </div>
            </div>
          )}
          <div>
            <h3 className="text-[15px] font-semibold text-ink">主な所見</h3>
            <div className="mt-3">
              <FindingList findings={report.findings} />
            </div>
          </div>
        </div>

        <h3 className="mt-8 text-[15px] font-semibold text-ink">チャネル別コメント</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.channelComments.map((c) => (
            <ChannelCommentCard key={c.channel} comment={c} />
          ))}
        </div>
      </ReportSection>

      {/* 05 医療広告スクリーニング */}
      <ReportSection no="05" title="医療広告スクリーニング（初期スクリーニング）">
        <RiskFindingCard
          findings={report.medicalAdRiskFindings}
          notEvaluable={scores.medicalAdRisk.status === "not_evaluable"}
        />
      </ReportSection>

      {/* 06 MMM準備度 */}
      <ReportSection no="06" title="MMM（初診数モデリング）準備度">
        <MMMReadinessPanel readiness={report.mmmReadiness} />
      </ReportSection>

      {/* 07 前提と限界: 画面・印刷で共通の集約注意書き */}
      <ReportSection no="07" title="前提と限界">
        <ul className="break-inside-avoid space-y-1.5 text-[13px] leading-relaxed text-ink-muted">
          <li>・{BRAND.free} は、外部から観測できる情報に基づく準備度評価であり、効果測定ではありません。</li>
          <li>
            ・真の初診CPA・ROI・施策別の初診寄与は算出しません（実データに基づく分析は {BRAND.analytics} の領域です）。
          </li>
          <li>・医療広告に関する検出は、人が確認する際の優先度を示す初期スクリーニングであり、法的判断・適合性の保証ではありません。</li>
          <li>・未入力の情報や取得できなかった項目は「評価不能」として扱っており、品質の低さを意味しません。</li>
        </ul>
      </ReportSection>

      <div className="no-print">
        <NextStepsFunnel />
      </div>

      <div className="no-print">
        <PaidPlanCTA clinicName={report.input.clinicName} />
      </div>

      {/* 生データ（開発/デバッグ用途。本番UIでは非表示） */}
      {import.meta.env.DEV && (
        <details className="card p-6 no-print">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            開発用: 解析の生データを表示
          </summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(report.rawDiagnostics, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
