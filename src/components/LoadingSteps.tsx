import { BalloonTrio } from "./BalloonMark";

export default function LoadingSteps() {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center" role="status" aria-live="polite">
      <div className="flex justify-center">
        <BalloonTrio size={36} />
      </div>
      <h2 className="mt-3 text-lg font-bold text-ink">レポートを作成しています…</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        入力いただいたURLをもとに、外部から取得できる情報（HP構造・予約導線・SEO・SNS接続・
        医療広告上の要確認表現・MMM準備度）を解析しています。
        サイトの規模により、しばらく時間がかかる場合があります。
      </p>
    </div>
  );
}
