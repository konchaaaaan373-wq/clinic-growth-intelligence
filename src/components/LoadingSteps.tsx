export default function LoadingSteps() {
  return (
    <div className="card mx-auto max-w-xl p-8" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
        />
        <h2 className="text-lg font-bold text-ink">診断を実行しています…</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        入力いただいたURLをもとに、外部から取得できる情報（HP構造・予約導線・SEO・SNS接続・
        医療広告上の要確認表現・MMM準備度）を解析しています。
        サイトの規模により、しばらく時間がかかる場合があります。
      </p>
    </div>
  );
}
