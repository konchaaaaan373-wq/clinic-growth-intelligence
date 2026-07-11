// =========================================================
// スコアリングエンジン（ルールベース）
//
// すべて純粋関数です。副作用（fetch など）は含めません。
// ルールは明示的に分割してあり、後から重み・閾値を調整しやすい構造です。
//
// Netlify Function（analyze）とサンプル生成の双方から利用します。
// =========================================================

import type {
  AuditInput,
  ChannelComment,
  Finding,
  MMMReadiness,
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

// =========================================================
// 1. HP集患導線スコア（25点）
// =========================================================
export function calculateWebsiteConversionScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const text = b.websiteText;
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 0;

  const hasHeroCta = textIncludesAny(text, ["予約", "電話", "line", "tel"]) &&
    (w?.hasTelLink || w?.hasBookingLink || w?.hasLineLink || false);
  if (hasHeroCta) {
    score += 5;
    positives.push("予約 / 電話 / LINE などの行動導線がページ内に見られます");
  } else {
    negatives.push("ファーストビュー付近に予約・電話・LINEなどの明確なCTAが見当たりません");
  }

  if (w?.hasTelLink) {
    score += 4;
    positives.push("tel: リンク（タップ発信）が設置されています");
  } else {
    negatives.push("tel: リンクが検出できませんでした（スマホからの発信導線が弱い可能性）");
  }

  if (w?.hasBookingLink || b.input.bookingUrl) {
    score += 4;
    positives.push("予約システム/予約ボタンへの導線が確認できます");
  } else {
    negatives.push("Web予約への導線が確認できませんでした");
  }

  if (textIncludesAny(text, HOURS_KEYWORDS)) {
    score += 3;
    positives.push("診療時間の記載が確認できます");
  } else {
    negatives.push("診療時間が明確に読み取れませんでした");
  }

  if (textIncludesAny(text, ACCESS_KEYWORDS)) {
    score += 3;
    positives.push("アクセス情報の記載が確認できます");
  } else {
    negatives.push("アクセス情報が明確に読み取れませんでした");
  }

  if (textIncludesAny(text, FIRST_VISIT_KEYWORDS)) {
    score += 3;
    positives.push("初診の方向けの案内が見られます");
  } else {
    negatives.push("初診案内ページ/初診の方向けの説明が見当たりません");
  }

  if (w?.hasViewport) {
    score += 2;
    positives.push("スマートフォン向け viewport 設定があります");
  } else {
    negatives.push("スマホ最適化（viewport）が確認できませんでした");
  }

  if ((w?.ctaKeywordPages ?? 0) >= 2) {
    score += 1;
    positives.push("複数ページに行動導線の文言が見られます");
  } else {
    negatives.push("CTA文言が複数ページに展開されていない可能性があります");
  }

  return {
    score: clamp(score, 0, 25),
    maxScore: 25,
    label: "HP集患導線",
    explanation:
      "初診の患者がHPから予約・来院へ進みやすいか（CTA・電話・予約・診療時間・アクセス・初診案内など）を評価します。",
    positives,
    negatives,
  };
}

// =========================================================
// 2. SEO/医療コンテンツスコア（25点）
// =========================================================
export function calculateSeoContentScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const text = b.websiteText;
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 0;

  if (w?.title && w.title.trim().length >= 8) {
    score += 3;
    positives.push(`title タグが設定されています（「${truncate(w.title, 40)}」）`);
  } else {
    negatives.push("title タグが未設定、または短すぎる可能性があります");
  }

  if (w?.metaDescription && w.metaDescription.trim().length >= 20) {
    score += 3;
    positives.push("meta description が設定されています");
  } else {
    negatives.push("meta description が未設定、または内容が薄い可能性があります");
  }

  if (w?.h1 && w.h1.length >= 1) {
    score += 2;
    positives.push("h1 見出しが設定されています");
  } else {
    negatives.push("h1 見出しが確認できませんでした");
  }

  // 診療科プロファイルに基づく症状カバレッジで、疾患・症状ページの充実度を評価
  const cov = analyzeSpecialtyCoverage(b.input.specialty, text);
  if (cov.profile) {
    const presentCount = cov.present.length;
    if (presentCount >= 4) {
      score += 5;
      positives.push(
        `${cov.profile.label}で想定される症状ページが複数見られます（${quoteList(cov.present)}など）`,
      );
    } else if (presentCount >= 1) {
      score += 2;
      positives.push(
        `症状ページは一部確認できます（${quoteList(cov.present)}など）`,
      );
      negatives.push(
        `${cov.profile.label}では ${quoteList(cov.missing)} など症状別ページが不足している可能性があります。地域名×症状の検索からの初診獲得では、診療科トップページだけでは弱くなりがちです`,
      );
    } else {
      negatives.push(
        `${cov.profile.label}で検索されやすい ${quoteList(cov.missing, 4)} などの症状別ページが確認できませんでした。症状ごとの解説ページを用意すると、指名検索以外からの初診流入を増やしやすくなります`,
      );
    }
  } else {
    // 診療科を判定できない場合は汎用キーワードで評価
    const medicalHits = countKeywordHits(text, SEO_MEDICAL_KEYWORDS);
    if (medicalHits >= 3) {
      score += 5;
      positives.push("診療科・疾患・症状に関するコンテンツが存在しそうです");
    } else if (medicalHits >= 1) {
      score += 2;
      positives.push("診療内容に関する記載は一部確認できます");
      negatives.push("疾患別・症状別ページの拡充余地があります");
    } else {
      negatives.push("診療科ページ・疾患ページらしき内容が確認できませんでした");
    }
  }

  const hasSymptomLinks =
    cov.profile && cov.present.length > 0
      ? cov.present.length >= 2 && (w?.internalLinkCount ?? 0) >= 5
      : textIncludesAny(text, SYMPTOM_LINK_KEYWORDS) && (w?.internalLinkCount ?? 0) >= 5;
  if (hasSymptomLinks) {
    score += 4;
    positives.push("症状・疾患名を含む内部リンク導線が見られます");
  } else {
    negatives.push(
      "症状・疾患名を起点とした内部リンク（例: 症状ページ→医師紹介→予約）の導線が弱い可能性があります",
    );
  }

  if (textIncludesAny(text, BLOG_KEYWORDS)) {
    score += 3;
    positives.push("ブログ/コラム/お知らせなどの継続的な情報発信が見られます");
  } else {
    negatives.push("ブログ・コラムなど継続的な情報発信が確認できませんでした");
  }

  if (w?.hasJsonLd) {
    score += 3;
    positives.push("構造化データ（JSON-LD）らしき記述があります");
  } else {
    negatives.push("構造化データ（JSON-LD）が確認できませんでした");
  }

  if (w?.hasSitemapHint) {
    score += 2;
    positives.push("sitemap.xml / robots.txt が推定できます");
  } else {
    negatives.push("sitemap.xml / robots.txt の存在が推定できませんでした");
  }

  return {
    score: clamp(score, 0, 25),
    maxScore: 25,
    label: "SEO/医療コンテンツ",
    explanation:
      "検索から見つけられ、疾患・症状で悩む患者に届くコンテンツ設計になっているか（title/description/見出し/疾患ページ/内部リンク/構造化データ）を評価します。",
    positives,
    negatives,
  };
}

// =========================================================
// 3. MEO準備度スコア（15点）
// =========================================================
export function calculateMeoReadinessScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const text = b.websiteText;
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 0;

  if (b.input.googleMapsUrl) {
    score += 4;
    positives.push("GoogleマップURLが入力されています");
  } else {
    negatives.push("GoogleマップURL（GBP）が未入力です");
  }

  if (textIncludesAny(text, ["住所", "所在地", "〒", "丁目", "番地"])) {
    score += 3;
    positives.push("HP内に住所らしき記載があります");
  } else {
    negatives.push("HP内の住所表記が読み取りにくい可能性があります");
  }

  if (w?.hasTelLink || textIncludesAny(text, ["tel", "電話"])) {
    score += 2;
    positives.push("HP内に電話番号らしき記載があります");
  } else {
    negatives.push("HP内の電話番号表記が読み取りにくい可能性があります");
  }

  if (textIncludesAny(text, HOURS_KEYWORDS)) {
    score += 2;
    positives.push("診療時間の記載があります（GBPとの整合が取りやすい）");
  } else {
    negatives.push("診療時間の記載が読み取りにくい可能性があります");
  }

  if (textIncludesAny(text, PARKING_KEYWORDS) || textIncludesAny(text, ACCESS_KEYWORDS)) {
    score += 2;
    positives.push("アクセス/駐車場情報の記載があります");
  } else {
    negatives.push("アクセス・駐車場情報が読み取りにくい可能性があります");
  }

  if (w?.hasGoogleMapsLink) {
    score += 2;
    positives.push("HP内からGoogleマップへのリンクが確認できます");
  } else {
    negatives.push("HP内からGoogleマップへのリンクが確認できませんでした");
  }

  return {
    score: clamp(score, 0, 15),
    maxScore: 15,
    label: "MEO準備度",
    explanation:
      "Googleビジネスプロフィール（MEO）を活かす土台がHP側に整っているか（住所・電話・診療時間・アクセス・地図リンク）を評価します。口コミ数・評価点・検索表示回数などは外部URLだけでは断定していません。",
    positives,
    negatives,
  };
}

// =========================================================
// 4. SNS集患接続スコア（15点）
// =========================================================
export function calculateSnsConnectionScore(b: DiagnosticsBundle): ScoreDetail {
  const w = b.website;
  const fetchFailed = w?.status === "failed";
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 0;

  // 未入力は「弱い」と断定せず、評価不能（追加情報が必要）として扱う
  if (b.input.youtubeUrl) {
    score += 3;
    positives.push("YouTube チャンネルURLが入力されています");
  } else {
    negatives.push("YouTube URLは未入力です（未運用の可能性もあります。運用中ならURL追加で評価できます）");
  }

  if (b.input.instagramUrl) {
    score += 2;
    positives.push("Instagram URLが入力されています");
  } else {
    negatives.push("Instagram URLは未入力です（運用中ならURL追加で評価できます）");
  }

  if (b.input.tiktokUrl) {
    score += 2;
    positives.push("TikTok URLが入力されています");
  } else {
    negatives.push("TikTok URLは未入力です（運用中ならURL追加で評価できます）");
  }

  if (b.input.lineUrl || w?.hasLineLink) {
    score += 2;
    positives.push("LINE公式アカウントへの導線が確認できます");
  } else if (fetchFailed) {
    negatives.push("LINE公式アカウントURLは未入力です（運用中ならURL追加で評価できます）");
  } else {
    negatives.push("LINE公式アカウントへの導線は外部から確認できませんでした（URL追加で評価できます）");
  }

  const anySnsEntered =
    !!b.input.youtubeUrl || !!b.input.instagramUrl || !!b.input.tiktokUrl || !!b.input.lineUrl;
  const hpLinksToSns =
    !!w &&
    (w.snsLinks.youtube ||
      w.snsLinks.instagram ||
      w.snsLinks.tiktok ||
      w.snsLinks.facebook ||
      w.snsLinks.x ||
      w.snsLinks.line);
  if (hpLinksToSns) {
    score += 2;
    positives.push("HP内からSNSへのリンクが確認できます");
  } else if (fetchFailed) {
    // HP未取得: 相互リンクの有無は断定しない
    negatives.push(
      anySnsEntered
        ? "入力されたSNSは確認できますが、HP内での相互リンクの有無はHP未取得のため評価できません"
        : "HP未取得のため、HPとSNSの相互リンクは評価できません（SNS URLを追加すると評価できます）",
    );
  } else if (anySnsEntered) {
    // SNS入力があるのにHPからリンクが無い → 連携が外部から確認できない（改善余地）
    negatives.push("入力されたSNSへのHP内リンクが確認できませんでした（相互接続の改善余地）");
  } else {
    // SNS未入力 → そもそも評価不能
    negatives.push("SNSが未入力のため、HPとの相互接続は外部から評価できていません");
  }

  // SNSからHP/予約へ戻す導線は外部からは断定できないため、
  // HP側に予約導線があり、かつSNSが存在する場合に「戻せる素地あり」として加点。
  const hasReturnPath =
    (w?.hasBookingLink || !!b.input.bookingUrl) &&
    (!!b.input.youtubeUrl || !!b.input.instagramUrl || !!b.input.tiktokUrl);
  if (hasReturnPath) {
    score += 2;
    positives.push("SNSからHP/予約へ戻す導線を作れる素地があります（予約導線が存在）");
  } else if (fetchFailed) {
    negatives.push("HP未取得のため、SNSからHP/予約へ戻す導線は評価できません");
  } else {
    negatives.push("SNSからHP/予約へ戻す導線の整備余地があります");
  }

  if (b.youtube?.status === "success" && (b.youtube.videoCount ?? 0) > 0) {
    score += 2;
    positives.push("YouTube API で動画投稿の存在が確認できました");
  } else if (b.input.youtubeUrl) {
    negatives.push(
      "YouTube の投稿状況はAPI未連携のため未評価です（URL入力は確認済み）",
    );
  }

  return {
    score: clamp(score, 0, 15),
    maxScore: 15,
    label: "SNS集患接続",
    explanation:
      "YouTube/Instagram/TikTok/LINE などのSNSが存在し、HPや予約導線と相互に接続されているかを評価します。Instagram/TikTok は非公式取得を行わず、URL入力とHP内リンクを中心に評価します。",
    positives,
    negatives,
  };
}

// =========================================================
// 5. 医療広告リスクスコア（10点・低リスクほど高得点）
// =========================================================
export function calculateMedicalAdRiskScore(riskFindings: RiskFinding[]): ScoreDetail {
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
    // low のみ: 受診促進・副作用説明など問題になりにくい文脈のため減点しない
    positives.push(
      `高リスク・要確認にあたる表現は検出されませんでした（低リスクの文脈確認 ${counts.low} 件のみ・減点なし）`,
    );
    for (const f of riskFindings) {
      negatives.push(
        `【文脈確認】「${f.expression}」— 受診促進・副作用説明などの文脈のため減点していません（低リスク）`,
      );
    }
  } else {
    const countParts: string[] = [];
    if (counts.high > 0) countParts.push(`優先確認 ${counts.high} 件`);
    if (counts.medium > 0) countParts.push(`要確認 ${counts.medium} 件`);
    if (counts.low > 0) countParts.push(`文脈確認 ${counts.low} 件（低リスク・減点なし）`);
    negatives.push(`${countParts.join("・")}（違反の断定ではありません）`);
    const label = (s: RiskFinding["severity"]) => (s === "high" ? "優先確認" : "要確認");
    for (const f of riskFindings) {
      negatives.push(
        f.severity === "low"
          ? `【文脈確認】「${f.expression}」— 低リスクの文脈のため減点していません`
          : `【${label(f.severity)}】「${f.expression}」— 文脈により確認が望ましい可能性があります`,
      );
    }
    if (counts.high === 0) {
      positives.push("保証・最上級を断定するような高リスク表現は検出されませんでした");
    }
  }

  return {
    score,
    maxScore: 10,
    label: "医療広告リスク",
    explanation:
      "医療広告ガイドライン上、文脈によっては確認が望ましい表現を機械的に初期スクリーニングし、文脈に応じて優先確認/要確認/文脈確認に分類します。法的判断ではなく、単語検出のみを根拠に違反を断定するものではありません。最終確認は専門家・ガイドラインを前提としてください。",
    positives,
    negatives,
  };
}

// =========================================================
// 6. MMM準備度スコア（10点）
// =========================================================
export function calculateMMMReadinessScore(b: DiagnosticsBundle): ScoreDetail {
  const fetchFailed = b.website?.status === "failed";
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 0;

  if (b.input.websiteUrl) {
    score += 1;
    positives.push("HP URL があります");
  }
  if (b.input.googleMapsUrl) {
    score += 1;
    positives.push("GoogleマップURL があります");
  }
  if (b.input.youtubeUrl || b.input.instagramUrl || b.input.tiktokUrl || b.input.lineUrl) {
    score += 1;
    positives.push("SNS（YouTube/Instagram/TikTok/LINE のいずれか）があります");
  } else {
    negatives.push("説明変数となるSNSチャネルが未入力です");
  }
  if (b.input.activeChannels && b.input.activeChannels.length > 0) {
    score += 1;
    positives.push("現在注力している施策が入力されています");
  } else {
    negatives.push("現在の注力施策が未入力です（説明変数の把握に必要）");
  }
  if (b.input.monthlyNewPatientsRange && b.input.monthlyNewPatientsRange !== "不明") {
    score += 2;
    positives.push("月間初診数レンジが入力されています（目的変数の目安）");
  } else {
    negatives.push("月間初診数レンジが未入力/不明です（MMMの目的変数に最重要）");
  }
  if (b.input.interestedInMMM) {
    score += 1;
    positives.push("Clinic Report Analytics（有料版）に関心をお持ちです");
  }
  if (b.input.bookingUrl || b.website?.hasBookingLink) {
    score += 1;
    positives.push("予約導線があり、コンバージョン地点が明確です");
  } else if (fetchFailed) {
    negatives.push("予約導線の有無はHP未取得のため評価できません（予約システムURLを追加すると評価できます）");
  } else {
    negatives.push("予約導線が不明確で、成果地点の特定が難しい可能性があります");
  }
  if (textIncludesAny(b.websiteText, BLOG_KEYWORDS)) {
    score += 1;
    positives.push("コラム/ブログがあり、コンテンツ施策日を説明変数化しやすい状態です");
  } else if (fetchFailed) {
    negatives.push("コラム/ブログの有無はHP未取得のため評価できません");
  } else {
    negatives.push("コラム/ブログが確認できず、コンテンツ施策の時系列化が難しい可能性があります");
  }
  if ((b.input.activeChannels?.length ?? 0) >= 2) {
    score += 1;
    positives.push("複数チャネルを運用しており、寄与分解の意義が大きい状態です");
  }

  return {
    score: clamp(score, 0, 10),
    maxScore: 10,
    label: "MMM準備度",
    explanation:
      "初診数MMM（マーケティング・ミックス・モデリング）を始めるためのデータ・チャネルの土台がどれだけ整っているかを評価します。",
    positives,
    negatives,
  };
}

// =========================================================
// 集計・グレード
// =========================================================
export function calculateOverallScore(scores: Scores): number {
  const total =
    scores.websiteConversion.score +
    scores.seoContent.score +
    scores.meoReadiness.score +
    scores.snsConnection.score +
    scores.medicalAdRisk.score +
    scores.mmmReadiness.score;
  return clamp(Math.round(total), 0, 100);
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
    label,
    explanation,
    positives: [],
    negatives: [FETCH_FAILED_NEGATIVE],
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
      "医療広告リスク",
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
/** 良好=達成率>=0.8、改善余地=達成率<0.6。医療広告リスクは別枠のため除外して評価。 */
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
  const list = keys.map((k) => scores[k]);
  const good = list.filter((s) => s.score / s.maxScore >= 0.8);
  const weak = list
    .filter((s) => s.score / s.maxScore < 0.6)
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);
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

  // MMM 準備への一手
  if (scores.mmmReadiness.score / scores.mmmReadiness.maxScore < 0.6) {
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
  return `特に「${weakest.label}」（${weakest.score}/${weakest.maxScore}）に伸びしろがあります。`;
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
  if (scores.seoContent.score < 18) {
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

  // 6) MMM のためのデータ整備
  if (scores.mmmReadiness.score < 7) {
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

  // スコアの低い領域に対応する fallback を優先的に前へ
  const ratio = (k: keyof Scores) => scores[k].score / scores[k].maxScore;
  const relatedRatio = (r: Recommendation) => (r.relatedScore ? ratio(r.relatedScore) : 1);
  return fbs.sort((a, c) => relatedRatio(a) - relatedRatio(c));
}

/** 「伸ばせる余地が大きい3点」= 達成率の低いカテゴリ由来の提案 */
export function generateGrowthOpportunities(scores: Scores, b: DiagnosticsBundle): Recommendation[] {
  const entries = (Object.entries(scores) as [keyof Scores, ScoreDetail][])
    .filter(([key]) => key !== "medicalAdRisk") // リスクは別枠で扱う
    .map(([key, s]) => ({ key, s, ratio: s.score / s.maxScore, gap: s.maxScore - s.score }))
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
    const ratio = s.score / s.maxScore;
    const severity: Finding["severity"] =
      ratio >= 0.75 ? "info" : ratio >= 0.5 ? "low" : ratio >= 0.3 ? "medium" : "high";
    if (s.negatives[0]) {
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

  const wcRatio = scores.websiteConversion.score / scores.websiteConversion.maxScore;
  const seoRatio = scores.seoContent.score / scores.seoContent.maxScore;
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
    hpComment = `トップページ上部にWeb予約または電話CTAが見当たりません。広告やSNSから流入しても、初診予約までの導線が弱くなっています。${seoHasRoom && cov.profile ? `あわせて症状別ページ${symptomHint}を増やすと、検索流入の受け皿になります。` : ""}`;
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
    status:
      w?.status === "failed"
        ? "unknown"
        : wcRatio >= 0.8 || hpScoreish >= 2
          ? "good"
          : hpScoreish === 1
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
    availableSignals,
    missingData,
    nextDataToCollect,
    paidPlanMessage,
  };
}
