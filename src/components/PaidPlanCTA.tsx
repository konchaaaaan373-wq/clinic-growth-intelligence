import { CONTACT_EMAIL, BRAND } from "../lib/utils";

type Props = {
  clinicName?: string;
};

export default function PaidPlanCTA({ clinicName }: Props) {
  const subject = encodeURIComponent(
    `${BRAND.analytics} の相談希望${clinicName ? `（${clinicName}）` : ""}`,
  );
  const body = encodeURIComponent(
    `${BRAND.free} を実施しました。${BRAND.analytics}（${BRAND.mmm}）で、実際の初診数に効いた施策の推定について相談を希望します。\n\n` +
      "・医療機関名:\n・ご担当者名:\n・現在の主な施策:\n・月間初診数の目安:\n",
  );
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <div className="overflow-hidden rounded-xl border border-brand-200 bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:p-8">
      <h3 className="text-lg font-bold sm:text-xl">実際の初診数で施策効果を見たい場合</h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100">
        {BRAND.free} では、外部から見える集患導線とMMM準備度を評価しています。
        {BRAND.analytics} で日別初診数・広告費・投稿データを連携すると、{BRAND.mmm} により
        HP記事、広告、SNS、ポスティングが初診数にどれだけ寄与したかを推定できます。
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={mailto} className="btn-primary bg-white text-brand-800 hover:bg-brand-50">
          {BRAND.analytics}の相談をする
        </a>
        <a
          href="/about-mmm"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-100 underline-offset-2 hover:text-white hover:underline"
        >
          実際の初診数で施策効果を見る →
        </a>
      </div>
      <p className="mt-4 text-xs text-brand-200">
        ※ {BRAND.analytics} は将来提供予定の構想です。{BRAND.free} では真の初診CPAや初診寄与は算出しません。
      </p>
    </div>
  );
}
