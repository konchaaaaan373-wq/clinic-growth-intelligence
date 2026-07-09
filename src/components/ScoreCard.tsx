import { gradeColorClasses } from "../lib/utils";

type Props = {
  overallScore: number;
  grade: "A" | "B" | "C" | "D";
  oneLineDiagnosis: string;
  clinicName: string;
};

const GRADE_MEANING: Record<Props["grade"], string> = {
  A: "外部から見える集患導線が整っている（80点以上）",
  B: "基本はできているが改善余地あり（60〜79点）",
  C: "導線が分断されており整備が必要（40〜59点）",
  D: "集患導線・情報設計が不足（39点以下）",
};

const GRADE_SCALE: { g: Props["grade"]; range: string }[] = [
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
}: Props) {
  const circumference = 2 * Math.PI * 52;
  const dash = (overallScore / 100) * circumference;

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" strokeWidth="12" />
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
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-ink">{overallScore}</span>
            <span className="text-xs text-ink-soft">/ 100</span>
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <span className="text-sm font-medium text-ink-muted">{clinicName}</span>
            <span className={`badge ${gradeColorClasses(grade)}`}>ランク {grade}</span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-ink">総合スコア {overallScore} 点</h2>
          <p className="mt-1 text-sm font-medium text-ink">
            ランク {grade}：{GRADE_MEANING[grade]}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{oneLineDiagnosis}</p>
        </div>
      </div>

      {/* A/B/C/D の意味（凡例） */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADE_SCALE.map((s) => (
            <div
              key={s.g}
              className={`rounded-lg border px-3 py-2 text-center text-xs ${
                s.g === grade ? gradeColorClasses(s.g) : "border-slate-200 bg-white text-ink-soft"
              }`}
            >
              <div className="text-sm font-bold">{s.g}</div>
              <div className="mt-0.5 tabular-nums">{s.range} 点</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
