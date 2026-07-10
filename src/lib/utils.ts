// =========================================================
// フロントエンド用ユーティリティ
// =========================================================

import type { AuditInput, AuditReport } from "./types";

// =========================================================
// ブランド体系（外向きプロダクト名）
//   Neco Clinic Report        … プロダクト全体
//   Clinic Report Free        … URLベースの無料診断
//   Clinic Report Analytics   … 実データ連携による有料分析
//   Clinic Report MMM         … 初診数への施策寄与推定機能
// （GitHub リポジトリ名 clinic-growth-intelligence は内部名として維持）
// =========================================================
export const BRAND = {
  product: "Neco Clinic Report",
  free: "Clinic Report Free",
  analytics: "Clinic Report Analytics",
  mmm: "Clinic Report MMM",
} as const;

export const APP_NAME =
  (import.meta.env.VITE_APP_NAME as string | undefined) ?? BRAND.product;

export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? "example@example.com";

const STORAGE_KEY = "cgi:last-report";

/**
 * 入力URLの正規化（クイック診断用）。
 * - 前後スペースを trim
 * - http:// / https:// が無ければ https:// を自動補完
 * - 既に http:// / https:// がある場合は変更しない（大文字小文字問わず）
 *   例: "example-clinic.jp" → "https://example-clinic.jp"
 *       "www.example-clinic.jp" → "https://www.example-clinic.jp"
 *       "http://example.com" → "http://example.com"（変更なし）
 */
export function normalizeUrlInput(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** URL 形式の簡易バリデーション（http/https のみ許可） */
export function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  // 生の空白を含むURLは誤入力とみなす（ブラウザは %20 に補正して通してしまうため明示的に弾く）
  if (/\s/.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * URL の hostname から医療機関名を推定する（クイック診断でclinicNameが無い場合の補完）。
 *   https://www.example-clinic.jp → example-clinic.jp
 *   https://sample-ortho.com/path → sample-ortho.com
 * 解釈できない場合は元の入力（trim）を返す。
 */
export function inferClinicNameFromUrl(websiteUrl: string): string {
  try {
    const host = new URL(websiteUrl.trim()).hostname.toLowerCase();
    return host.replace(/^www\./, "") || websiteUrl.trim();
  } catch {
    return websiteUrl.trim();
  }
}

/**
 * 入力情報の充足度。URLのみ診断（暫定評価）の根拠として、総合スコアと併記する。
 * 診療科・所在地・GoogleマップURL・SNS・予約・注力施策・初診数レンジの入力数で判定。
 */
export function assessInputCompleteness(input: AuditInput): "低" | "中" | "高" {
  let n = 0;
  if (input.specialty && input.specialty !== "未指定") n += 1;
  if (input.location && input.location !== "未指定") n += 1;
  if (input.googleMapsUrl) n += 1;
  if (input.youtubeUrl || input.instagramUrl || input.tiktokUrl || input.lineUrl) n += 1;
  if (input.bookingUrl) n += 1;
  if (input.activeChannels?.length) n += 1;
  if (input.monthlyNewPatientsRange && input.monthlyNewPatientsRange !== "不明") n += 1;
  if (n >= 5) return "高";
  if (n >= 2) return "中";
  return "低";
}

/**
 * レポートヘッダー等で使う診療科・所在地の表示ラベル。
 * 「未指定・未指定」という雑な見え方を避け、「HP URLのみ診断」等に置き換える。
 */
export function clinicMetaLabel(input: AuditInput): string {
  const specialty = input.specialty && input.specialty !== "未指定" ? input.specialty : "";
  const location = input.location && input.location !== "未指定" ? input.location : "";
  if (!specialty && !location) return "HP URLのみ診断";
  if (specialty && location) return `${specialty}・${location}`;
  return specialty ? `${specialty}・所在地未指定` : `診療科未指定・${location}`;
}

/** 入力文字列の軽量サニタイズ（前後空白除去・制御文字除去） */
export function sanitizeText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

/** レポートを localStorage に保存 */
export function saveReport(report: AuditReport): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  } catch {
    // localStorage が使えない環境では黙って無視
  }
}

/** localStorage からレポートを取得 */
export function loadReport(): AuditReport | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuditReport;
  } catch {
    return null;
  }
}

/** レポートを JSON ファイルとしてダウンロード */
export function downloadReportJson(report: AuditReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (report.input.clinicName || "clinic").replace(
    /[^\w\-一-龠ぁ-んァ-ヴ]/g,
    "_",
  );
  a.href = url;
  a.download = `cgi-report-${safeName}-${report.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** グレードに対応する配色クラス */
export function gradeColorClasses(grade: "A" | "B" | "C" | "D"): string {
  switch (grade) {
    case "A":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "B":
      return "bg-brand-50 text-brand-700 border-brand-200";
    case "C":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "D":
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

/** 0-100 スコアの帯色 */
export function scoreBarColor(ratio: number): string {
  if (ratio >= 0.75) return "bg-emerald-500";
  if (ratio >= 0.5) return "bg-brand-500";
  if (ratio >= 0.3) return "bg-amber-500";
  return "bg-rose-500";
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
