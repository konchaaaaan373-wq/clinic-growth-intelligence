// =========================================================
// PageSpeed Insights 連携（任意）
//
// PAGESPEED_API_KEY がある場合のみ実行。
// 失敗・レート制限・対象サイト失敗でも診断全体は落とさない。
// =========================================================

import type { PageSpeedDiagnostics } from "../../../src/lib/types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TIMEOUT_MS = 20000;

export async function runPageSpeed(
  targetUrl: string,
  apiKey: string | undefined,
): Promise<PageSpeedDiagnostics> {
  if (!apiKey) {
    return {
      status: "skipped",
      note: "PAGESPEED_API_KEY が未設定のため未取得です。",
    };
  }

  try {
    const params = new URLSearchParams({
      url: targetUrl,
      key: apiKey,
      strategy: "mobile",
    });
    for (const c of ["performance", "accessibility", "best-practices", "seo"]) {
      params.append("category", c);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        status: "failed",
        strategy: "mobile",
        note: `PageSpeed API がエラーを返しました（HTTP ${res.status}）。診断は継続します。`,
      };
    }

    const data = (await res.json()) as PsiResponse;
    const cats = data.lighthouseResult?.categories ?? {};
    const toPct = (v: number | undefined | null) =>
      typeof v === "number" ? Math.round(v * 100) : null;

    return {
      status: "success",
      strategy: "mobile",
      categories: {
        performance: toPct(cats.performance?.score),
        accessibility: toPct(cats.accessibility?.score),
        bestPractices: toPct(cats["best-practices"]?.score),
        seo: toPct(cats.seo?.score),
      },
    };
  } catch (e) {
    const msg =
      (e as Error)?.name === "AbortError"
        ? "PageSpeed API がタイムアウトしました。"
        : "PageSpeed API の呼び出しに失敗しました。";
    return { status: "failed", strategy: "mobile", note: `${msg} 診断は継続します。` };
  }
}

type PsiResponse = {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null }>;
  };
};
