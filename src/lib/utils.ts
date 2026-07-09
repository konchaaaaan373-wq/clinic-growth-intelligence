// =========================================================
// フロントエンド用ユーティリティ
// =========================================================

import type { AuditReport } from "./types";

export const APP_NAME =
  (import.meta.env.VITE_APP_NAME as string | undefined) ?? "Clinic Growth Intelligence";

export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? "example@example.com";

const STORAGE_KEY = "cgi:last-report";

/** URL 形式の簡易バリデーション（http/https のみ許可） */
export function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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
