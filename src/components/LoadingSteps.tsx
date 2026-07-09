import { useEffect, useState } from "react";

const STEPS = [
  "HP構造を確認しています",
  "予約導線を確認しています",
  "SEO/コンテンツ構造を確認しています",
  "SNSとの接続を確認しています",
  "医療広告上の注意表現を確認しています",
  "MMM準備度を評価しています",
];

type Props = {
  /** 解析が完了しても最低限このステップまでは見せる（UX演出） */
  done?: boolean;
};

export default function LoadingSteps({ done }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((prev) => {
        // 完了していなければ最後の1つ手前で待機、完了したら最後まで進める
        const cap = done ? STEPS.length : STEPS.length - 1;
        return Math.min(prev + 1, cap);
      });
    }, 650);
    return () => window.clearInterval(id);
  }, [done]);

  return (
    <div className="card mx-auto max-w-xl p-8">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-600" />
        </span>
        <h2 className="text-lg font-bold text-ink">診断を実行しています…</h2>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        入力いただいたURLをもとに、外部から取得できる情報を解析しています。
      </p>

      <ul className="mt-6 space-y-3">
        {STEPS.map((step, i) => {
          const state = i < active ? "done" : i === active ? "active" : "pending";
          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs ${
                  state === "done"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : state === "active"
                      ? "border-brand-500 text-brand-600"
                      : "border-slate-300 text-slate-300"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`text-sm ${
                  state === "pending" ? "text-slate-400" : "text-ink"
                } ${state === "active" ? "font-semibold" : ""}`}
              >
                {step}
                {state === "active" && <span className="ml-1 animate-pulse">…</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
