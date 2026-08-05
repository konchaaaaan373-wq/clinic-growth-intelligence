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
  /** カテゴリの設計上の満点（総合スコアの重みとしても使う） */
  maxScore: number;
  /**
   * 実際に評価できた項目の合計点（達成率の分母）。
   * 未入力・取得不能などで評価できなかった項目は、減点せずここから除外する。
   * 省略時は maxScore と同じとみなす（後方互換）。
   */
  evaluableMaxScore?: number;
  label: string;
  explanation: string;
  positives: string[];
  negatives: string[];
  /**
   * 評価対象から除外した項目（未入力・取得不能など）。
   * 「弱い」のではなく「外からは分からない」項目。減点しない。
   */
  unknowns?: string[];
  /**
   * このカテゴリを評価できたか。
   * "scored"（既定）= 通常評価 / "not_evaluable" = 取得失敗等で評価不能（スコアは参考外）。
   * 省略時は "scored" とみなす。
   */
  status?: "scored" | "not_evaluable";
};

/** 集患スタイル診断（点数とは独立した、質的なタイプ分け） */
export type ClinicStyleType = {
  /** タイプを象徴する絵文字（例: 🏆 🌱 📚） */
  emoji: string;
  /** タイプ名（例: 「コツコツ発信型」） */
  name: string;
  /** ひとことキャッチ */
  tagline: string;
  /** タイプの説明（強み・らしさを含む） */
  description: string;
  /** このタイプの「次の一手」（行動につながる一文。CTAの根拠になる） */
  nextStep?: string;
};

/** 質的評価（数値スコアと独立した講評） */
export type QualitativeReview = {
  style: ClinicStyleType;
  /** 数値に依らない良いところ */
  strengths: string[];
  /** もったいないポイント（伸びしろ） */
  opportunities: string[];
  /** 質的な総評（点数がすべてではない旨を含む） */
  narrative: string;
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
  /** 改善の狙い（定性表現のみ・数値予測や断定はしない） */
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
  /** 文脈を踏まえた確認優先度（low=文脈確認 / medium=要確認 / high=優先確認）。法的リスクの評価ではない */
  severity: "low" | "medium" | "high";
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
  /** 評価できた項目の合計点（達成率の分母）。省略時は 10 */
  readinessMaxScore?: number;
  /** 全項目が未評価（URLのみ診断等）でスコアを出せないか */
  notEvaluable?: boolean;
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
  /** 抽出できた本文テキストの総文字数。極端に少ない場合はJS描画サイトの可能性 */
  textLength?: number;
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
    /** 取得失敗時は null（総合スコアを出さない = 評価不能） */
    overallScore: number | null;
    /** 取得失敗時は null（ランクを出さない = 評価不能） */
    grade: "A" | "B" | "C" | "D" | null;
    oneLineDiagnosis: string;
    executiveSummary: string;
    /** 対象サイトの取得に失敗し、サイト内部評価ができなかったか */
    siteFetchFailed: boolean;
  };
  scores: Scores;
  /** 集患スタイル診断＋質的講評（取得失敗時は省略） */
  qualitative?: QualitativeReview;
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
