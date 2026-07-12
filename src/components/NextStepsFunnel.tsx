import { BRAND } from "../lib/utils";

const STEPS = [
  {
    stage: "STEP 1",
    title: BRAND.free,
    state: "現在地",
    body: "外部URLから見える集患導線・SEO・SNS接続・MEO準備度・医療広告上の要確認表現を診断します。",
    tone: "current" as const,
  },
  {
    stage: "STEP 2",
    title: "MMM準備",
    state: "次の一手",
    body: "日別初診数、広告費、コラム公開日、SNS投稿、休診日を整理し、効果測定の土台を作ります。",
    tone: "next" as const,
  },
  {
    stage: "STEP 3",
    title: BRAND.analytics,
    state: "ゴール",
    body: `${BRAND.mmm} で、HP記事・広告・SNS・ポスティングが初診数にどれだけ寄与したかを推定します。`,
    tone: "goal" as const,
  },
];

const toneClasses: Record<string, string> = {
  current: "border-brand-300 bg-brand-50",
  next: "border-slate-200 bg-white",
  goal: "border-slate-200 bg-white",
};
const badgeClasses: Record<string, string> = {
  current: "border-brand-700 bg-brand-700 text-white",
  next: "border-slate-200 bg-slate-100 text-ink-muted",
  goal: "border-slate-200 bg-slate-100 text-ink-muted",
};

export default function NextStepsFunnel() {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-ink">施策効果を測るまでの3ステップ</h3>
      <p className="mt-1 text-sm text-ink-soft">
        無料診断は最初のステップです。実データを連携すると、施策別の初診寄与の推定まで進めます。
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`relative rounded-lg border p-4 ${toneClasses[s.tone]}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-soft">{s.stage}</span>
              <span className={`badge ${badgeClasses[s.tone]}`}>{s.state}</span>
            </div>
            <div className="mt-1.5 text-base font-bold text-ink">{s.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 sm:block"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
