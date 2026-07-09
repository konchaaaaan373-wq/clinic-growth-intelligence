import { gradeColorClasses } from "../lib/utils";

type Props = {
  overallScore: number;
  grade: "A" | "B" | "C" | "D";
  oneLineDiagnosis: string;
  clinicName: string;
};

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
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{oneLineDiagnosis}</p>
        </div>
      </div>
    </div>
  );
}
