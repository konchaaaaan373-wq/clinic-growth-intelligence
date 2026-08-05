// =========================================================
// スコアリングエンジン（ルールベース）
//
// すべて純粋関数です。副作用（fetch など）は含めません。
// ルールは明示的に分割してあり、後から重み・閾値を調整しやすい構造です。
//
// 設計原則:
//  1. 達成率方式 — 未入力・取得不能な項目は「減点」せず分母から除外する
//     （unknown ≠ weak）。総合スコアは評価できた項目の達成率の加重平均。
//  2. 重複計上の禁止 — 1つの観測事実（例: tel: リンクの有無）は
//     1カテゴリでのみ加点する。カテゴリ間の二重カウントをしない。
//  3. 根拠を超えた文言の禁止 — キーワード出現から「ページがある」と
//     断定しない。位置（ファーストビュー等）を解析していないのに位置に言及しない。
//  4. スコアは目安 — 点数と独立した質的評価（集患スタイル診断）を必ず添える。
//
// Netlify Function（analyze）とサンプル生成の双方から利用します。
// =========================================================

import type {
  AuditInput,
  ChannelComment,
  ClinicStyleType,
  Finding,
  MMMReadiness,
  QualitativeReview,
  Recommendation,
  RiskFinding,
  ScoreDetail,
  Scores,
  WebsiteDiagnostics,
  PageSpeedDiagnostics,
  YouTubeDiagnostics,
} from "./types";
import { analyzeSpecialtyCoverage } from "./specialtyProfiles";

/** 症状名リストを「A」「B」「C」形式で先頭 n 件だけ整形 */
function quoteList(items: string[], n = 3): string {
  return items
    .slice(0, n)
    .map((s) => `「${s}」`)
    .join("");
}

/** スコア計算に渡す診断素材。websiteText はサーバー内部のみで使用（レポートには保存しない）。 */
export type DiagnosticsBundle = {
  input: AuditInput;
  website?: WebsiteDiagnostics;
  pagespeed?: PageSpeedDiagnostics;
  youtube?: YouTubeDiagnostics;
  /** HP から抽出したテキスト（小文字化・上限付き）。キーワード判定に使用。 */
  websiteText?: string;
};

// ---------------------------------------------------------
// キーワード辞書（後から追加しやすいよう定数化）
// ---------------------------------------------------------

export const CTA_KEYWORDS = [
  "予約",
  "web予約",
  "オンライン予約",
  "ネット予約",
  "初診",
  "診療時間",
  "アクセス",
  "電話",
  "line",
  "問い合わせ",
  "お問い合わせ",
  "受診",
  "駐車場",
];

export const ACCESS_KEYWORDS = ["アクセス", "地図", "最寄", "駅", "住所", "所在地"];
export const HOURS_KEYWORDS = ["診療時間", "受付時間", "診療日", "休診"];
export const FIRST_VISIT_KEYWORDS = ["初診", "初めての方", "はじめての方", "初診の方"];
export const PARKING_KEYWORDS = ["駐車場", "パーキング", "駐車"];

export const SEO_MEDICAL_KEYWORDS = [
  "診療案内",
  "疾患",
  "症状",
  "治療",
  "リハビリ",
  "痛み",
  "しびれ",
  "生活習慣病",
  "糖尿病",
  "高血圧",
  "認知症",
  "整形外科",
  "内科",
  "小児科",
  "皮膚科",
  "眼科",
  "耳鼻科",
  "耳鼻咽喉科",
  "婦人科",
  "泌尿器科",
];

export const BLOG_KEYWORDS = ["コラム", "ブログ", "院長コラム", "お知らせ", "news", "column"];
export const SYMPTOM_LINK_KEYWORDS = [
  "症状",
  "疾患",
  "痛み",
  "しびれ",
  "治療",
  "外来",
  "について",
];

// ---------------------------------------------------------
// 小ヘルパー
// ---------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * URLのみ（または診療科・所在地が未指定の）暫定診断かどうか。
 * レポート表示・Quick Wins の順序・チャネル別コメントの文言で共通に使う。
 */
export function isUrlOnlyAudit(input: AuditInput): boolean {
  return (
    input.source === "quick-url" ||
    input.specialty === "未指定" ||
    input.location === "未指定"
  );
}

function textIncludesAny(text: string | undefined, keywords: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function countKeywordHits(text: string | undefined, keywords: string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase())).length;
}

// ---------------------------------------------------------
// 評価項目インフラ（達成率方式）
//
// 各カテゴリは CheckItem の配列で表現する。
//  - earned = points     … 確認できた（加点）
//  - earned = 0..points  … 部分的に確認できた
//  - earned = null       … 評価不能（未入力・取得不能）。分母からも除外する
// ---------------------------------------------------------

type CheckItem = {
  /** この項目の配点（評価できた場合の分母への寄与） */
  points: number;
  /** 獲得点。null = 評価不能（分母から除外） */
  earned: number | null;
  positives?: string[];
  negatives?: string[];
  /** 評価不能の理由（省略時は unknowns に載せない） */
  unknowns?: string[];
};

/** 確認できた（満点） */
function ok(points: number, message: string): CheckItem {
  return { points, earned: points, positives: [message] };
}
/** 確認できなかった（0点） */
function ng(points: number, message: string): CheckItem {
  return { points, earned: 0, negatives: [message] };
}
/** 評価不能（分母から除外・減点しない） */
function na(points: number, message?: string): CheckItem {
  return { points, earned: null, unknowns: message ? [message] : [] };
}
/** 真偽で ok / ng を切り替える */
function check(points: number, cond: boolean, okMsg: string, ngMsg: string): CheckItem {
  return cond ? ok(points, okMsg) : ng(points, ngMsg);
}

function buildDetail(
  label: string,
  maxScore: number,
  explanation: string,
  items: CheckItem[],
): ScoreDetail {
  let score = 0;
  let evaluable = 0;
  const positives: string[] = [];
  const negatives: string[] = [];
  const unknowns: string[] = [];
  for (const it of items) {
    if (it.earned === null) {
      if (it.unknowns) unknowns.push(...it.unknowns);
      continue;
    }
    evaluable += it.points;
    score += clamp(it.earned, 0, it.points);
    if (it.positives) positives.push(...it.positives);
    if (it.negatives) negatives.push(...it.negatives);
  }
  return {
    score: clamp(score, 0, maxScore),
    maxScore,
    evaluableMaxScore: clamp(evaluable, 0, maxScore),
    label,
    explanation,
    positives,
    negatives,
    unknowns,
    status: evaluable === 0 ? "not_evaluable" : "scored",
  };
}

/**
 * カテゴリの実効達成率（評価できた項目のみを分母にする）。
 * 評価不能カテゴリは null。
 */
export function effectiveRatio(s: ScoreDetail): number | null {
  if (s.status === "not_evaluable") return null;
  const denom = s.evaluableMaxScore ?? s.maxScore;
  if (denom <= 0) return null;
  return s.score / denom;
}

/**
 * 本文テキストがほとんど取得できなかったか（JS描画サイト等の可能性）。
 * この場合、キーワード判定に基づく項目は「弱い」と断定せず評価不能として扱う。
 */
export const TEXT_THIN_THRESHOLD = 300;
export function isTextThin(b: DiagnosticsBundle): boolean {
  const w = b.website;
  if (!w || w.status === "failed") return false;
  return (b.websiteText ?? "").replace(/\s+/g, "").length < TEXT_THIN_THRESHOLD;
}

export const TEXT_THIN_NOTE =
  "本文テキストがほとんど取得できなかったため未評価です（JavaScriptで描画されるサイトの可能性があります。サイト品質が低いという意味ではありません）";

// =========================================================
// 1. HP集患導線スコア（25点）
//   電話・予約・診療時間・初診案内・スマホ対応。
//   ※ アクセス・住所・地図はMEO準備度で評価する（重複計上しない）
// =========================================================
export function calculateWebsiteConversionScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const text = b.websiteText;
  const fetchFailed = !w || w.status === "failed";
  const textOk = !fetchFailed && !isTextThin(b);
  const textNa = fetchFailed ? FETCH_FAILED_NEGATIVE : TEXT_THIN_NOTE;

  const items: CheckItem[] = [
    // tel: リンク（DOM由来）
    fetchFailed
      ? na(5, FETCH_FAILED_NEGATIVE)
      : check(
          5,
          !!w.hasTelLink,
          "tel: リンク（タップ発信）が設置されています",
          "tel: リンクが検出できませんでした（スマホからの発信導線が弱い可能性）",
        ),
    // 予約導線（DOMまたは入力URL）
    w?.hasBookingLink || b.input.bookingUrl
      ? ok(6, "予約システム/予約ボタンへの導線が確認できます")
      : fetchFailed
        ? na(6, "HP未取得のため、予約導線は未評価です（予約システムURLを追加すると評価できます）")
        : ng(6, "Web予約への導線が確認できませんでした"),
    // 診療時間（テキスト由来）
    textOk
      ? check(
          4,
          textIncludesAny(text, HOURS_KEYWORDS),
          "診療時間の記載が確認できます",
          "診療時間が明確に読み取れませんでした",
        )
      : na(4, textNa),
    // 初診案内（テキスト由来）
    textOk
      ? check(
          4,
          textIncludesAny(text, FIRST_VISIT_KEYWORDS),
          "初診の方向けの案内が見られます",
          "初診案内ページ/初診の方向けの説明が見当たりません",
        )
      : na(4),
    // viewport（DOM由来）
    fetchFailed
      ? na(3)
      : check(
          3,
          !!w.hasViewport,
          "スマートフォン向け viewport 設定があります",
          "スマホ最適化（viewport）が確認できませんでした",
        ),
    // CTAの複数ページ展開（2ページ以上取得できた場合のみ評価）
    fetchFailed || (w?.pageCount ?? 0) < 2
      ? na(
          3,
          fetchFailed
            ? undefined
            : "取得できたページが1ページのため、複数ページでのCTA展開は未評価です",
        )
      : check(
          3,
          (w?.ctaKeywordPages ?? 0) >= 2,
          "複数ページに行動導線の文言が見られます",
          "CTA文言が複数ページに展開されていない可能性があります",
        ),
  ];

  return buildDetail(
    "HP集患導線",
    25,
    "初診の患者がHPから予約・来院へ進みやすいか（電話・予約・診療時間・初診案内・スマホ対応）を評価します。アクセス・地図まわりはMEO準備度側で評価します。",
    items,
  );
}

// =========================================================
// 2. SEO/医療コンテンツスコア（25点）
//   キーワードの「出現」を根拠にするため、文言は「記載が確認できる」に
//   とどめ、「ページがある」とは断定しない。
// =========================================================
export function calculateSeoContentScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const text = b.websiteText;
  const fetchFailed = !w || w.status === "failed";
  const textOk = !fetchFailed && !isTextThin(b);

  // 症状カバレッジ（診療科プロファイル or 汎用キーワード）
  const symptomItem = (): CheckItem => {
    if (!textOk) return na(5, fetchFailed ? undefined : TEXT_THIN_NOTE);
    const cov = analyzeSpecialtyCoverage(b.input.specialty, text);
    if (cov.profile) {
      const presentCount = cov.present.length;
      if (presentCount >= 4) {
        return {
          points: 5,
          earned: 5,
          positives: [
            `${cov.profile.label}で想定される症状・疾患の記載が複数確認できます（${quoteList(cov.present)}など。症状別ページとしての充実度は個別確認を推奨）`,
          ],
        };
      }
      if (presentCount >= 1) {
        return {
          points: 5,
          earned: 2,
          positives: [`症状・疾患に関する記載は一部確認できます（${quoteList(cov.present)}など）`],
          negatives: [
            `${cov.profile.label}では ${quoteList(cov.missing)} などに関する記載が見当たりません。症状別の解説ページとして整備すると、地域名×症状の検索からの初診流入を受け止めやすくなります`,
          ],
        };
      }
      return ng(
        5,
        `${cov.profile.label}で検索されやすい ${quoteList(cov.missing, 4)} などに関する記載が確認できませんでした。症状ごとの解説ページを用意すると、指名検索以外からの初診流入を増やしやすくなります`,
      );
    }
    const medicalHits = countKeywordHits(text, SEO_MEDICAL_KEYWORDS);
    if (medicalHits >= 3) return ok(5, "診療科・疾患・症状に関する記載が確認できます");
    if (medicalHits >= 1) {
      return {
        points: 5,
        earned: 2,
        positives: ["診療内容に関する記載は一部確認できます"],
        negatives: ["疾患別・症状別コンテンツの拡充余地があります"],
      };
    }
    return ng(5, "診療科・疾患・症状に関する記載が確認できませんでした");
  };

  // 内部リンク導線（症状語の出現 × 内部リンク数の近似。アンカーテキストまでは見ていない）
  const symptomLinkItem = (): CheckItem => {
    if (!textOk) return na(4);
    const cov = analyzeSpecialtyCoverage(b.input.specialty, text);
    const hasSymptomLinks =
      cov.profile && cov.present.length > 0
        ? cov.present.length >= 2 && (w?.internalLinkCount ?? 0) >= 5
        : textIncludesAny(text, SYMPTOM_LINK_KEYWORDS) && (w?.internalLinkCount ?? 0) >= 5;
    return check(
      4,
      hasSymptomLinks,
      "症状・疾患に触れた複数の記載と内部リンクが確認できます（予約までつながる導線設計かは個別確認を推奨）",
      "症状・疾患を起点とした内部リンク（例: 症状解説→医師紹介→予約）の導線が弱い可能性があります",
    );
  };

  const items: CheckItem[] = [
    fetchFailed
      ? na(3, FETCH_FAILED_NEGATIVE)
      : check(
          3,
          !!(w.title && w.title.trim().length >= 8),
          `title タグが設定されています（「${truncate(w.title ?? "", 40)}」）`,
          "title タグが未設定、または短すぎる可能性があります",
        ),
    fetchFailed
      ? na(3)
      : check(
          3,
          !!(w.metaDescription && w.metaDescription.trim().length >= 20),
          "meta description が設定されています",
          "meta description が未設定、または内容が薄い可能性があります",
        ),
    fetchFailed
      ? na(2)
      : check(
          2,
          (w.h1?.length ?? 0) >= 1,
          "h1 見出しが設定されています",
          "h1 見出しが確認できませんでした",
        ),
    symptomItem(),
    symptomLinkItem(),
    textOk
      ? check(
          3,
          textIncludesAny(text, BLOG_KEYWORDS),
          "ブログ/コラム/お知らせなどの継続的な情報発信が見られます",
          "ブログ・コラムなど継続的な情報発信が確認できませんでした",
        )
      : na(3),
    fetchFailed
      ? na(3)
      : check(
          3,
          !!w.hasJsonLd,
          "構造化データ（JSON-LD）らしき記述があります",
          "構造化データ（JSON-LD）が確認できませんでした",
        ),
    fetchFailed
      ? na(2)
      : check(
          2,
          !!w.hasSitemapHint,
          "sitemap.xml / robots.txt が推定できます",
          "sitemap.xml / robots.txt の存在が推定できませんでした",
        ),
  ];

  return buildDetail(
    "SEO/医療コンテンツ",
    25,
    "検索から見つけられ、疾患・症状で悩む患者に届くコンテンツ設計になっているか（title/description/見出し/症状・疾患の記載/内部リンク/構造化データ）を評価します。キーワードの出現に基づく近似評価であり、個別ページの品質までは判定しません。",
    items,
  );
}

// =========================================================
// 3. MEO準備度スコア（15点）
//   住所・アクセス/駐車場・地図リンク・GBP URL。
//   ※ 電話・診療時間はHP集患導線で評価する（重複計上しない）
// =========================================================
export function calculateMeoReadinessScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const text = b.websiteText;
  const fetchFailed = !w || w.status === "failed";
  const textOk = !fetchFailed && !isTextThin(b);

  const items: CheckItem[] = [
    // GBP URL（入力ベース。未入力は「無い」と断定できないため未評価）
    b.input.googleMapsUrl
      ? ok(4, "GoogleマップURL（Googleビジネスプロフィール）が入力されています")
      : na(
          4,
          "GoogleマップURLが未入力のため、GBPの有無・整備状況は未評価です（URLを追加すると評価できます）",
        ),
    // 住所記載（テキスト由来）
    textOk
      ? check(
          4,
          textIncludesAny(text, ["住所", "所在地", "〒", "丁目", "番地"]),
          "HP内に住所らしき記載があります",
          "HP内の住所表記が読み取りにくい可能性があります",
        )
      : na(4, fetchFailed ? FETCH_FAILED_NEGATIVE : TEXT_THIN_NOTE),
    // アクセス/駐車場（テキスト由来）
    textOk
      ? check(
          4,
          textIncludesAny(text, PARKING_KEYWORDS) || textIncludesAny(text, ACCESS_KEYWORDS),
          "アクセス/駐車場情報の記載があります",
          "アクセス・駐車場情報が読み取りにくい可能性があります",
        )
      : na(4),
    // 地図リンク（DOM由来）
    fetchFailed
      ? na(3)
      : check(
          3,
          !!w.hasGoogleMapsLink,
          "HP内からGoogleマップへのリンクが確認できます",
          "HP内からGoogleマップへのリンクが確認できませんでした",
        ),
  ];

  return buildDetail(
    "MEO準備度",
    15,
    "Googleビジネスプロフィール（MEO）を活かす土台がHP側に整っているか（住所・アクセス/駐車場・地図リンク・GBP URL）を評価します。電話・診療時間はHP集患導線側で評価します。口コミ数・評価点・検索表示回数などは外部URLだけでは断定していません。",
    items,
  );
}

// =========================================================
// 4. SNS集患接続スコア（15点）
//   存在確認は「入力URL または HP内リンク検出」を根拠にする。
//   どちらも無い場合は「未運用」と断定できないため未評価（減点しない）。
// =========================================================
export function calculateSnsConnectionScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const fetchFailed = !w || w.status === "failed";

  const ytKnown = !!b.input.youtubeUrl || !!w?.snsLinks.youtube;
  const igKnown = !!b.input.instagramUrl || !!w?.snsLinks.instagram;
  const ttKnown = !!b.input.tiktokUrl || !!w?.snsLinks.tiktok;
  const lineKnown = !!b.input.lineUrl || !!w?.hasLineLink;
  const anySnsKnown = ytKnown || igKnown || ttKnown || lineKnown;
  const anySnsEntered =
    !!b.input.youtubeUrl || !!b.input.instagramUrl || !!b.input.tiktokUrl || !!b.input.lineUrl;

  const presenceItem = (
    points: number,
    known: boolean,
    label: string,
  ): CheckItem =>
    known
      ? ok(points, `${label}の運用が確認できます（URL入力またはHP内リンク）`)
      : na(
          points,
          // HP未取得時は「HP内にリンクが無い」ことも確認できていないため言及しない
          fetchFailed
            ? `${label}は未入力のため運用有無は未評価です（運用中ならURL追加で評価できます）`
            : `${label}は未入力で、HP内からもリンクが見つからないため運用有無は未評価です（運用中ならURL追加で評価できます）`,
        );

  const hpLinksToSns =
    !!w &&
    (w.snsLinks.youtube ||
      w.snsLinks.instagram ||
      w.snsLinks.tiktok ||
      w.snsLinks.facebook ||
      w.snsLinks.x ||
      w.snsLinks.line);

  const items: CheckItem[] = [
    presenceItem(3, ytKnown, "YouTube"),
    presenceItem(2, igKnown, "Instagram"),
    presenceItem(2, ttKnown, "TikTok"),
    presenceItem(3, lineKnown, "LINE公式アカウント"),
    // HP↔SNS相互リンク（SNSの存在が分かっている場合のみ評価）
    fetchFailed
      ? na(3, anySnsEntered ? "HP未取得のため、HPとSNSの相互リンクは未評価です" : undefined)
      : !anySnsKnown
        ? na(3)
        : check(
            3,
            hpLinksToSns,
            "HP内からSNSへのリンクが確認できます",
            "入力されたSNSへのHP内リンクが確認できませんでした（相互接続の改善余地）",
          ),
    // YouTube投稿状況（API連携できて投稿数まで取得できた場合のみ評価）
    !ytKnown
      ? na(2)
      : b.youtube?.status === "success"
        ? b.youtube.videoCount == null
          ? na(2, "YouTube の投稿数はAPIから取得できませんでした（チャンネルの存在は確認済み）")
          : check(
              2,
              b.youtube.videoCount > 0,
              "YouTube API で動画投稿の存在が確認できました",
              "YouTube チャンネルは確認できましたが、動画投稿が確認できませんでした",
            )
        : na(2, "YouTube の投稿状況はAPI未連携のため未評価です（チャンネルの存在は確認済み）"),
  ];

  return buildDetail(
    "SNS集患接続",
    15,
    "YouTube/Instagram/TikTok/LINE などのSNSが存在し、HPと相互に接続されているかを評価します。Instagram/TikTok は非公式取得を行わず、URL入力とHP内リンクを根拠にします。未入力かつHPから検出できないSNSは「未運用」と断定せず未評価とします。",
    items,
  );
}

// =========================================================
// 5. 医療広告リスクスコア（10点・要確認表現が少ないほど高得点）
// =========================================================
export function calculateMedicalAdRiskScore(
  riskFindings: RiskFinding[],
  opts?: { textAvailable?: boolean },
): ScoreDetail {
  // 本文が取得できていない場合、「検出ゼロ = 問題なし」とは言えないため評価不能にする
  if (opts?.textAvailable === false) {
    return {
      score: 0,
      maxScore: 10,
      evaluableMaxScore: 0,
      label: "医療広告スクリーニング",
      explanation:
        "サイト本文がほとんど取得できなかったため、要確認表現の有無は評価できませんでした。",
      positives: [],
      negatives: [],
      unknowns: [TEXT_THIN_NOTE],
      status: "not_evaluable",
    };
  }

  const positives: string[] = [];
  const negatives: string[] = [];

  // severity で重み付け減点。low は減点しない（文脈確認のみ）、high を優先的に減点。
  const counts = { low: 0, medium: 0, high: 0 };
  const seen = new Set<string>();
  for (const f of riskFindings) {
    if (seen.has(f.expression)) continue; // 表現ごとに1回
    seen.add(f.expression);
    counts[f.severity] += 1;
  }
  const deduction = counts.high * 3 + counts.medium * 1; // low は 0
  const score = clamp(10 - deduction, 0, 10);

  const total = counts.high + counts.medium + counts.low;
  const hasDeduction = counts.high > 0 || counts.medium > 0;
  if (total === 0) {
    positives.push("初期スクリーニングでは、注意が必要な表現は検出されませんでした");
  } else if (!hasDeduction) {
    // low のみ: 受診促進・副作用説明などの文脈確認のみのため減点しない
    positives.push(
      `優先確認・要確認にあたる表現は検出されませんでした（文脈確認 ${counts.low} 件のみ・減点なし）`,
    );
    for (const f of riskFindings) {
      negatives.push(
        `【文脈確認】「${f.expression}」：受診促進・副作用説明などの文脈のため減点していません`,
      );
    }
  } else {
    const countParts: string[] = [];
    if (counts.high > 0) countParts.push(`優先確認 ${counts.high} 件`);
    if (counts.medium > 0) countParts.push(`要確認 ${counts.medium} 件`);
    if (counts.low > 0) countParts.push(`文脈確認 ${counts.low} 件（減点なし）`);
    negatives.push(`${countParts.join("・")}（法的判断ではありません）`);
    const label = (s: RiskFinding["severity"]) => (s === "high" ? "優先確認" : "要確認");
    for (const f of riskFindings) {
      negatives.push(
        f.severity === "low"
          ? `【文脈確認】「${f.expression}」：文脈確認として記録した項目です（減点なし）`
          : `【${label(f.severity)}】「${f.expression}」：文脈により確認が望ましい可能性があります`,
      );
    }
    if (counts.high === 0) {
      positives.push("保証・最上級を断定するような優先確認にあたる表現は検出されませんでした");
    }
  }

  return {
    score,
    maxScore: 10,
    evaluableMaxScore: 10,
    label: "医療広告スクリーニング",
    explanation:
      "医療広告ガイドライン上、文脈によっては確認が望ましい表現を機械的に初期スクリーニングし、文脈に応じて優先確認/要確認/文脈確認に分類します。分類は人が確認する際の優先順位であり、法的判断や適合性を判定するものではありません。最終確認は専門家・ガイドラインを前提としてください。",
    positives,
    negatives,
  };
}

// =========================================================
// 6. MMM準備度スコア（10点）
//   「MMMに必要なデータを把握・入力できているか」だけを評価する。
//   HP由来の事実（予約リンク・ブログ等）は他カテゴリで評価済みのため
//   ここでは加点しない（重複計上しない）。有料版への関心も加点しない。
// =========================================================
export function calculateMMMReadinessScore(b: DiagnosticsBundle): ScoreDetail {
  const quickUrl = b.input.source === "quick-url";

  const items: CheckItem[] = [
    // 目的変数（月間初診数）
    b.input.monthlyNewPatientsRange && b.input.monthlyNewPatientsRange !== "不明"
      ? ok(4, "月間初診数レンジが入力されています（目的変数の目安）")
      : b.input.monthlyNewPatientsRange === "不明"
        ? ng(
            4,
            "月間初診数が「不明」です。MMMの目的変数として最重要のため、日別初診数の記録開始が最初の一歩です",
          )
        : na(
            4,
            quickUrl
              ? "月間初診数はURLのみ診断では未評価です（詳細フォームで入力できます）"
              : "月間初診数レンジが未入力のため未評価です",
          ),
    // 説明変数（注力施策の把握）
    b.input.activeChannels && b.input.activeChannels.length > 0
      ? ok(3, "現在注力している施策が入力されています（説明変数の把握）")
      : na(
          3,
          quickUrl
            ? "注力施策はURLのみ診断では未評価です（詳細フォームで入力できます）"
            : "現在の注力施策が未入力のため未評価です",
        ),
    // 複数チャネル運用（寄与分解の意義）
    b.input.activeChannels === undefined || b.input.activeChannels.length === 0
      ? na(2)
      : check(
          2,
          b.input.activeChannels.length >= 2,
          "複数チャネルを運用しており、寄与分解の意義が大きい状態です",
          "運用チャネルが1つのため、寄与分解の対象はまだ限定的です（悪いことではありません）",
        ),
    // コンバージョン地点（予約システムURL。HPの予約リンクはHP集患導線で評価済み）
    b.input.bookingUrl
      ? ok(1, "予約システムURLがあり、コンバージョン地点が明確です")
      : na(1, "予約システムURLが未入力のため、予約計測のしやすさは未評価です"),
  ];

  return buildDetail(
    "MMM準備度",
    10,
    "初診数MMM（マーケティング・ミックス・モデリング）を始めるためのデータの土台（目的変数・説明変数・成果地点）がどれだけ把握できているかを評価します。URLのみ診断では大部分が未評価となり、総合スコアには影響しません。",
    items,
  );
}

// =========================================================
// 集計・グレード
// =========================================================
const SCORE_KEYS: (keyof Scores)[] = [
  "websiteConversion",
  "seoContent",
  "meoReadiness",
  "snsConnection",
  "medicalAdRisk",
  "mmmReadiness",
];

/**
 * 総合スコア = 評価できた項目の達成率の加重平均（重み = 各カテゴリの満点）。
 * 評価不能カテゴリは重みごと除外して再正規化する。
 * 未入力・取得不能が総合スコアを押し下げないための設計。
 * すべて評価不能の場合は null（総合スコアを出さない）。
 */
export function calculateOverallScore(scores: Scores): number | null {
  let weightSum = 0;
  let acc = 0;
  for (const key of SCORE_KEYS) {
    const s = scores[key];
    const ratio = effectiveRatio(s);
    if (ratio === null) continue;
    weightSum += s.maxScore;
    acc += ratio * s.maxScore;
  }
  if (weightSum <= 0) return null;
  return clamp(Math.round((acc / weightSum) * 100), 0, 100);
}

export function gradeFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

// =========================================================
// HP取得失敗（評価不能）用のレポート組み立て
//   - サイト内部評価（HP/SEO/MEO/医療広告リスク）は「評価不能」にする
//   - 総合スコア/ランクは出さない（null）
//   - Quick Win はサイト内部を見ていない前提の内容に差し替える
// =========================================================

const FETCH_FAILED_NEGATIVE =
  "対象サイトを取得できなかったため、この項目は評価できませんでした（サイト品質が低いという意味ではありません）。";

function notEvaluableDetail(label: string, maxScore: number, explanation: string): ScoreDetail {
  return {
    score: 0,
    maxScore,
    evaluableMaxScore: 0,
    label,
    explanation,
    positives: [],
    negatives: [],
    unknowns: [FETCH_FAILED_NEGATIVE],
    status: "not_evaluable",
  };
}

/** 取得失敗時のスコア群。HP由来項目は評価不能、入力由来のSNS/MMMのみ参考評価。 */
export function buildFetchFailedScores(bundle: DiagnosticsBundle): Scores {
  return {
    websiteConversion: notEvaluableDetail(
      "HP集患導線",
      25,
      "HPを取得できなかったため、予約・電話・診療時間・アクセスなどの導線は評価できません。",
    ),
    seoContent: notEvaluableDetail(
      "SEO/医療コンテンツ",
      25,
      "HPを取得できなかったため、title・見出し・症状別ページなどは評価できません。",
    ),
    meoReadiness: notEvaluableDetail(
      "MEO準備度",
      15,
      "HP本文を取得できなかったため、住所・電話・地図リンクなどは評価できません。",
    ),
    snsConnection: calculateSnsConnectionScore(bundle),
    medicalAdRisk: notEvaluableDetail(
      "医療広告スクリーニング",
      10,
      "サイト本文を取得できなかったため、要確認表現の有無は評価できません。",
    ),
    mmmReadiness: calculateMMMReadinessScore(bundle),
  };
}

export const FETCH_FAILED_ONE_LINE =
  "対象サイトの取得に失敗したため、HP導線・SEO・MEOの評価はできませんでした。URLをご確認のうえ再診断してください。";

export const FETCH_FAILED_SUMMARY =
  "対象サイトの取得に失敗したため、HP導線・SEO・MEOの詳細評価はできませんでした。URLの入力誤り、一時的な通信障害、外部アクセス制限（Botブロック等）の可能性があります。URLを確認して再診断するか、詳細フォームから情報を追加してください。なお、これは対象サイトの品質を評価した結果ではありません。";

/** 取得失敗時の Quick Win（サイト内部を見ていない前提の内容） */
export function generateFetchFailedQuickWins(): Recommendation[] {
  return [
    {
      id: "ff-recheck-url",
      title: "URLを確認して再診断する",
      detail: "入力したHP URLが正しいか確認し、もう一度診断してください。",
      whyImportant:
        "URLの綴り誤り・ドメイン変更・一時的な障害があると、サイトを取得できず評価できません。",
      whatToFix:
        "ブラウザで実際に開けるURL（https:// から始まる正しいアドレス）か確認し、再診断してください。",
      expectedEffect: "サイトを取得できれば、HP導線・SEO・MEOの評価が可能になります。",
      difficulty: "低",
      priority: "高",
      impact: "high",
      effort: "low",
    },
    {
      id: "ff-detailed-form",
      title: "詳細フォームから診療科・所在地・GoogleマップURLを追加する",
      detail: "URLのみに頼らず、入力情報から評価できる範囲を広げます。",
      whyImportant:
        "診療科・所在地・GoogleマップURL・SNSを入力すると、サイト取得に依存しないSNS接続・MEO準備度・MMM準備度の評価が具体化します。",
      whatToFix:
        "詳細フォーム（/audit）から、診療科・都道府県/市区町村・GoogleマップURL・各SNS URLを追加して再診断してください。",
      expectedEffect: "サイトが取得できない状況でも、入力情報に基づく評価の精度が高まります。",
      difficulty: "低",
      priority: "高",
      impact: "high",
      effort: "low",
    },
    {
      id: "ff-bot-block",
      title: "サイトがBot/外部アクセスをブロックしていないか確認する",
      detail: "WAFやアクセス制限で外部からの取得が拒否されている可能性があります。",
      whyImportant:
        "セキュリティ設定（WAF・国外IP遮断・User-Agent制限など）により、外部からのHTML取得がブロックされると評価できません。",
      whatToFix:
        "サーバー/CDN/WAFの設定で、一般的なクローラーからのアクセスが過度に制限されていないかを保守担当・制作会社に確認してください。",
      expectedEffect: "外部からの取得が可能になれば、次回以降の診断でHP評価ができるようになります。",
      difficulty: "中",
      priority: "中",
      impact: "medium",
      effort: "medium",
    },
  ];
}

/** 取得失敗時の findings（1件・取得失敗の明示） */
export function generateFetchFailedFindings(website?: WebsiteDiagnostics): Finding[] {
  return [
    {
      id: "f-fetch-failed",
      category: "general",
      severity: "high",
      title: "対象サイトを取得できませんでした（評価不能）",
      detail:
        (website?.errorMessage ? `取得時のメッセージ: ${website.errorMessage}。 ` : "") +
        "この結果はサイト品質の評価ではありません。URLの確認・再診断、または詳細フォームからの情報追加をご検討ください。",
    },
  ];
}

// =========================================================
// 文章生成
// =========================================================
/**
 * 良好=達成率>=0.8、改善余地=達成率<0.6。
 * 達成率は評価できた項目のみを分母にし、評価不能カテゴリは対象外
 * （未評価を「弱い」と呼ばない）。医療広告リスクは別枠のため除外。
 */
function categorize(scores: Scores): {
  good: ScoreDetail[];
  weak: ScoreDetail[];
  weakest: ScoreDetail | null;
} {
  const keys: (keyof Scores)[] = [
    "websiteConversion",
    "seoContent",
    "meoReadiness",
    "snsConnection",
    "mmmReadiness",
  ];
  const list = keys
    .map((k) => ({ s: scores[k], r: effectiveRatio(scores[k]) }))
    .filter((x): x is { s: ScoreDetail; r: number } => x.r !== null);
  const good = list.filter((x) => x.r >= 0.8).map((x) => x.s);
  const weak = list
    .filter((x) => x.r < 0.6)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.s);
  return { good, weak, weakest: weak[0] ?? null };
}

function joinLabels(items: ScoreDetail[]): string {
  return items.map((s) => `「${s.label}」`).join("");
}

export function generateOneLineDiagnosis(overall: number, scores: Scores): string {
  const { good, weakest } = categorize(scores);
  if (overall >= 80) {
    return "外部から見える集患導線は比較的整っています。次は実データ連携で初診寄与の測定へ進む段階です。";
  }
  const goodPart = good.length ? `${joinLabels(good)}は外部から見る限り良好です。` : "";
  const weakPart = weakest
    ? `一方で${joinLabels([weakest])}に改善余地があります。`
    : "基本的な情報発信はできています。";
  return goodPart + weakPart;
}

export function generateExecutiveSummary(
  overall: number,
  scores: Scores,
  b?: DiagnosticsBundle,
): string {
  const { good, weak, weakest } = categorize(scores);

  const parts: string[] = [];

  if (good.length) {
    parts.push(`${joinLabels(good)}は外部から見る限り良好です。`);
  }
  if (weak.length) {
    parts.push(`一方で、${joinLabels(weak)}には改善余地があります。`);
  } else if (!good.length) {
    parts.push("外部から見える各領域に、まだ整備の余地があります。");
  }

  // 最弱領域について、断定を避けた具体的な補足を1文添える
  if (weakest) {
    parts.push(weakestDetailSentence(weakest, b));
  }

  // MMM 準備への一手（未評価の場合もデータ整備の提案は有効）
  const mmmRatio = effectiveRatio(scores.mmmReadiness);
  if (mmmRatio === null || mmmRatio < 0.6) {
    parts.push("MMMに進むには、日別初診数と施策履歴の整備が次の一手です。");
  } else if (overall >= 80) {
    parts.push("次の段階では、日別初診数と施策データをつなぎ、実際の初診寄与を測定できる状態に近づいています。");
  }

  parts.push(
    "なお本診断は外部から観測できる情報に基づく準備度評価であり、実際の初診CPAや初診寄与を断定するものではありません。",
  );

  return parts.join(" ");
}

/** 最弱カテゴリに応じた、断定を避けた具体的な補足文 */
function weakestDetailSentence(weakest: ScoreDetail, b?: DiagnosticsBundle): string {
  const key = weakest.label;
  if (key === "SNS集患接続") {
    const noneEntered =
      b && !b.input.youtubeUrl && !b.input.instagramUrl && !b.input.tiktokUrl && !b.input.lineUrl;
    return noneEntered
      ? "特にSNS URLが未入力のため、HPや予約導線との相互接続は外部から評価できていません（未運用の可能性もあります）。"
      : "特にSNSからHP・予約へ戻す導線の整備余地があります。";
  }
  if (key === "MEO準備度") {
    return "特にGoogleビジネスプロフィールの整備とHPからの地図リンクに伸びしろがあります。";
  }
  if (key === "MMM準備度") {
    return "特に日別初診数など、施策効果を測るためのデータ整備がこれからの状態です。";
  }
  if (key === "HP集患導線") {
    return "特に予約・電話CTAの常設や初診案内の明確化に伸びしろがあります。";
  }
  if (key === "SEO/医療コンテンツ") {
    return "特に症状・疾患別ページの拡充に伸びしろがあります。";
  }
  return `特に「${weakest.label}」（${weakest.score}/${weakest.evaluableMaxScore ?? weakest.maxScore}）に伸びしろがあります。`;
}

// =========================================================
// クイックウィン（今すぐ直すべき）と findings
// =========================================================
export function generateQuickWins(scores: Scores, b: DiagnosticsBundle): Recommendation[] {
  const recs: Recommendation[] = [];
  const w = b.website;
  const cov = analyzeSpecialtyCoverage(b.input.specialty, b.websiteText);

  const hasBooking = !!(w?.hasBookingLink || b.input.bookingUrl);
  const hasLine = !!(w?.hasLineLink || b.input.lineUrl);

  // 1) ファーストビューの予約導線
  if (!(w?.hasBookingLink || b.input.bookingUrl) || (w?.ctaKeywordPages ?? 0) < 2) {
    recs.push({
      id: "qw-booking-firstview",
      title: "スマホのファーストビューに予約導線を固定する",
      detail: "広告・SNS・検索から流入しても予約導線が見つからないと離脱につながります。",
      whyImportant:
        "広告・SNS・検索から流入しても、ファーストビューに予約ボタンが見当たらないと、初診予約まで進む前に離脱しやすくなります。",
      whatToFix:
        "スマホ表示の最上部に「Web予約」「電話する」「LINE相談」のいずれかを常時表示（固定ヘッダー等）してください。初診と再診でボタンを分けると、初診の迷いを減らせます。",
      expectedEffect:
        "流入から予約完了までの離脱を減らせる可能性があります。ただし実際の効果測定には、日別初診数と流入データの連携が必要です。",
      difficulty: "低",
      priority: "高",
      impact: "high",
      effort: "low",
      relatedScore: "websiteConversion",
    });
  }

  // 2) tel: リンク
  if (!w?.hasTelLink) {
    recs.push({
      id: "qw-tel",
      title: "電話番号をタップ発信できる tel: リンクにする",
      detail: "スマホから番号をタップしてそのまま発信できる状態にします。",
      whyImportant:
        "高齢層や急ぎの初診では、電話予約が主要導線になります。番号が画像やテキストのみだと、スマホからワンタップで発信できず取りこぼしが生じます。",
      whatToFix:
        "電話番号を tel: リンク化し、ファーストビュー付近と各ページのフッターに配置してください。受付時間も併記すると、時間外の不満を減らせます。",
      expectedEffect:
        "スマホからの初診電話につながりやすくなります。効果の定量把握には通話計測（コールトラッキング）の導入が有効です。",
      difficulty: "低",
      priority: hasBooking ? "中" : "高",
      impact: "high",
      effort: "low",
      relatedScore: "websiteConversion",
    });
  }

  // 3) 症状別ページ（診療科に応じて具体化）
  const seoRatio = effectiveRatio(scores.seoContent);
  if (seoRatio !== null && seoRatio < 0.72) {
    const missing = cov.profile ? cov.missing : [];
    const label = cov.profile?.label ?? "診療科";
    const examples = missing.length ? quoteList(missing, 3) : "主要な症状・疾患";
    recs.push({
      id: "qw-symptom",
      title: cov.profile
        ? `${label}の症状別ページ（${examples}など）を追加する`
        : "代表的な症状・疾患ごとのページを整備する",
      detail: "症状ごとの解説ページを作り、内部リンクで予約へつなぎます。",
      whyImportant:
        "「地域名 × 症状」で検索する初診患者は、診療科トップページよりも症状別ページに着地しやすく、症状ページが無いと検索からの初診流入を取りこぼします。",
      whatToFix: cov.profile
        ? `${examples} など、貴院で対応可能な症状ごとに解説ページを作成し、各ページから医師紹介・予約へ内部リンクを張ってください。`
        : "貴院で対応可能な主要な症状・疾患ごとに解説ページを作成し、各ページから予約へ内部リンクを張ってください。",
      expectedEffect:
        "指名検索以外（症状検索）からの初診流入を増やしやすくなります。実際の寄与度の測定には、Search Console と日別初診数の連携が必要です。",
      difficulty: "高",
      priority: "高",
      impact: "high",
      effort: "high",
      relatedScore: "seoContent",
    });
  }

  // 4) YouTube → 予約導線（運用があるのに戻し導線が弱い場合）
  if (b.input.youtubeUrl && !(hasBooking || hasLine)) {
    recs.push({
      id: "qw-youtube-return",
      title: "YouTube視聴者をHP・予約へ戻す導線を作る",
      detail: "動画の概要欄・終了画面から予約ページへ誘導します。",
      whyImportant:
        "YouTubeアカウントは入力されていますが、HP・予約ページ・LINEへの導線が弱いと、視聴が来院に結びつきません。視聴後の行動先が不明確なままになっています。",
      whatToFix:
        "各動画の概要欄の先頭に予約URLを掲載し、終了画面・固定コメントからも予約ページへ誘導してください。症状解説動画は、その症状ページへリンクすると効果的です。",
      expectedEffect:
        "動画視聴からの来院につながりやすくなります。効果測定にはYouTube Analyticsと予約計測の連携が必要です。",
      difficulty: "低",
      priority: "中",
      impact: "medium",
      effort: "low",
      relatedScore: "snsConnection",
    });
  }

  // 5) GBP（MEO）
  if (!b.input.googleMapsUrl || !w?.hasGoogleMapsLink) {
    recs.push({
      id: "qw-gbp",
      title: "Googleビジネスプロフィールを整備しHPから地図リンクを張る",
      detail: "近隣からの「地図・マップ検索」からの来院を取りこぼさないようにします。",
      whyImportant:
        "近隣の患者は Google マップや「地域名＋診療科」で医院を探します。GBPが未整備・HPから地図リンクが無いと、来院直前の患者を取りこぼします。",
      whatToFix:
        "GBPの診療時間・電話・住所・カテゴリ・写真を整備し、HPの情報と一致させたうえで、アクセスページからGoogleマップへリンクしてください。",
      expectedEffect:
        "近隣からの来院（MEO）につながりやすくなります。口コミ数・表示回数などの定量把握にはGBPインサイトの連携が必要です。",
      difficulty: "中",
      priority: "中",
      impact: "medium",
      effort: "low",
      relatedScore: "meoReadiness",
    });
  }

  // 6) MMM のためのデータ整備（未評価 = データ未把握の可能性が高いため提案対象）
  const mmmRatio = effectiveRatio(scores.mmmReadiness);
  if (mmmRatio === null || mmmRatio < 0.7) {
    recs.push({
      id: "qw-mmm-data",
      title: "日別初診数の記録を今日から始める",
      detail: "施策効果を後から測るための、最も重要な土台データです。",
      whyImportant:
        "どの施策が初診数に効いたかを推定するMMMでは、日別初診数が目的変数になります。ここが無いと、将来的にも施策別の効果を評価できません。",
      whatToFix:
        "スプレッドシートで構いません。日付・初診数・休診日を毎日記録し、あわせて広告費・投稿日も月次でまとめ始めてください。",
      expectedEffect:
        "数か月分たまると、HP記事・広告・SNS・ポスティングが初診数にどれだけ寄与したかを推定できる状態（Clinic Report Analytics の Clinic Report MMM）に近づきます。",
      difficulty: "低",
      priority: "中",
      impact: "high",
      effort: "low",
      relatedScore: "mmmReadiness",
    });
  }

  // URLのみ診断では、最初の一手は「情報を追加して再診断」
  const isQuickUrl = isUrlOnlyAudit(b.input);
  if (isQuickUrl) {
    recs.push(addInfoQuickWin());
  }

  // 3件に満たない場合は fallback 候補で補完（同じ領域の提案は重複させない）
  if (recs.length < 3) {
    for (const fb of fallbackQuickWins(scores)) {
      if (recs.length >= 3) break;
      const duplicated = recs.some(
        (r) => r.id === fb.id || (!!fb.relatedScore && r.relatedScore === fb.relatedScore),
      );
      if (duplicated) continue;
      recs.push(fb);
    }
  }

  // fallback 合流後に、優先度（高>中>低）→ 難易度（低>中>高）→ 効果（大>中>小）で並べる。
  // URLのみ診断では「情報追加 → MEO整備 → 日別初診数の記録」の順が自然なため補正する
  // （日別初診数の記録は有料MMM準備寄りで、無料診断直後の最初の行動としては後段）。
  const prScore = (r: Recommendation) => (r.priority === "高" ? 0 : r.priority === "中" ? 1 : 2);
  const dfScore = (r: Recommendation) =>
    r.difficulty === "低" ? 0 : r.difficulty === "中" ? 0.3 : 0.6;
  const impScore = (r: Recommendation) =>
    r.impact === "high" ? 0 : r.impact === "medium" ? 0.1 : 0.2;
  const quickUrlBias = (r: Recommendation) => {
    if (!isQuickUrl) return 0;
    if (r.id === "qw-add-info") return -10; // 必ず先頭
    if (r.relatedScore === "meoReadiness") return -0.5;
    if (r.relatedScore === "mmmReadiness") return 0.5;
    return 0;
  };
  const rank = (r: Recommendation) => prScore(r) + dfScore(r) + impScore(r) + quickUrlBias(r);
  return recs.sort((a, c) => rank(a) - rank(c)).slice(0, 3);
}

/** URLのみ診断の Quick Win #1: 情報を追加して再診断（暫定評価を実態に近づける最初の一手） */
function addInfoQuickWin(): Recommendation {
  return {
    id: "qw-add-info",
    title: "診療科・所在地・GoogleマップURLを追加して再診断する",
    detail: "URLのみの暫定評価を、実態に近い診断に引き上げます。",
    whyImportant:
      "現在は診療科・所在地・SNSなどが未入力のため、SEO・MEO・SNS接続・症状ページ評価は外部から見える範囲での暫定評価にとどまっています。",
    whatToFix:
      "診療科・都道府県/市区町村・GoogleマップURL・各SNS URLを追加して再診断してください。診療科を指定すると症状別ページの評価が具体化します。",
    expectedEffect:
      "評価の精度が高まり、診療科に応じた症状別ページの過不足まで具体的に把握できます。",
    difficulty: "低",
    priority: "高",
    impact: "high",
    effort: "low",
  };
}

/** quickWins が3件に満たない場合の補完候補（スコアの低い領域を優先） */
function fallbackQuickWins(scores: Scores): Recommendation[] {
  const fbs: Recommendation[] = [];
  fbs.push(
    {
      id: "fb-meo",
      title: "GoogleマップURLを入力し、HPから地図リンクを張る",
      detail: "近隣・マップ検索からの来院を取りこぼさないための基本整備です。",
      whyImportant:
        "近隣の患者はGoogleマップや「地域名＋診療科」で医院を探します。GBP未整備・地図リンク無しは来院直前の取りこぼしにつながります。",
      whatToFix:
        "GBPの診療時間・住所・電話・カテゴリ・写真を整え、HPのアクセスページからGoogleマップへリンクしてください。",
      expectedEffect: "近隣からの来院（MEO）につながりやすくなります。実態把握にはGBPインサイト連携が有効です。",
      difficulty: "中",
      priority: "中",
      impact: "medium",
      effort: "low",
      relatedScore: "meoReadiness",
    },
    {
      id: "fb-sns",
      title: "SNSアカウントとHP・予約導線を相互接続する",
      detail: "運用中のSNSがあれば、HP・予約へ戻す導線を整えます。",
      whyImportant:
        "SNSの認知を来院に結びつけるには、プロフィール・投稿からHPの症状ページや予約へ戻す導線が必要です。",
      whatToFix:
        "各SNSのプロフィールに予約URLを掲載し、HPからも各SNSへリンクしてください。未運用の場合は、まずGoogleマップとHP導線を優先します。",
      expectedEffect: "認知から来院への転換を高めやすくなります。効果測定には各SNSのインサイト連携が必要です。",
      difficulty: "中",
      priority: "中",
      impact: "medium",
      effort: "medium",
      relatedScore: "snsConnection",
    },
    {
      id: "fb-mmm",
      title: "日別初診数と施策履歴の記録を始める",
      detail: "施策効果を後から測るための土台データづくりです。",
      whyImportant:
        "どの施策が初診数に効いたかを推定するには、日別初診数（目的変数）と施策履歴（説明変数）の時系列が必要です。",
      whatToFix:
        "スプレッドシートで、日付・初診数・休診日を毎日記録し、広告費・投稿日・ポスティングも月次でまとめ始めてください。",
      expectedEffect:
        "数か月分たまると、施策別の初診寄与を推定できる状態（Clinic Report Analytics の Clinic Report MMM）に近づきます。",
      difficulty: "低",
      priority: "中",
      impact: "high",
      effort: "low",
      relatedScore: "mmmReadiness",
    },
  );

  // スコアの低い領域に対応する fallback を優先的に前へ（未評価は中立扱い）
  const ratio = (k: keyof Scores) => effectiveRatio(scores[k]) ?? 0.7;
  const relatedRatio = (r: Recommendation) => (r.relatedScore ? ratio(r.relatedScore) : 1);
  return fbs.sort((a, c) => relatedRatio(a) - relatedRatio(c));
}

/** 「伸ばせる余地が大きい3点」= 達成率の低いカテゴリ由来の提案（未評価カテゴリは対象外） */
export function generateGrowthOpportunities(scores: Scores, b: DiagnosticsBundle): Recommendation[] {
  const entries = (Object.entries(scores) as [keyof Scores, ScoreDetail][])
    .filter(([key]) => key !== "medicalAdRisk") // リスクは別枠で扱う
    .map(([key, s]) => ({ key, s, ratio: effectiveRatio(s) }))
    .filter((x): x is { key: keyof Scores; s: ScoreDetail; ratio: number } => x.ratio !== null)
    .sort((a, c) => a.ratio - c.ratio)
    .slice(0, 3);

  const cov = analyzeSpecialtyCoverage(b.input.specialty, b.websiteText);
  const seoDetail = cov.profile
    ? `${cov.profile.label}で検索されやすい ${quoteList(cov.missing.length ? cov.missing : cov.profile.symptoms, 3)} などの症状ページとコラムを継続的に増やし、内部リンクで予約へつなぐことで、指名検索以外の初診流入を育てられます。`
    : "疾患ページとコラムを継続的に増やし、内部リンクで導線を作ることで、指名検索以外の初診流入を育てられます。";

  const templates: Record<string, { title: string; detail: string }> = {
    websiteConversion: {
      title: "HP集患導線を強化して初診の取りこぼしを減らす",
      detail:
        "予約・電話・LINEのCTA、初診案内、診療時間・アクセスの明確化により、来院への転換率を高められます。",
    },
    seoContent: {
      title: "症状・疾患別コンテンツで検索流入を伸ばす",
      detail: seoDetail,
    },
    meoReadiness: {
      title: "MEO（Googleビジネスプロフィール）活用の土台を整える",
      detail:
        "住所・電話・診療時間・写真・カテゴリ設計を整え、HPと情報を一致させることで近隣来院を伸ばせます。",
    },
    snsConnection: {
      title: "SNSとHP/予約の相互接続を強化する",
      detail:
        "SNSからHPの症状ページ・予約へ戻す導線を作り、認知を来院に結びつけます。",
    },
    mmmReadiness: {
      title: "実データ連携でMMM（初診寄与の推定）に進む",
      detail:
        "日別初診数・広告費・投稿データを蓄積すると、どの施策が初診に効いたかを推定できるようになります。",
    },
  };

  return entries.map(({ key, s }, i) => {
    const t = templates[key] ?? {
      title: s.label,
      detail: s.explanation,
    };
    return {
      id: `growth-${i}`,
      title: t.title,
      detail: t.detail,
      impact: "high",
      effort: "medium",
      relatedScore: key,
    } as Recommendation;
  });
}

export function generateFindings(scores: Scores, b: DiagnosticsBundle): Finding[] {
  const findings: Finding[] = [];
  const push = (
    id: string,
    category: Finding["category"],
    severity: Finding["severity"],
    title: string,
    detail: string,
  ) => findings.push({ id, category, severity, title, detail });

  // 各カテゴリの代表的な positives / negatives を finding 化
  const map: [keyof Scores, Finding["category"]][] = [
    ["websiteConversion", "website"],
    ["seoContent", "seo"],
    ["meoReadiness", "meo"],
    ["snsConnection", "sns"],
    ["mmmReadiness", "mmm"],
  ];
  for (const [key, cat] of map) {
    const s = scores[key];
    const ratio = effectiveRatio(s);
    if (ratio === null) continue; // 未評価カテゴリを「課題」として所見化しない
    if (s.negatives[0]) {
      // 改善余地の所見に「良好」バッジ（info）を付けない。
      // 高達成率でも指摘がある場合は「優先度 低」として一貫させる
      const severity: Finding["severity"] =
        ratio >= 0.5 ? "low" : ratio >= 0.3 ? "medium" : "high";
      push(`f-${key}`, cat, severity, `${s.label}: 改善余地`, s.negatives[0]);
    } else if (s.positives[0]) {
      push(`f-${key}`, cat, "info", `${s.label}: 良好`, s.positives[0]);
    }
  }

  if (b.website?.status === "failed") {
    push(
      "f-fetch",
      "general",
      "medium",
      "HP取得に失敗",
      "サイト取得に失敗しましたが、入力情報をもとに可能な範囲で診断しました。URLやサイトの稼働状況をご確認ください。",
    );
  }

  return findings;
}

// =========================================================
// チャネル別コメント
// =========================================================
export function generateChannelComments(b: DiagnosticsBundle, scores: Scores): ChannelComment[] {
  const w = b.website;
  const fetchFailed = w?.status === "failed";
  const comments: ChannelComment[] = [];
  const cov = analyzeSpecialtyCoverage(b.input.specialty, b.websiteText);
  const hasBooking = !!(b.input.bookingUrl || w?.hasBookingLink);
  const hasLine = !!(b.input.lineUrl || w?.hasLineLink);

  const wcRatio = effectiveRatio(scores.websiteConversion) ?? 0;
  const seoRatio = effectiveRatio(scores.seoContent) ?? 0;
  // 症状別ページの「追加」提案は、SEO/医療コンテンツに実際に改善余地がある場合のみ出す
  // （高スコアの領域に「不足」「足す」と言うと、スコア内訳と矛盾するため）
  const seoHasRoom = seoRatio < 0.8;
  const symptomHint =
    seoHasRoom && cov.profile && cov.missing.length ? `（${quoteList(cov.missing, 3)}など）` : "";
  const externalLimit = isUrlOnlyAudit(b.input) ? "URLのみ診断では" : "外部からの診断では";

  // HP: スコアと検出内容に応じて動的に組み立てる
  const hpScoreish = (w?.hasTelLink ? 1 : 0) + (hasBooking ? 1 : 0) + (w?.hasViewport ? 1 : 0);
  const hasFirstVisitInfo = textIncludesAny(b.websiteText, FIRST_VISIT_KEYWORDS);
  const confirmedCtas = [
    ...(hasBooking ? ["予約"] : []),
    ...(w?.hasTelLink ? ["電話"] : []),
    ...(hasLine ? ["LINE"] : []),
  ];
  const ctaLabel = confirmedCtas.length ? confirmedCtas.join("・") : "行動";

  let hpComment: string;
  if (w?.status === "failed") {
    hpComment =
      "HPの取得に失敗したため詳細評価はできませんでした。取得できた範囲では、ファーストビューの予約・電話CTA、スマホ最適化の3点が最低限の集患導線として重要です。";
  } else if (wcRatio >= 0.8 && !seoHasRoom) {
    // 導線・コンテンツともに高スコア: 不足指摘ではなく次段階（実データ連携）の提案にする
    hpComment = `HP上では${ctaLabel}などの基本導線が確認でき、症状・疾患ページや継続的な情報発信の土台も良好です。${externalLimit}実際の予約完了率や検索流入までは分からないため、次の段階では流入数・予約数・初診数を連携して導線の実効性を確認してください。`;
  } else if (wcRatio >= 0.8) {
    // 導線は良好・コンテンツ側に伸びしろ
    hpComment = `HP上では${ctaLabel}などの基本導線が確認できます。伸びしろはコンテンツ側にあり、症状別ページ${symptomHint}の拡充が次の一手です。導線自体の実効性は、流入数・予約数・初診数の連携で確認できます。`;
  } else if (!hasBooking) {
    // tel: リンクの有無で文言を変える（電話導線があるのに「電話CTAが無い」と主張しない）
    hpComment = w?.hasTelLink
      ? `電話導線は確認できますが、Web予約への導線が見当たりません。広告やSNSから流入した患者の受け皿として、Web予約導線の設置が次の一手です。${seoHasRoom && cov.profile ? `あわせて症状別ページ${symptomHint}を増やすと、検索流入の受け皿になります。` : ""}`
      : `Web予約・電話のいずれのCTAも確認できませんでした。広告やSNSから流入しても、初診予約までの導線が弱くなっています。${seoHasRoom && cov.profile ? `あわせて症状別ページ${symptomHint}を増やすと、検索流入の受け皿になります。` : ""}`;
  } else if (hpScoreish >= 2) {
    // 基本導線はあるが満点ではない: 実際に検出できなかった項目だけを提案する
    const gaps: string[] = [];
    if (!hasFirstVisitInfo) gaps.push("初診案内ページ");
    if (seoHasRoom) gaps.push(`症状別ページ${symptomHint}`);
    hpComment = gaps.length
      ? `予約・電話・スマホ対応など基本的な集患導線が確認できます。次の一手として、${gaps.join("と")}を整えると、検索・広告流入の取りこぼしを減らせます。`
      : `予約・電話・スマホ対応など基本的な集患導線が確認できます。${externalLimit}実際の予約完了率までは分からないため、次の段階では流入数・予約数・初診数を連携した効果測定を推奨します。`;
  } else {
    hpComment =
      "予約・電話・スマホ対応のいずれかが弱い状態です。ファーストビューに予約・電話CTAを常設し、スマホ表示を最優先で最適化してください。";
  }

  comments.push({
    channel: "hp",
    channelLabel: "HP（自院サイト）",
    // 予約導線が無い場合は「good」にしない（コメントとの矛盾を防ぐ）
    status:
      w?.status === "failed"
        ? "unknown"
        : wcRatio >= 0.8 || (hpScoreish >= 2 && hasBooking)
          ? "good"
          : hpScoreish >= 1
            ? "partial"
            : "weak",
    comment: hpComment,
  });

  // Googleマップ/MEO
  comments.push({
    channel: "googleMap",
    channelLabel: "Googleマップ / MEO",
    status: fetchFailed
      ? "unknown"
      : b.input.googleMapsUrl
        ? w?.hasGoogleMapsLink
          ? "good"
          : "partial"
        : "weak",
    comment: fetchFailed
      ? b.input.googleMapsUrl
        ? "GoogleマップURLは確認できました。ただしHPを取得できなかったため、HP内での地図リンクの有無は評価できません。口コミ数・写真などの実態把握にはGBPインサイトの連携が有効です。"
        : "GoogleビジネスプロフィールのURLが未入力で、かつHPも取得できなかったため、HP内の地図リンクの有無は評価できません。URLを追加/確認して再診断してください。"
      : b.input.googleMapsUrl
        ? w?.hasGoogleMapsLink
          ? "GoogleマップURLの入力と、HPからの地図リンクを確認しました。口コミ数・評価点・写真・カテゴリ設計は外部URLだけでは断定できないため、実態の把握にはGBPインサイトの連携が有効です。"
          : "GoogleマップURLは確認できましたが、HP（アクセスページ等）からGoogleマップへのリンクが見当たりません。地図リンクを設置し、GBPの診療時間・住所・電話をHPと一致させてください。"
        : "GoogleビジネスプロフィールのURLが未入力です。「地域名＋診療科」やマップ検索は来院直前の患者が多いため、GBPの整備とHPへの地図リンク掲載を優先することを推奨します。",
  });

  // YouTube
  const yt = b.youtube;
  comments.push({
    channel: "youtube",
    channelLabel: "YouTube",
    status: b.input.youtubeUrl ? (fetchFailed ? "partial" : yt?.status === "success" ? "good" : "partial") : "unknown",
    comment: b.input.youtubeUrl
      ? fetchFailed
        ? "YouTube URLは確認できました。HPを取得できなかったため、動画からHP・予約への相互リンクは評価できませんが、各動画の概要欄先頭に予約URLを掲載することは有効です。"
        : !(hasBooking || hasLine)
          ? "YouTubeアカウントは入力されていますが、HP・予約ページ・LINEへの導線が弱い可能性があります。動画視聴後の行動先（予約・症状ページ）を概要欄と終了画面で明確にしてください。"
          : yt?.status === "success"
            ? `チャンネル「${yt.channelTitle ?? "取得済み"}」を確認しました。各動画の概要欄先頭に予約URLを置き、症状解説動画は対応する症状ページ${symptomHint}へリンクすると、視聴を来院に結びつけやすくなります。`
            : "YouTube URLの入力を確認しました（API詳細取得は未実施/失敗）。動画概要欄の先頭に予約URLを掲載し、HPの症状ページへ戻す導線を作ると効果的です。"
      : "YouTube URLは未入力です。運用がある場合は、症状解説動画から予約・症状ページへ戻す導線設計が有効です。",
  });

  // Instagram
  comments.push({
    channel: "instagram",
    channelLabel: "Instagram",
    status: b.input.instagramUrl ? "partial" : "unknown",
    comment: b.input.instagramUrl
      ? "Instagram URLの入力を確認しました（非公式な内容取得は行いません）。プロフィール欄に予約リンクを置き、投稿からHPの症状ページへ誘導する導線を整えると、認知を来院につなげやすくなります。"
      : "Instagram URLは未入力です。地域・診療科によっては認知拡大に有効なため、運用状況に応じて検討してください。",
  });

  // TikTok
  comments.push({
    channel: "tiktok",
    channelLabel: "TikTok",
    status: b.input.tiktokUrl ? "partial" : "unknown",
    comment: b.input.tiktokUrl
      ? "TikTok URLの入力を確認しました（非公式な内容取得は行いません）。プロフィールからHP・予約へ戻す導線があるかを点検してください。"
      : "TikTok URLは未入力です。若年層向けの診療科では認知獲得に活用余地がありますが、優先度は診療科によります。",
  });

  // LINE / 予約導線
  const lineOrBookingEntered = !!b.input.lineUrl || !!b.input.bookingUrl;
  comments.push({
    channel: "lineBooking",
    channelLabel: "LINE / 予約導線",
    status: fetchFailed
      ? lineOrBookingEntered
        ? "partial"
        : "unknown"
      : hasLine && hasBooking
        ? "good"
        : hasLine || hasBooking
          ? "partial"
          : "weak",
    comment: fetchFailed
      ? lineOrBookingEntered
        ? "入力されたLINE/予約URLは確認できますが、HPを取得できなかったため、HP内での予約導線の掲載や相互リンクは評価できません。"
        : "LINE・予約システムURLは未入力で、かつHPも取得できなかったため、HP内の予約導線の有無は評価できません。URLを追加/確認して再診断してください。"
      : hasLine && hasBooking
        ? "LINEと予約導線の両方が確認できます。友だち追加後の受診案内・予約リマインド・再来院導線まで設計すると、継続来院につながります。"
        : hasLine
          ? "LINE導線は確認できましたが、Web予約への接続が弱い状態です。LINEのリッチメニューから予約へ直接つなぐと、初診予約の取りこぼしを減らせます。"
          : hasBooking
            ? "予約導線は確認できました。LINE公式アカウントを加えると、予約リマインドや再来院・キャンセル対策に活用できます。"
            : "LINE・予約導線ともに確認できませんでした。まずはWeb予約導線の設置を最優先で行うことを推奨します。",
  });

  return comments;
}
// truncate ヘルパー（scoring 内で使用）
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// =========================================================
// 質的評価（集患スタイル診断）
//
// 点数と独立した「タイプ分け＋講評」。数値の高低ではなく
// 観測できた事実のパターンから、その医院の「らしさ」を言葉にする。
// スコアがすべてではない、というプロダクトの姿勢をレポートに実装する。
// =========================================================

const QUALITATIVE_CLOSING =
  "この診断が見ているのは「外から見える導線」だけです。診療の質・院内の信頼・ご紹介のつながりといった本当の強みは、点数には写りません。スコアは健康診断の数値のように、定期的に測って変化を楽しむ目安としてお使いください。";

export function generateQualitativeReview(
  scores: Scores,
  b: DiagnosticsBundle,
): QualitativeReview {
  const w = b.website;
  const text = b.websiteText;
  const textOk = !!w && w.status !== "failed" && !isTextThin(b);

  const hp = effectiveRatio(scores.websiteConversion);
  const seo = effectiveRatio(scores.seoContent);
  const meo = effectiveRatio(scores.meoReadiness);
  const sns = effectiveRatio(scores.snsConnection);
  const ratios = [hp, seo, meo, sns];
  const known = ratios.filter((r): r is number => r !== null);
  const unknownCount = ratios.filter((r) => r === null).length;
  const avg = known.length ? known.reduce((a, c) => a + c, 0) / known.length : 0;

  // 観測できた事実
  const cov = analyzeSpecialtyCoverage(b.input.specialty, text);
  const hasTel = !!w?.hasTelLink;
  const hasBooking = !!(w?.hasBookingLink || b.input.bookingUrl);
  const hasBlog = textOk && textIncludesAny(text, BLOG_KEYWORDS);
  const hasMapsLink = !!w?.hasGoogleMapsLink;
  const ytKnown = !!b.input.youtubeUrl || !!w?.snsLinks.youtube;
  const anySnsKnown =
    ytKnown ||
    !!b.input.instagramUrl ||
    !!w?.snsLinks.instagram ||
    !!b.input.tiktokUrl ||
    !!w?.snsLinks.tiktok ||
    !!b.input.lineUrl ||
    !!w?.hasLineLink;
  const hpLinksToSns =
    !!w &&
    (w.snsLinks.youtube ||
      w.snsLinks.instagram ||
      w.snsLinks.tiktok ||
      w.snsLinks.facebook ||
      w.snsLinks.x ||
      w.snsLinks.line);

  // ---- スタイル判定（上から順に最初にマッチしたもの）----
  const style: ClinicStyleType = (() => {
    if (known.length >= 3 && known.every((r) => r >= 0.75)) {
      return {
        emoji: "🏆",
        name: "オールラウンダー型",
        tagline: "どこを切っても隙が少ない優等生",
        description:
          "外から見える導線はどの角度から見ても整っています。ここから先の伸びしろは、外からは見えない部分にあります。実データでの効果測定に進む準備ができています。",
        nextStep:
          "日別初診数の記録を始め、どの施策が実際に効いているかを実データで確かめる段階です。",
      };
    }
    if (unknownCount >= 2) {
      return {
        emoji: "🔍",
        name: "未知数ポテンシャル型",
        tagline: "まだ本当の姿を見せていない",
        description:
          "外から見える情報が少なく、実力の全体像はまだ判断できません。診療科・SNS・GoogleマップURLなどの情報を追加するほど、診断は実態に近づきます。",
        nextStep:
          "診療科・所在地・SNS・GoogleマップURLを追加して再診断すると、評価できる範囲が大きく広がります。",
      };
    }
    if (hasBlog && (seo ?? 0) >= 0.6) {
      return {
        emoji: "📚",
        name: "コツコツ発信型",
        tagline: "続ける力は、それ自体が資産",
        description:
          "コラムやお知らせなど、情報発信の習慣が根づいています。発信の継続は一朝一夕に真似できない強みです。あとは発信から予約・来院へつなぐ出口を整えると、この強みがそのまま集患力になります。",
        nextStep:
          "各コラムから症状解説や予約への内部リンクを1本ずつ足し、発信の出口を予約につなげましょう。",
      };
    }
    if ((sns ?? 0) >= 0.6 && (hp ?? 1) < 0.6) {
      return {
        emoji: "📣",
        name: "発信先行型",
        tagline: "声は届いている。受け皿を整えたい",
        description:
          "SNSでの発信・接点づくりは動いています。一方でHP側の受け皿（予約導線など）に伸びしろがあり、ここを整えると発信の努力が来院に変わりやすくなります。",
        nextStep:
          "まずはHPに予約導線を1つ常設するところから。受け皿が整えば、これまでの発信が来院につながりやすくなります。",
      };
    }
    if ((hp ?? 0) >= 0.7 && (sns === null || sns < 0.5)) {
      return {
        emoji: "🧭",
        name: "導線どっしり職人型",
        tagline: "来た人を迷わせない、堅実な設計",
        description:
          "HPに来た患者さんを予約・来院まで案内する基本導線が堅実に作られています。認知を広げるチャネル（SNS・発信）を足すと、この導線がもっと活きてきます。",
        nextStep:
          "月1本のコラムやGoogleビジネスプロフィールの充実など、認知の入口を1つ増やしてみましょう。",
      };
    }
    if ((meo ?? 0) >= 0.7 && (seo ?? 1) < 0.5) {
      return {
        emoji: "🏘",
        name: "地域密着どっしり型",
        tagline: "近所の信頼から広げていくタイプ",
        description:
          "地図・アクセスまわりの整備が進んでおり、近隣からの来院を受け止める土台があります。症状解説などの検索コンテンツを足すと、商圏を少し広げられます。",
        nextStep:
          "よく診る症状の解説ページを1つ作り、「地域名×症状」で探す患者さんの受け皿を増やしましょう。",
      };
    }
    if (avg < 0.4) {
      return {
        emoji: "🌱",
        name: "伸びしろの塊型",
        tagline: "整えた分だけ、素直に伸びる",
        description:
          "基本の導線づくりはこれからですが、裏を返せば打ち手がはっきりしている状態です。優先改善の1〜2個を整えるだけでも、外から見える印象は大きく変わります。",
        nextStep:
          "「今すぐ直すべき3点」の1番から着手を。小さく直して再診断、の繰り返しが最短ルートです。",
      };
    }
    return {
      emoji: "⚖️",
      name: "バランス育成型",
      tagline: "全体を少しずつ底上げしていく段階",
      description:
        "大きな穴はないものの、突き抜けた強みもまだ見えていない状態です。いちばん達成率の低い領域から順に育てると、バランスの良さがそのまま強みになります。",
      nextStep:
        "達成率がいちばん低い領域を1つ選んで整え、再診断で変化を確かめながら進めましょう。",
    };
  })();

  // ---- 質的な強み（数値に依らない事実ベース・最大4つ）----
  const strengths: string[] = [];
  if (hasTel) strengths.push("電話でワンタップでつながれる安心感があります（tel: リンク対応）");
  if (hasBooking) strengths.push("Web予約への入り口があり、来院の心理的ハードルを下げられています");
  if (hasBlog) strengths.push("コラム・お知らせの発信習慣は、信頼の積み立てになっています");
  if (cov.present.length >= 1)
    strengths.push(
      `${quoteList(cov.present, 2)}など、患者さんが検索に使う症状の言葉で語れています`,
    );
  if (hasMapsLink) strengths.push("HPから地図への案内があり、来院直前のつまずきが少ない設計です");
  if (ytKnown) strengths.push("動画で院内の雰囲気や医師の人柄を伝えられるチャネルを持っています");
  if (strengths.length === 0) {
    strengths.push(
      "外から見える範囲では強みを特定しきれませんでした（情報を追加すると見えてきます）",
    );
  }

  // ---- もったいないポイント（責めずに、惜しさを言葉にする・最大3つ）----
  const opportunities: string[] = [];
  if (!hasBooking && !!w && w.status !== "failed")
    opportunities.push("予約の入り口が見つけにくいのがもったいない点です。予約ボタンを1つ常設するだけでも変わります");
  if (textOk && cov.profile && cov.present.length === 0)
    opportunities.push("症状の言葉が少なく、検索してきた患者さんとすれ違いがちです");
  if (anySnsKnown && !hpLinksToSns && !!w && w.status !== "failed")
    opportunities.push("SNSとHPが相互にリンクされていません。行き来をつなぐと、SNSの閲覧を予約まで案内できます");
  if (!hasMapsLink && !!w && w.status !== "failed")
    opportunities.push("地図リンクがなく、来院直前の道案内でつまずきやすい状態です");
  if (textOk && !hasBlog)
    opportunities.push("発信の習慣づけはこれからです。月1本のコラムからでも十分始まります");
  const topOpportunities = opportunities.slice(0, 3);

  // ---- 講評 ----
  // style.description はカード上部で表示済みのため、講評では繰り返さない
  const narrative = `${b.input.clinicName || "貴院"}は「${style.emoji} ${style.name}」タイプと診断しました。${QUALITATIVE_CLOSING}`;

  return {
    style,
    strengths: strengths.slice(0, 4),
    opportunities: topOpportunities,
    narrative,
  };
}

// =========================================================
// MMM 準備度パネル用データ
// =========================================================
export const MMM_REQUIRED_DATA: string[] = [
  "日別初診数",
  "日別再診数（任意）",
  "診療日 / 休診日",
  "Google広告費",
  "Google広告のクリック数 / 表示回数",
  "医療コラムの公開日",
  "YouTube 投稿日 / 再生数",
  "Instagram / TikTok 投稿日 / リーチ / 再生数",
  "ポスティング実施日 / 部数 / 費用",
  "天気 / 気温 / 祝日 / 季節性",
  "競合イベントや近隣要因（可能な範囲で）",
];

export function buildMMMReadiness(b: DiagnosticsBundle, mmmScore: ScoreDetail): MMMReadiness {
  const availableSignals: string[] = [];
  const missingData: string[] = [];

  if (b.input.websiteUrl) availableSignals.push("HP URL");
  if (b.input.googleMapsUrl) availableSignals.push("GoogleマップURL");
  if (b.input.youtubeUrl) availableSignals.push("YouTube URL");
  if (b.input.instagramUrl) availableSignals.push("Instagram URL");
  if (b.input.tiktokUrl) availableSignals.push("TikTok URL");
  if (b.input.lineUrl) availableSignals.push("LINE URL");
  if (b.input.bookingUrl) availableSignals.push("予約システムURL");
  if (b.input.activeChannels?.length) {
    availableSignals.push(`注力施策: ${b.input.activeChannels.join(" / ")}`);
  }
  if (b.input.monthlyNewPatientsRange && b.input.monthlyNewPatientsRange !== "不明") {
    availableSignals.push(`月間初診数レンジ: ${b.input.monthlyNewPatientsRange}`);
  }

  // 未取得の目的変数・説明変数
  if (!b.input.monthlyNewPatientsRange || b.input.monthlyNewPatientsRange === "不明") {
    missingData.push("日別初診数（目的変数として最重要）");
  } else {
    missingData.push("日別初診数（レンジではなく日次の実数）");
  }
  missingData.push(
    "診療日 / 休診日カレンダー",
    "Google広告費・クリック数・表示回数",
    "医療コラム / YouTube / SNS の投稿日・成果",
    "ポスティング実施日・部数・費用",
    "天気 / 祝日 / 季節性データ",
  );

  const nextDataToCollect = [
    "まずは日別初診数の記録を開始する（Excel/スプレッドシートで可）",
    "休診日と診療時間の変更履歴を残す",
    "広告費・投稿日を月次でまとめる",
  ];

  const paidPlanMessage =
    "Clinic Report Analytics（有料版）では、日別初診数を目的変数、HP記事・広告・YouTube・SNS・ポスティング・MEO・休診日・曜日・祝日・天気などを説明変数として、Clinic Report MMM が施策別の初診寄与とおおよそのCPAを推定します。Clinic Report Free（無料版）では実データが揃っていないため、これらは算出せず「準備度」の評価にとどめています。";

  return {
    readinessScore: mmmScore.score,
    readinessMaxScore: mmmScore.evaluableMaxScore ?? mmmScore.maxScore,
    notEvaluable: mmmScore.status === "not_evaluable",
    availableSignals,
    missingData,
    nextDataToCollect,
    paidPlanMessage,
  };
}
