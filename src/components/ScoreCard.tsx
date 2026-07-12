import { gradeColorClasses } from "../lib/utils";

type Props = {
  /** null = 取得失敗などで評価不能 */
  overallScore: number | null;
  /** null = 評価不能 */
  grade: "A" | "B" | "C" | "D" | null;
  oneLineDiagnosis: string;
  clinicName: string;
  /** URLのみ診断などで、スコアが暫定評価であることを明示する */
  provisional?: boolean;
  /** 入力情報の充足度（低=URLのみ等）。省略時は非表示 */
  inputCompleteness?: "低" | "中" | "高";
};

const GRADE_MEANING: Record<"A" | "B" | "C" | "D", string> = {
  A: "外部から見える集患導線が整っている（80点以上）",
  B: "基本はできているが改善余地あり（60〜79点）",
  C: "導線が分断されており整備が必要（40〜59点）",
  D: "集患導線・情報設計が不足（39点以下）",
};

const GRADE_SCALE: { g: "A" | "B" | "C" | "D"; range: string }[] = [
  { g: "A", range: "80-100" },
  { g: "B", range: "60-79" },
  { g: "C", range: "40-59" },
  { g: "D", range: "0-39" },
];

export default function ScoreCard({
  overallScore,
  grade,
  oneLineDiagnosis,
  clinicName,
  provisional,
  inputCompleteness,
}: Props) {
  const circumference = 2 * Math.PI * 52;
  const notEvaluable = overallScore === null || grade === null;
  const dash = ((overallScore ?? 0) / 100) * circumference;

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" strokeWidth="12" />
            {!notEvaluable && (
              <circle
                cx="70"
                cy="70"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 70 70)"
                className="text-brand-600"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {notEvaluable ? (
              <span className="text-lg font-bold text-ink-soft">評価不能</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-ink">{overallScore}</span>
                <span className="text-xs text-ink-soft">/ 100</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="text-sm font-medium text-ink-muted">{clinicName}</span>
            {notEvaluable ? (
              <span className="badge border-slate-300 bg-slate-100 text-ink-soft">評価不能</span>
            ) : (
              <span className={`badge ${gradeColorClasses(grade!)}`}>ランク {grade}</span>
            )}
            {!notEvaluable && provisional && (
              <span className="badge border-amber-200 bg-amber-50 text-amber-800">
                URLのみ診断（暫定）
              </span>
            )}
          </div>
          {notEvaluable ? (
            <h2 className="mt-2 text-xl font-bold text-ink">サイト取得に失敗（評価不能）</h2>
          ) : (
            <>
              <h2 className="mt-2 text-2xl font-bold text-ink">
                {provisional ? "外部集患力スコア（暫定）" : "総合スコア"} {overallScore} 点
              </h2>
              <p className="mt-1 text-[15px] text-ink">
                ランク {grade}：{GRADE_MEANING[grade!]}
              </p>
              {inputCompleteness && (
                <p className="mt-1 text-xs text-ink-soft">
                  入力情報充足度:{" "}
                  <span className="font-semibold text-ink-muted">{inputCompleteness}</span>
                  {provisional && "（診療科・所在地・SNSなどを追加すると評価精度が上がります）"}
                </p>
              )}
            </>
          )}
          <p className="mt-2 text-[15px] leading-7 text-ink-muted">{oneLineDiagnosis}</p>
        </div>
      </div>

      {/* A/B/C/D の意味（凡例）。評価不能時は非表示 */}
      {!notEvaluable && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADE_SCALE.map((s) => (
              <div
                key={s.g}
                className={`rounded border px-3 py-2 text-center text-xs ${
                  s.g === grade ? gradeColorClasses(s.g) : "border-slate-200 bg-white text-ink-soft"
                }`}
              >
                <div className={`text-sm ${s.g === grade ? "font-bold" : "font-medium"}`}>{s.g}</div>
                <div className="mt-0.5 tabular-nums">{s.range} 点</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
