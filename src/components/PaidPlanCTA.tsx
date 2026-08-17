import { BRAND, buildConsultMailto } from "../lib/utils";
import BalloonMark from "./BalloonMark";

type Props = {
  clinicName?: string;
};

export default function PaidPlanCTA({ clinicName }: Props) {
  const mailto = buildConsultMailto(clinicName);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-white p-6 shadow-card sm:p-8">
      {/* 右上でふわふわ浮く風船（装飾） */}
      <BalloonMark
        size={44}
        color="#7fc0d4"
        className="absolute right-6 top-5 hidden animate-float sm:block"
      />
      <div className="text-xs font-semibold tracking-wide text-brand-700">次のステップ</div>
      <h3 className="mt-1 text-lg font-bold text-ink sm:text-xl">
        実際の初診数で施策効果を見たい場合
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
        {BRAND.free} では、外部から見える集患導線とMMM準備度を評価しています。
        {BRAND.analytics} で日別初診数・広告費・投稿データを連携すると、{BRAND.mmm} により
        HP記事、広告、SNS、ポスティングが初診数にどれだけ寄与したかを推定できます。
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={mailto} className="btn-primary">
          {BRAND.analytics}の相談をする
        </a>
        <a
          href="/about-mmm"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          実データ分析の詳細を見る →
        </a>
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        ※ {BRAND.analytics} は将来提供予定の構想です。{BRAND.free} では真の初診CPAや初診寄与は算出しません。
      </p>
    </div>
  );
}
