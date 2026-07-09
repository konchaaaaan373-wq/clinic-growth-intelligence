// =========================================================
// 共通型定義
// フロントエンド（src/**）と Netlify Functions（netlify/functions/**）
// の双方から参照します。副作用のない純粋な型のみを置いてください。
// =========================================================

/** 診断入力 */
export type AuditInput = {
  clinicName: string;
  websiteUrl: string;
  specialty: string;
  location: string;
  email?: string;
  googleMapsUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  lineUrl?: string;
  bookingUrl?: string;
  activeChannels?: string[];
  monthlyNewPatientsRange?: string;
  interestedInMMM?: boolean;
  consent: boolean;
  /** 診断の入口。トップページのURLのみ簡易診断 or 詳細フォーム */
  source?: "quick-url" | "detailed-form";
};

/** 各スコアカテゴリの詳細 */
export type ScoreDetail = {
  score: number;
  maxScore: number;
  label: string;
  explanation: string;
  positives: string[];
  negatives: string[];
};

/** 診断で検出した所見（良い点・課題点の両方を含む） */
export type Finding = {
  id: string;
  category:
    | "website"
    | "seo"
    | "meo"
    | "sns"
    | "medicalAdRisk"
    | "mmm"
    | "general";
  severity: "info" | "low" | "medium" | "high";
  title: string;
  detail: string;
};

/** 改善提案（quick win は営業に使えるよう構造化フィールドを持つ） */
export type Recommendation = {
  id: string;
  title: string;
  /** 概要（後方互換・成長提案などで使用） */
  detail: string;
  /** なぜ重要か */
  whyImportant?: string;
  /** 具体的に何を直すか */
  whatToFix?: string;
  /** 期待される効果（断定はしない） */
  expectedEffect?: string;
  /** 難易度 */
  difficulty?: "低" | "中" | "高";
  /** 優先度 */
  priority?: "高" | "中" | "低";
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  relatedScore?: keyof AuditReport["scores"];
};

/** チャネル別コメント */
export type ChannelComment = {
  channel:
    | "hp"
    | "googleMap"
    | "youtube"
    | "instagram"
    | "tiktok"
    | "lineBooking";
  channelLabel: string;
  status: "good" | "partial" | "weak" | "unknown";
  comment: string;
};

/** 医療広告リスクの所見（断定は禁止・要確認表現のみ） */
export type RiskFinding = {
  id: string;
  /** 要確認表現 */
  expression: string;
  /** 検出箇所の文脈スニペット */
  context: string;
  /** 注意理由（なぜ確認が望ましいか） */
  reason: string;
  /** 推奨対応 */
  recommendedAction: string;
  /** 検出されたページ種別など */
  where?: string;
};

/** MMM 準備度の詳細 */
export type MMMReadiness = {
  readinessScore: number;
  availableSignals: string[];
  missingData: string[];
  nextDataToCollect: string[];
  paidPlanMessage: string;
};

/** HP 解析の生データ */
export type WebsiteDiagnostics = {
  status: "success" | "partial" | "failed";
  fetchedUrls: string[];
  finalUrl?: string;
  title?: string;
  metaDescription?: string;
  h1: string[];
  h2: string[];
  hasViewport: boolean;
  hasTelLink: boolean;
  hasBookingLink: boolean;
  hasLineLink: boolean;
  hasJsonLd: boolean;
  hasSitemapHint: boolean;
  internalLinkCount: number;
  externalLinks: string[];
  snsLinks: {
    youtube: boolean;
    instagram: boolean;
    tiktok: boolean;
    line: boolean;
    facebook: boolean;
    x: boolean;
  };
  hasGoogleMapsLink: boolean;
  detectedKeywords: string[];
  ctaKeywordPages: number;
  pageCount: number;
  errorMessage?: string;
};

/** PageSpeed Insights の生データ */
export type PageSpeedDiagnostics = {
  status: "skipped" | "success" | "failed";
  strategy?: "mobile" | "desktop";
  categories?: {
    performance?: number | null;
    accessibility?: number | null;
    bestPractices?: number | null;
    seo?: number | null;
  };
  note?: string;
};

/** YouTube Data API の生データ */
export type YouTubeDiagnostics = {
  status: "skipped" | "success" | "failed";
  resolvedBy?: "channelId" | "handle" | "unresolved";
  channelTitle?: string;
  subscriberCount?: number | null;
  videoCount?: number | null;
  recentVideoTitles?: string[];
  medicalKeywordInTitles?: boolean;
  note?: string;
};

/** 全スコアのまとまり */
export type Scores = {
  websiteConversion: ScoreDetail;
  seoContent: ScoreDetail;
  meoReadiness: ScoreDetail;
  snsConnection: ScoreDetail;
  medicalAdRisk: ScoreDetail;
  mmmReadiness: ScoreDetail;
};

/** 診断レポート全体 */
export type AuditReport = {
  id: string;
  createdAt: string;
  input: AuditInput;
  summary: {
    overallScore: number;
    grade: "A" | "B" | "C" | "D";
    oneLineDiagnosis: string;
    executiveSummary: string;
  };
  scores: Scores;
  findings: Finding[];
  quickWins: Recommendation[];
  /** 伸ばせる余地が大きい領域の提案（達成率の低いカテゴリ由来） */
  growthOpportunities: Recommendation[];
  channelComments: ChannelComment[];
  medicalAdRiskFindings: RiskFinding[];
  mmmReadiness: MMMReadiness;
  rawDiagnostics: {
    website?: WebsiteDiagnostics;
    pagespeed?: PageSpeedDiagnostics;
    youtube?: YouTubeDiagnostics;
  };
  notices: string[];
};

/** analyze Function のレスポンス封筒 */
export type AnalyzeResponse =
  | { ok: true; report: AuditReport }
  | { ok: false; error: string };
