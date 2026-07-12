import { Link } from "react-router-dom";
import { BRAND } from "../lib/utils";
import QuickUrlAuditForm from "./QuickUrlAuditForm";

type Props = {
  onQuickAudit: (websiteUrl: string) => void;
  submitting?: boolean;
  error?: string | null;
};

export default function Hero({ onQuickAudit, submitting, error }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-brand-50/40">
      <div className="container-page py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <span className="badge border-brand-200 bg-brand-50 text-brand-700">
            医療機関向け・{BRAND.free}
          </span>
          <p className="mt-4 text-sm font-semibold tracking-wide text-brand-700">{BRAND.product}</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
            クリニックの外部集患力を、
            <br className="hidden sm:block" />
            URLから無料診断。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            HP・SNS・MEO・医療広告上の要確認表現を横断チェックし、
            初診数MMMにつなげるための改善点をレポート化します。
          </p>

          {/* ファーストビューの主役: URL入力フォーム */}
          <div className="mt-8 rounded-2xl border border-brand-200 bg-white p-4 shadow-card sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-brand-700">
              <span>HP URLから作成</span>
              <span className="text-slate-300">•</span>
              <span>患者情報は不要</span>
              <span className="text-slate-300">•</span>
              <span>外部から見える範囲で診断</span>
            </div>
            <QuickUrlAuditForm
              onSubmit={onQuickAudit}
              submitting={submitting}
              variant="hero"
              externalError={error}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link to="/audit" className="font-medium text-brand-700 underline-offset-2 hover:underline">
              詳しく入力して診断する →
            </Link>
            <Link to="/sample" className="font-medium text-brand-700 underline-offset-2 hover:underline">
              診断サンプルを見る →
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            まずは外部から見える範囲で診断します。診療科・所在地・SNS URLなど詳しい情報は後から追加できます。
            真の初診CPAや初診寄与を断定するものではありません。
          </p>
        </div>
      </div>
    </section>
  );
}
