// =========================================================
// サンプル診断レポート（営業資料としてそのまま提示できる品質）
//
// 架空の「サンプル整形外科クリニック」。
// 想定: HPあり／予約導線が弱い／症状別コンテンツは一部のみ／
//       YouTubeはあるが予約につながっていない／GoogleマップURLあり／
//       LINE導線なし／医療広告リスクとして「最新」「痛くない」が要確認。
//
// スコア・文言はすべて本物のスコアリングエンジン（scoring.ts）で
// 合成診断データから計算する。手書きの数値を持たないため、
// ルール変更時もサンプルと実診断が乖離しない。
// =========================================================

import type {
  AuditInput,
  AuditReport,
  PageSpeedDiagnostics,
  RiskFinding,
  Scores,
  WebsiteDiagnostics,
  YouTubeDiagnostics,
} from "./types";
import {
  buildMMMReadiness,
  calculateMedicalAdRiskScore,
  calculateMeoReadinessScore,
  calculateMMMReadinessScore,
  calculateOverallScore,
  calculateSeoContentScore,
  calculateSnsConnectionScore,
  calculateWebsiteConversionScore,
  gradeFromScore,
  generateChannelComments,
  generateExecutiveSummary,
  generateFindings,
  generateGrowthOpportunities,
  generateOneLineDiagnosis,
  generateQualitativeReview,
  generateQuickWins,
  type DiagnosticsBundle,
} from "./scoring";

const input: AuditInput = {
  clinicName: "サンプル整形外科クリニック",
  websiteUrl: "https://example-seikei.example.com",
  specialty: "整形外科",
  location: "東京都・世田谷区",
  email: "",
  googleMapsUrl: "https://maps.google.com/?q=sample-seikei",
  youtubeUrl: "https://www.youtube.com/@sample-seikei",
  instagramUrl: "",
  tiktokUrl: "",
  lineUrl: "",
  bookingUrl: "",
  activeChannels: ["HP", "SEO記事", "YouTube"],
  monthlyNewPatientsRange: "51-100",
  interestedInMMM: true,
  consent: true,
  source: "detailed-form",
};

// HPから抽出された想定の本文テキスト（キーワード判定に使う合成データ）
const websiteText = [
  "サンプル整形外科クリニック 世田谷区の整形外科・リハビリテーション科",
  "診療時間 9:00-12:30 / 15:00-18:30 受付時間は診療終了の15分前まで 休診日 日曜・祝日",
  "アクセス 〒154-0000 東京都世田谷区サンプル1丁目2-3 経堂駅から徒歩5分 駐車場3台あり",
  "お電話でのご予約・お問い合わせ 03-1234-5678",
  "診療案内 腰痛 ぎっくり腰 肩こり 五十肩 リハビリテーション 骨折 打撲 スポーツによるケガの診療を行っています",
  "院長コラム 腰痛の原因と自宅でできる対処法 肩こりとストレッチの正しい知識 デスクワークと姿勢の話",
  "当院では最新の治療機器を導入し 痛くない治療を心がけています",
  "地域のかかりつけ医として 丁寧な説明を大切にしています",
].join(" ");

const website: WebsiteDiagnostics = {
  status: "success",
  fetchedUrls: [
    "https://example-seikei.example.com/",
    "https://example-seikei.example.com/access",
    "https://example-seikei.example.com/column",
  ],
  finalUrl: "https://example-seikei.example.com/",
  title: "サンプル整形外科クリニック｜世田谷区の整形外科・リハビリ",
  metaDescription:
    "世田谷区の整形外科。腰痛・肩こりのリハビリに対応。診療時間・アクセスはこちら。",
  h1: ["サンプル整形外科クリニック"],
  h2: ["診療案内", "アクセス", "院長コラム"],
  hasViewport: true,
  hasTelLink: true,
  hasBookingLink: false,
  hasLineLink: false,
  hasJsonLd: false,
  hasSitemapHint: true,
  internalLinkCount: 11,
  externalLinks: ["https://www.youtube.com/@sample-seikei"],
  snsLinks: {
    youtube: true,
    instagram: false,
    tiktok: false,
    line: false,
    facebook: false,
    x: false,
  },
  hasGoogleMapsLink: false,
  detectedKeywords: ["診療時間", "アクセス", "駐車場", "コラム", "リハビリ", "腰痛", "症状"],
  ctaKeywordPages: 1,
  pageCount: 3,
  textLength: websiteText.replace(/\s+/g, "").length,
};

const pagespeed: PageSpeedDiagnostics = {
  status: "skipped",
  note: "PAGESPEED_API_KEY が未設定のため未取得（サンプル）。",
};

const youtube: YouTubeDiagnostics = {
  status: "skipped",
  note: "YOUTUBE_API_KEY が未設定のため詳細未取得。URL入力は確認済み（サンプル）。",
};

const riskFindings: RiskFinding[] = [
  {
    id: "risk-最新",
    expression: "最新",
    context: "…最新の治療機器を導入し…",
    severity: "medium",
    reason:
      "医療広告では、比較優良・誇大に見える表現は文脈によって注意が必要です。「最新」は他院との比較優位を示唆する表現とみなされる場合があります。",
    recommendedAction:
      "客観的根拠の明示、導入時期・機器名などの具体的説明、または別表現への変更を検討してください。",
    where: "トップページ",
  },
  {
    id: "risk-痛くない",
    expression: "痛くない",
    context: "…痛くない治療を心がけています…",
    severity: "medium",
    reason:
      "「痛くない」は効果・体感の保証と受け取られる可能性があります。個人差のある事項を断定する表現は文脈により注意が必要です。",
    recommendedAction:
      "「痛みに配慮した」「麻酔を用いる」など、個人差がある旨を含む表現への変更を検討してください。",
    where: "診療案内ページ",
  },
];

const bundle: DiagnosticsBundle = {
  input,
  website,
  pagespeed,
  youtube,
  websiteText: websiteText.toLowerCase(),
};

const scores: Scores = {
  websiteConversion: calculateWebsiteConversionScore(bundle),
  seoContent: calculateSeoContentScore(bundle),
  meoReadiness: calculateMeoReadinessScore(bundle),
  snsConnection: calculateSnsConnectionScore(bundle),
  medicalAdRisk: calculateMedicalAdRiskScore(riskFindings, { textAvailable: true }),
  mmmReadiness: calculateMMMReadinessScore(bundle),
};

const overallScore = calculateOverallScore(scores);
const grade = overallScore === null ? null : gradeFromScore(overallScore);

export const SAMPLE_REPORT: AuditReport = {
  id: "sample-0001",
  createdAt: "2026-01-15T09:30:00.000Z",
  input,
  summary: {
    overallScore,
    grade,
    oneLineDiagnosis: generateOneLineDiagnosis(overallScore ?? 0, scores),
    executiveSummary: generateExecutiveSummary(overallScore ?? 0, scores, bundle),
    siteFetchFailed: false,
  },
  scores,
  qualitative: generateQualitativeReview(scores, bundle),
  findings: generateFindings(scores, bundle),
  quickWins: generateQuickWins(scores, bundle),
  growthOpportunities: generateGrowthOpportunities(scores, bundle),
  channelComments: generateChannelComments(bundle, scores),
  medicalAdRiskFindings: riskFindings,
  mmmReadiness: buildMMMReadiness(bundle, scores.mmmReadiness),
  rawDiagnostics: {
    website,
    pagespeed,
    youtube,
  },
  notices: [
    "本診断は外部から観測できる情報に基づく初期評価です。実際の初診CPA・初診寄与を断定するものではありません。",
    "医療広告に関する検出は初期スクリーニングであり、法的判断ではありません。",
    "このレポートはサンプル（合成データ）です。",
  ],
};
