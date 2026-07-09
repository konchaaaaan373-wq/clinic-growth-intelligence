import { useState } from "react";
import { isValidHttpUrl, normalizeUrlInput } from "../lib/utils";

type QuickUrlAuditFormProps = {
  onSubmit: (websiteUrl: string) => void;
  submitting?: boolean;
  variant?: "hero" | "compact";
  /** 親（サーバー側など）から渡すエラー */
  externalError?: string | null;
};

const URL_ERROR =
  "https://example-clinic.jp の形式で入力してください。https:// は自動補完できます。";

export default function QuickUrlAuditForm({
  onSubmit,
  submitting,
  variant = "hero",
  externalError,
}: QuickUrlAuditFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 前後スペースを除去し、http(s):// が無ければ https:// を自動補完
    const normalized = normalizeUrlInput(url);
    if (!isValidHttpUrl(normalized)) {
      setError(URL_ERROR);
      return;
    }
    setError(null);
    // 補完後の値を入力欄にも反映してから送信
    if (normalized !== url) setUrl(normalized);
    onSubmit(normalized);
  }

  const shownError = error ?? externalError ?? null;
  const isHero = variant === "hero";

  return (
    <form onSubmit={handleSubmit} noValidate className={isHero ? "w-full" : "w-full"}>
      {isHero && (
        <label htmlFor={`quick-url-${variant}`} className="mb-1.5 block text-sm font-semibold text-ink">
          HP URLを入力
        </label>
      )}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id={`quick-url-${variant}`}
          type="url"
          inputMode="url"
          className={`input flex-1 ${isHero ? "sm:text-base sm:py-3" : ""} ${
            shownError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200" : ""
          }`}
          placeholder="https://example-clinic.jp"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (shownError) setError(null);
          }}
          aria-invalid={!!shownError}
          aria-describedby={shownError ? `quick-url-err-${variant}` : undefined}
          disabled={submitting}
        />
        <button
          type="submit"
          className={`btn-primary whitespace-nowrap ${isHero ? "sm:px-6 sm:py-3 sm:text-base" : ""}`}
          disabled={submitting}
        >
          {submitting ? "作成中…" : "無料レポートを作成"}
        </button>
      </div>

      {shownError ? (
        <p id={`quick-url-err-${variant}`} className="mt-2 text-xs text-rose-600">
          {shownError}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-soft">
          患者情報は不要です。外部から見える範囲で診断します。
        </p>
      )}

      {isHero && (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
          送信により、入力URLを外部から取得可能な範囲で自動解析することに同意したものとします。
          患者個人情報は入力しないでください。本診断は医療広告上の法的適合性を保証するものではありません。
        </p>
      )}
    </form>
  );
}
