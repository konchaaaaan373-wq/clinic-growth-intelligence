// =========================================================
// POST /.netlify/functions/analyze
//
// 入力 AuditInput を受け取り、外部から観測できる情報をもとに
// AuditReport を生成して返す。
//
// 設計方針:
//  - どの外部連携（HP取得 / PageSpeed / YouTube）が失敗しても診断全体は落とさない
//  - APIキーが無い場合は該当連携を "skipped" とする
//  - 純粋なスコア計算は src/lib/scoring.ts に集約
// =========================================================

import { randomUUID } from "node:crypto";
import type { AuditInput, AuditReport, AnalyzeResponse } from "../../src/lib/types";
import type { DiagnosticsBundle } from "../../src/lib/scoring";
import {
  calculateOverallScore,
  gradeFromScore,
  generateOneLineDiagnosis,
  generateExecutiveSummary,
  generateQuickWins,
  generateGrowthOpportunities,
  generateFindings,
  generateChannelComments,
} from "../../src/lib/scoring";
import { parseWebsite } from "./lib/parseWebsite";
import { runPageSpeed } from "./lib/pagespeed";
import { inspectYouTube } from "./lib/youtube";
import { buildScores } from "./lib/scoreWebsite";
import { buildMMMReadinessPanel } from "./lib/mmmReadiness";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ ok: false, error: "POST メソッドのみ対応しています。" }, 405);
  }

  // 1) 入力パース
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: "リクエスト本文を解析できませんでした。" }, 400);
  }

  const validation = validateInput(raw);
  if (!validation.ok) {
    return json({ ok: false, error: validation.error }, 400);
  }
  const input = validation.input;

  const notices: string[] = [
    "本診断は外部から観測できる情報に基づく初期評価です。実際の初診CPA・初診寄与を断定するものではありません。",
    "医療広告リスクの検出は初期スクリーニングであり、法的判断ではありません。",
  ];

  try {
    // 2) HP 解析（失敗しても継続）
    const website = await parseWebsite(input.websiteUrl);
    if (website.diagnostics.status === "failed") {
      notices.push(
        "サイト取得に失敗しましたが、入力情報をもとに可能な範囲で診断しました。",
      );
    }

    // 3) 任意連携（PageSpeed / YouTube）を並列実行
    const [pagespeed, youtube] = await Promise.all([
      runPageSpeed(input.websiteUrl, process.env.PAGESPEED_API_KEY).catch(() => ({
        status: "failed" as const,
        note: "PageSpeed 連携で予期せぬエラーが発生しました。診断は継続します。",
      })),
      inspectYouTube(input.youtubeUrl, process.env.YOUTUBE_API_KEY).catch(() => ({
        status: "failed" as const,
        note: "YouTube 連携で予期せぬエラーが発生しました。URL入力は確認済みです。",
      })),
    ]);

    // 4) スコア計算
    const bundle: DiagnosticsBundle = {
      input,
      website: website.diagnostics,
      pagespeed,
      youtube,
      websiteText: website.combinedText,
    };

    const scores = buildScores(bundle, website.riskFindings);
    const overallScore = calculateOverallScore(scores);
    const grade = gradeFromScore(overallScore);

    const report: AuditReport = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      input,
      summary: {
        overallScore,
        grade,
        oneLineDiagnosis: generateOneLineDiagnosis(overallScore, scores),
        executiveSummary: generateExecutiveSummary(overallScore, scores, bundle),
      },
      scores,
      findings: generateFindings(scores, bundle),
      quickWins: generateQuickWins(scores, bundle),
      growthOpportunities: generateGrowthOpportunities(scores, bundle),
      channelComments: generateChannelComments(bundle, scores),
      medicalAdRiskFindings: website.riskFindings,
      mmmReadiness: buildMMMReadinessPanel(bundle, scores.mmmReadiness),
      rawDiagnostics: {
        website: website.diagnostics,
        pagespeed,
        youtube,
      },
      notices,
    };

    return json({ ok: true, report }, 200);
  } catch (e) {
    // 想定外のエラーでも 500 の生スタックは返さない
    console.error("analyze error:", e);
    return json(
      {
        ok: false,
        error:
          "診断処理中に問題が発生しました。時間をおいて再度お試しください。",
      },
      500,
    );
  }
}

// ---------------------------------------------------------
// 入力バリデーション（サーバー側）
// ---------------------------------------------------------

type ValidationResult =
  | { ok: true; input: AuditInput }
  | { ok: false; error: string };

function validateInput(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "入力形式が正しくありません。" };
  }
  const r = raw as Record<string, unknown>;

  const clinicName = asString(r.clinicName);
  const websiteUrl = asString(r.websiteUrl);
  const specialty = asString(r.specialty);
  const location = asString(r.location);

  if (!clinicName) return { ok: false, error: "医療機関名は必須です。" };
  if (!websiteUrl) return { ok: false, error: "HP URL は必須です。" };
  if (!isHttpUrl(websiteUrl)) {
    return { ok: false, error: "HP URL は http/https の有効なURLで入力してください。" };
  }
  if (r.consent !== true) {
    return { ok: false, error: "解析への同意が必要です。" };
  }

  const input: AuditInput = {
    clinicName: sanitize(clinicName, 120),
    websiteUrl: websiteUrl.trim(),
    specialty: sanitize(specialty, 60),
    location: sanitize(location, 80),
    email: optionalString(r.email, 160),
    googleMapsUrl: optionalUrl(r.googleMapsUrl),
    youtubeUrl: optionalUrl(r.youtubeUrl),
    instagramUrl: optionalUrl(r.instagramUrl),
    tiktokUrl: optionalUrl(r.tiktokUrl),
    lineUrl: optionalUrl(r.lineUrl),
    bookingUrl: optionalUrl(r.bookingUrl),
    activeChannels: asStringArray(r.activeChannels),
    monthlyNewPatientsRange: optionalString(r.monthlyNewPatientsRange, 20),
    interestedInMMM: r.interestedInMMM === true,
    consent: true,
    source: r.source === "quick-url" || r.source === "detailed-form" ? r.source : undefined,
  };

  return { ok: true, input };
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function optionalString(v: unknown, max: number): string | undefined {
  const s = asString(v);
  return s ? sanitize(s, max) : undefined;
}
function optionalUrl(v: unknown): string | undefined {
  const s = asString(v);
  if (!s) return undefined;
  return isHttpUrl(s) ? s : undefined; // 不正なURLは黙って除外
}
function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v
    .filter((x): x is string => typeof x === "string")
    .map((x) => sanitize(x, 40))
    .filter(Boolean)
    .slice(0, 20);
  return arr.length ? arr : undefined;
}
function sanitize(s: string, max: number): string {
  // 制御文字を除去し、最大長で切る（XSS はフロント側で React がエスケープ）
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, max);
}
function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function json(body: AnalyzeResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
