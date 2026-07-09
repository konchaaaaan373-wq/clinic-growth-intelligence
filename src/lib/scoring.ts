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

  if (textIncludesAny(text, SYMPTOM_LINK_KEYWORDS) && (w?.internalLinkCount ?? 0) >= 5) {
    score += 4;
    positives.push("症状・疾患名を含む内部リンク導線が見られます");
  } else {
    negatives.push("症状・疾患名を起点とした内部リンク導線が弱い可能性があります");
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
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 0;

  if (b.input.youtubeUrl) {
    score += 3;
    positives.push("YouTube チャンネルURLが入力されています");
  } else {
    negatives.push("YouTube チャンネルURLが未入力です");
  }

  if (b.input.instagramUrl) {
    score += 2;
    positives.push("Instagram URLが入力されています");
  } else {
    negatives.push("Instagram URLが未入力です");
  }

  if (b.input.tiktokUrl) {
    score += 2;
    positives.push("TikTok URLが入力されています");
  } else {
    negatives.push("TikTok URLが未入力です");
  }

  if (b.input.lineUrl || w?.hasLineLink) {
    score += 2;
    positives.push("LINE公式アカウントへの導線が確認できます");
  } else {
    negatives.push("LINE公式アカウントへの導線が確認できませんでした");
  }

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
  } else {
    negatives.push("HP内からSNSへのリンクが確認できませんでした");
  }

  // SNSからHP/予約へ戻す導線は外部からは断定できないため、
  // HP側に予約導線があり、かつSNSが存在する場合に「戻せる素地あり」として加点。
  const hasReturnPath =
    (w?.hasBookingLink || !!b.input.bookingUrl) &&
    (!!b.input.youtubeUrl || !!b.input.instagramUrl || !!b.input.tiktokUrl);
  if (hasReturnPath) {
    score += 2;
    positives.push("SNSからHP/予約へ戻す導線を作れる素地があります（予約導線が存在）");
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

  // 検出ごとに1点減点（下限0点）。1表現あたり複数箇所でも1減点に丸める。
  const uniqueExpressions = new Set(riskFindings.map((f) => f.expression));
  const deduction = Math.min(10, uniqueExpressions.size);
  const score = clamp(10 - deduction, 0, 10);

  if (uniqueExpressions.size === 0) {
    positives.push("初期スクリーニングでは、注意が必要な表現は検出されませんでした");
  } else {
    negatives.push(
      `要確認の表現が ${uniqueExpressions.size} 種類見つかりました（違反の断定ではありません）`,
    );
    for (const exp of uniqueExpressions) {
      negatives.push(`「${exp}」— 文脈により医療広告上の確認が望ましい可能性があります`);
    }
  }

  return {
    score,
    maxScore: 10,
    label: "医療広告リスク",
    explanation:
      "医療広告ガイドライン上、文脈によっては確認が望ましい表現を機械的に初期スクリーニングします。これは法的判断ではなく、単語検出のみを根拠に違反を断定するものではありません。最終確認は専門家・ガイドラインを前提としてください。",
    positives,
    negatives,
  };
}

// =========================================================
// 6. MMM準備度スコア（10点）
// =========================================================
export function calculateMMMReadinessScore(b: DiagnosticsBundle): ScoreDetail {
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
    positives.push("有料版MMMに関心をお持ちです");
  }
  if (b.input.bookingUrl || b.website?.hasBookingLink) {
    score += 1;
    positives.push("予約導線があり、コンバージョン地点が明確です");
  } else {
    negatives.push("予約導線が不明確で、成果地点の特定が難しい可能性があります");
  }
  if (textIncludesAny(b.websiteText, BLOG_KEYWORDS)) {
    score += 1;
    positives.push("コラム/ブログがあり、コンテンツ施策日を説明変数化しやすい状態です");
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
// 文章生成
// =========================================================
export function generateOneLineDiagnosis(overall: number): string {
  if (overall >= 80) {
    return "外部から見える集患導線は比較的整っています。次は実データ連携で初診寄与の測定へ進む段階です。";
  }
  if (overall >= 60) {
    return "基本的な情報発信はできていますが、予約導線・症状別ページ・SNS接続に改善余地があります。";
  }
  if (overall >= 40) {
    return "一部の情報発信はありますが、初診獲得の導線が分断されています。まず基本導線の整備を優先しましょう。";
  }
  return "外部から見る限り、集患導線と情報設計が不足しています。広告出稿の前に土台の整備を推奨します。";
}

export function generateExecutiveSummary(overall: number, scores: Scores): string {
  const base = (() => {
    if (overall >= 80) {
      return "外部から見える集患導線は比較的整っています。次の段階では、日別初診数と施策データをつなぎ、実際の初診寄与を測定できる状態に近づいています。";
    }
    if (overall >= 60) {
      return "基本的な情報発信はできていますが、予約導線、症状別ページ、SNSからHPへの接続に改善余地があります。MMMを行うには、日別初診数と施策履歴の整備が次の一手です。";
    }
    if (overall >= 40) {
      return "HPやSNSの一部は存在しますが、初診獲得に向けた導線が分断されています。まずは予約導線、初診案内、症状別ページの整備を優先してください。";
    }
    return "外部から見る限り、集患導線と情報設計が不足しています。広告出稿の前に、HPの基本導線と診療内容ページを整えることを推奨します。";
  })();

  // 最も弱い領域を1つ添える
  const weakest = weakestCategory(scores);
  const tail = weakest
    ? ` 特に「${weakest.label}」（${weakest.score}/${weakest.maxScore}）に伸びしろがあります。`
    : "";

  return base + tail +
    " なお本診断は外部から観測できる情報に基づく準備度評価であり、実際の初診CPAや初診寄与を断定するものではありません。";
}

function weakestCategory(scores: Scores): ScoreDetail | null {
  const list = Object.values(scores) as ScoreDetail[];
  // 医療広告リスクは「低リスク=高得点」のため達成率で比較
  let weakest: ScoreDetail | null = null;
  let weakestRatio = Infinity;
  for (const s of list) {
    const ratio = s.score / s.maxScore;
    if (ratio < weakestRatio) {
      weakestRatio = ratio;
      weakest = s;
    }
  }
  return weakest;
}

// =========================================================
// クイックウィン（今すぐ直すべき）と findings
// =========================================================
export function generateQuickWins(scores: Scores, b: DiagnosticsBundle): Recommendation[] {
  const recs: Recommendation[] = [];
  const w = b.website;

  if (!w?.hasTelLink) {
    recs.push({
      id: "qw-tel",
      title: "スマホ発信できる tel: リンクを設置する",
      detail:
        "電話番号を tel: リンク化し、ファーストビュー付近に固定配置すると、スマホからの初診電話につながりやすくなります。",
      impact: "high",
      effort: "low",
      relatedScore: "websiteConversion",
    });
  }
  if (!(w?.hasBookingLink || b.input.bookingUrl)) {
    recs.push({
      id: "qw-booking",
      title: "Web予約への導線を主要ページに追加する",
      detail:
        "Web予約ボタンをヘッダーやファーストビューに常設し、初診と再診で導線を分けると離脱を防げます。",
      impact: "high",
      effort: "medium",
      relatedScore: "websiteConversion",
    });
  }
  if (scores.seoContent.score < 15) {
    recs.push({
      id: "qw-symptom",
      title: "代表的な症状・疾患ごとのページを整備する",
      detail:
        "診療科の主要な症状・疾患ごとにページを作り、内部リンクでつなぐと、検索からの初診流入を増やしやすくなります。",
      impact: "high",
      effort: "high",
      relatedScore: "seoContent",
    });
  }
  if (!b.input.googleMapsUrl) {
    recs.push({
      id: "qw-gbp",
      title: "GoogleビジネスプロフィールのURLを整備・掲載する",
      detail:
        "GBPを整備し、HPからも地図リンクを設置すると、近隣からの来院（MEO）につながりやすくなります。",
      impact: "medium",
      effort: "low",
      relatedScore: "meoReadiness",
    });
  }
  if (scores.snsConnection.score < 8) {
    recs.push({
      id: "qw-sns-return",
      title: "SNSプロフィールからHP/予約へ戻す導線を設ける",
      detail:
        "各SNSのプロフィール欄に予約URLを掲載し、投稿からHPの症状ページへ誘導すると、認知を来院につなげやすくなります。",
      impact: "medium",
      effort: "low",
      relatedScore: "snsConnection",
    });
  }
  if (scores.mmmReadiness.score < 6) {
    recs.push({
      id: "qw-mmm-data",
      title: "日別初診数の記録を今日から始める",
      detail:
        "日別初診数（と休診日）の記録を始めると、将来のMMMで施策別の初診寄与を推定できるようになります。",
      impact: "high",
      effort: "low",
      relatedScore: "mmmReadiness",
    });
  }

  // 上位3件に絞る（impact 高 > effort 低 を優先）
  const rank = (r: Recommendation) =>
    (r.impact === "high" ? 0 : r.impact === "medium" ? 1 : 2) +
    (r.effort === "low" ? 0 : r.effort === "medium" ? 0.3 : 0.6);
  return recs.sort((a, c) => rank(a) - rank(c)).slice(0, 3);
}

/** 「伸ばせる余地が大きい3点」= 達成率の低いカテゴリ由来の提案 */
export function generateGrowthOpportunities(scores: Scores): Recommendation[] {
  const entries = (Object.entries(scores) as [keyof Scores, ScoreDetail][])
    .filter(([key]) => key !== "medicalAdRisk") // リスクは別枠で扱う
    .map(([key, s]) => ({ key, s, ratio: s.score / s.maxScore, gap: s.maxScore - s.score }))
    .sort((a, c) => a.ratio - c.ratio)
    .slice(0, 3);

  const templates: Record<string, { title: string; detail: string }> = {
    websiteConversion: {
      title: "HP集患導線を強化して初診の取りこぼしを減らす",
      detail:
        "予約・電話・LINEのCTA、初診案内、診療時間・アクセスの明確化により、来院への転換率を高められます。",
    },
    seoContent: {
      title: "症状・疾患別コンテンツで検索流入を伸ばす",
      detail:
        "疾患ページとコラムを継続的に増やし、内部リンクで導線を作ることで、指名検索以外の初診流入を育てられます。",
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
export function generateChannelComments(b: DiagnosticsBundle): ChannelComment[] {
  const w = b.website;
  const comments: ChannelComment[] = [];

  // HP
  const hpScoreish =
    (w?.hasTelLink ? 1 : 0) + (w?.hasBookingLink || b.input.bookingUrl ? 1 : 0) + (w?.hasViewport ? 1 : 0);
  comments.push({
    channel: "hp",
    channelLabel: "HP（自院サイト）",
    status: w?.status === "failed" ? "unknown" : hpScoreish >= 2 ? "good" : hpScoreish === 1 ? "partial" : "weak",
    comment:
      w?.status === "failed"
        ? "HPの取得に失敗したため詳細評価はできませんでしたが、予約・電話・スマホ最適化の3点は最低限の集患導線として重要です。"
        : hpScoreish >= 2
          ? "予約・電話・スマホ対応など基本的な集患導線が確認できます。初診案内と症状別ページを足すとさらに強くなります。"
          : "予約導線や電話導線に改善余地があります。ファーストビューに予約・電話CTAを常設することを推奨します。",
  });

  // Googleマップ/MEO
  comments.push({
    channel: "googleMap",
    channelLabel: "Googleマップ / MEO",
    status: b.input.googleMapsUrl ? (w?.hasGoogleMapsLink ? "good" : "partial") : "weak",
    comment: b.input.googleMapsUrl
      ? "GoogleマップURLの入力を確認しました。口コミ数・評価点・写真・カテゴリ設計は外部URLだけでは断定できないため、GBPインサイトの連携が有効です。"
      : "GoogleビジネスプロフィールのURLが未入力です。近隣からの来院にはMEOが重要なため、整備と掲載を推奨します。",
  });

  // YouTube
  const yt = b.youtube;
  comments.push({
    channel: "youtube",
    channelLabel: "YouTube",
    status: b.input.youtubeUrl ? (yt?.status === "success" ? "good" : "partial") : "unknown",
    comment: b.input.youtubeUrl
      ? yt?.status === "success"
        ? `チャンネル「${yt.channelTitle ?? "取得済み"}」を確認しました。動画からHP/予約へ戻す導線があるかを点検すると、視聴を来院に結びつけやすくなります。`
        : "YouTube URLの入力を確認しました（API詳細取得は未実施/失敗）。動画概要欄に予約URLを掲載し、HPへ戻す導線を作ると効果的です。"
      : "YouTube URLは未入力です。運用がある場合は、症状解説動画から予約へ戻す導線設計が有効です。",
  });

  // Instagram
  comments.push({
    channel: "instagram",
    channelLabel: "Instagram",
    status: b.input.instagramUrl ? "partial" : "unknown",
    comment: b.input.instagramUrl
      ? "Instagram URLの入力を確認しました（非公式な内容取得は行いません）。プロフィールに予約リンクを置き、HPの症状ページへ誘導する導線が有効です。"
      : "Instagram URLは未入力です。地域・診療科によっては認知拡大に有効なため、運用状況に応じて検討してください。",
  });

  // TikTok
  comments.push({
    channel: "tiktok",
    channelLabel: "TikTok",
    status: b.input.tiktokUrl ? "partial" : "unknown",
    comment: b.input.tiktokUrl
      ? "TikTok URLの入力を確認しました（非公式な内容取得は行いません）。プロフィールからHP/予約へ戻す導線があるかを点検してください。"
      : "TikTok URLは未入力です。若年層向けの診療科では認知獲得に活用余地があります。",
  });

  // LINE / 予約導線
  const hasLine = !!b.input.lineUrl || !!w?.hasLineLink;
  const hasBooking = !!b.input.bookingUrl || !!w?.hasBookingLink;
  comments.push({
    channel: "lineBooking",
    channelLabel: "LINE / 予約導線",
    status: hasLine && hasBooking ? "good" : hasLine || hasBooking ? "partial" : "weak",
    comment:
      hasLine && hasBooking
        ? "LINEと予約導線の両方が確認できます。友だち追加後のリマインドや再来院導線まで設計すると継続来院につながります。"
        : hasLine
          ? "LINE導線は確認できました。Web予約への接続を追加すると、初診予約の取りこぼしを減らせます。"
          : hasBooking
            ? "予約導線は確認できました。LINE公式アカウントを加えると、再来院・キャンセル対策に活用できます。"
            : "LINE・予約導線ともに確認できませんでした。まずはWeb予約導線の設置を優先することを推奨します。",
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
    "有料版では、日別初診数を目的変数、HP記事・広告・YouTube・SNS・ポスティング・MEO・休診日・曜日・祝日・天気などを説明変数として、施策別の初診寄与とおおよそのCPAを推定します。無料版では実データが揃っていないため、これらは算出せず「準備度」の評価にとどめています。";

  return {
    readinessScore: mmmScore.score,
    availableSignals,
    missingData,
    nextDataToCollect,
    paidPlanMessage,
  };
}
