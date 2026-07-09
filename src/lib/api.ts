// =========================================================
// フロントエンド ↔ Netlify Functions の API クライアント
// =========================================================

import type { AnalyzeResponse, AuditInput, AuditReport } from "./types";

const ANALYZE_ENDPOINT = "/.netlify/functions/analyze";

/**
 * 診断を実行する。
 * ネットワーク・サーバーエラー時も throw せず、AnalyzeResponse を返す。
 */
export async function requestAudit(input: AuditInput): Promise<AnalyzeResponse> {
  try {
    const res = await fetch(ANALYZE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      // Function が 4xx/5xx を返しても、可能なら本文の error を拾う
      const data = (await safeJson(res)) as Partial<AnalyzeResponse> | null;
      if (data && data.ok === false && typeof data.error === "string") {
        return { ok: false, error: data.error };
      }
      return {
        ok: false,
        error:
          "診断サーバーへの接続で問題が発生しました。時間をおいて再度お試しください。",
      };
    }

    const data = (await res.json()) as AnalyzeResponse;
    return data;
  } catch {
    return {
      ok: false,
      error:
        "診断サーバーに接続できませんでした。ネットワーク環境をご確認のうえ再度お試しください。",
    };
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** ヘルスチェック（任意利用） */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch("/.netlify/functions/health");
    return res.ok;
  } catch {
    return false;
  }
}

export type { AuditReport };
