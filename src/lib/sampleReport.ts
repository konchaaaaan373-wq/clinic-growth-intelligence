// =========================================================
// サンプル診断レポート
// APIキーや実URLがなくても /sample で表示できる架空データ。
// スコア内訳の合計は 62/100（14+15+9+8+8+8）。
// =========================================================

import type { AuditReport } from "./types";

export const SAMPLE_REPORT: AuditReport = {
  id: "sample-0001",
  createdAt: "2026-01-15T09:30:00.000Z",
  input: {
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
  },
  summary: {
    overallScore: 62,
    grade: "B",
    oneLineDiagnosis:
      "基本的な情報発信はできていますが、予約導線・症状別ページ・SNS接続に改善余地があります。",
    executiveSummary:
      "基本的な情報発信はできていますが、予約導線、症状別ページ、SNSからHPへの接続に改善余地があります。MMMを行うには、日別初診数と施策履歴の整備が次の一手です。特に「SNS集患接続」（8/15）に伸びしろがあります。なお本診断は外部から観測できる情報に基づく準備度評価であり、実際の初診CPAや初診寄与を断定するものではありません。",
  },
  scores: {
    websiteConversion: {
      score: 14,
      maxScore: 25,
      label: "HP集患導線",
      explanation:
        "初診の患者がHPから予約・来院へ進みやすいか（CTA・電話・予約・診療時間・アクセス・初診案内など）を評価します。",
      positives: [
        "tel: リンク（タップ発信）が設置されています",
        "診療時間の記載が確認できます",
        "アクセス情報の記載が確認できます",
        "スマートフォン向け viewport 設定があります",
      ],
      negatives: [
        "Web予約への導線が確認できませんでした",
        "初診案内ページ/初診の方向けの説明が見当たりません",
        "ファーストビュー付近に予約・電話・LINEなどの明確なCTAが弱い可能性があります",
      ],
    },
    seoContent: {
      score: 15,
      maxScore: 25,
      label: "SEO/医療コンテンツ",
      explanation:
        "検索から見つけられ、疾患・症状で悩む患者に届くコンテンツ設計になっているかを評価します。",
      positives: [
        "title タグが設定されています",
        "meta description が設定されています",
        "h1 見出しが設定されています",
        "診療内容に関する記載は一部確認できます",
        "ブログ/コラム/お知らせなどの継続的な情報発信が見られます",
      ],
      negatives: [
        "疾患別・症状別ページの拡充余地があります",
        "症状・疾患名を起点とした内部リンク導線が弱い可能性があります",
        "構造化データ（JSON-LD）が確認できませんでした",
      ],
    },
    meoReadiness: {
      score: 9,
      maxScore: 15,
      label: "MEO準備度",
      explanation:
        "Googleビジネスプロフィール（MEO）を活かす土台がHP側に整っているかを評価します。口コミ数・評価点・写真・カテゴリ設計は外部URLだけでは断定していません。",
      positives: [
        "GoogleマップURLが入力されています",
        "HP内に住所らしき記載があります",
        "HP内に電話番号らしき記載があります",
        "診療時間の記載があります",
      ],
      negatives: [
        "アクセス・駐車場情報が読み取りにくい可能性があります",
        "HP内からGoogleマップへのリンクが確認できませんでした",
      ],
    },
    snsConnection: {
      score: 8,
      maxScore: 15,
      label: "SNS集患接続",
      explanation:
        "SNSが存在し、HPや予約導線と相互に接続されているかを評価します。Instagram/TikTok は非公式取得を行いません。",
      positives: [
        "YouTube チャンネルURLが入力されています",
        "HP内からSNSへのリンクが確認できます",
      ],
      negatives: [
        "Instagram URLが未入力です",
        "TikTok URLが未入力です",
        "SNSからHP/予約へ戻す導線の整備余地があります（予約導線が未確認）",
      ],
    },
    medicalAdRisk: {
      score: 8,
      maxScore: 10,
      label: "医療広告リスク",
      explanation:
        "文脈によっては確認が望ましい表現を機械的に初期スクリーニングします。法的判断ではなく、単語検出のみで違反を断定しません。",
      positives: [],
      negatives: [
        "要確認の表現が 2 種類見つかりました（違反の断定ではありません）",
        "「最新」— 文脈により医療広告上の確認が望ましい可能性があります",
        "「痛くない」— 文脈により医療広告上の確認が望ましい可能性があります",
      ],
    },
    mmmReadiness: {
      score: 8,
      maxScore: 10,
      label: "MMM準備度",
      explanation:
        "初診数MMMを始めるためのデータ・チャネルの土台がどれだけ整っているかを評価します。",
      positives: [
        "HP URL があります",
        "GoogleマップURL があります",
        "SNS（YouTube）があります",
        "現在注力している施策が入力されています",
        "月間初診数レンジが入力されています（目的変数の目安）",
        "有料版MMMに関心をお持ちです",
        "コラム/ブログがあり、コンテンツ施策日を説明変数化しやすい状態です",
        "複数チャネルを運用しており、寄与分解の意義が大きい状態です",
      ],
      negatives: ["予約導線が不明確で、成果地点の特定が難しい可能性があります"],
    },
  },
  findings: [
    {
      id: "f-websiteConversion",
      category: "website",
      severity: "medium",
      title: "HP集患導線: 改善余地",
      detail: "Web予約への導線が確認できませんでした",
    },
    {
      id: "f-seoContent",
      category: "seo",
      severity: "medium",
      title: "SEO/医療コンテンツ: 改善余地",
      detail: "疾患別・症状別ページの拡充余地があります",
    },
    {
      id: "f-snsConnection",
      category: "sns",
      severity: "medium",
      title: "SNS集患接続: 改善余地",
      detail: "SNSからHP/予約へ戻す導線の整備余地があります",
    },
    {
      id: "f-meoReadiness",
      category: "meo",
      severity: "low",
      title: "MEO準備度: 改善余地",
      detail: "HP内からGoogleマップへのリンクが確認できませんでした",
    },
  ],
  quickWins: [
    {
      id: "qw-booking",
      title: "Web予約への導線を主要ページに追加する",
      detail:
        "Web予約ボタンをヘッダーやファーストビューに常設し、初診と再診で導線を分けると離脱を防げます。",
      impact: "high",
      effort: "medium",
      relatedScore: "websiteConversion",
    },
    {
      id: "qw-symptom",
      title: "代表的な症状・疾患ごとのページを整備する",
      detail:
        "腰痛・肩こり・スポーツ外傷など症状別ページを作り、内部リンクでつなぐと検索からの初診流入を増やせます。",
      impact: "high",
      effort: "high",
      relatedScore: "seoContent",
    },
    {
      id: "qw-sns-return",
      title: "YouTube/SNSからHP・予約へ戻す導線を設ける",
      detail:
        "動画概要欄やプロフィールに予約URLを掲載し、視聴・閲覧を来院に結びつけます。",
      impact: "medium",
      effort: "low",
      relatedScore: "snsConnection",
    },
  ],
  growthOpportunities: [
    {
      id: "growth-0",
      title: "SNSとHP/予約の相互接続を強化する",
      detail:
        "SNSからHPの症状ページ・予約へ戻す導線を作り、認知を来院に結びつけます。",
      impact: "high",
      effort: "medium",
      relatedScore: "snsConnection",
    },
    {
      id: "growth-1",
      title: "MEO（Googleビジネスプロフィール）活用の土台を整える",
      detail:
        "住所・電話・診療時間・写真・カテゴリ設計を整え、HPと情報を一致させることで近隣来院を伸ばせます。",
      impact: "high",
      effort: "medium",
      relatedScore: "meoReadiness",
    },
    {
      id: "growth-2",
      title: "HP集患導線を強化して初診の取りこぼしを減らす",
      detail:
        "予約・電話・LINEのCTA、初診案内、診療時間・アクセスの明確化により、来院への転換率を高められます。",
      impact: "high",
      effort: "medium",
      relatedScore: "websiteConversion",
    },
  ],
  channelComments: [
    {
      channel: "hp",
      channelLabel: "HP（自院サイト）",
      status: "partial",
      comment:
        "電話・スマホ対応は確認できますが、Web予約導線が弱い状態です。ファーストビューに予約CTAを常設し、初診案内ページを追加すると来院転換が高まります。",
    },
    {
      channel: "googleMap",
      channelLabel: "Googleマップ / MEO",
      status: "partial",
      comment:
        "GoogleマップURLは確認できました。口コミ数・評価点・写真・カテゴリ設計は外部URLだけでは断定できないため、GBPインサイトの連携が有効です。HPからの地図リンク追加も推奨します。",
    },
    {
      channel: "youtube",
      channelLabel: "YouTube",
      status: "partial",
      comment:
        "YouTube運用が確認できます。ただし動画から予約・HPへ戻す導線が弱く、視聴が来院に結びつきにくい状態です。概要欄への予約URL掲載と、症状解説→予約の設計を推奨します。",
    },
    {
      channel: "instagram",
      channelLabel: "Instagram",
      status: "unknown",
      comment:
        "Instagram URLは未入力です。整形外科ではリハビリ・セルフケア発信と相性が良い場合があります。運用状況に応じて検討してください。",
    },
    {
      channel: "tiktok",
      channelLabel: "TikTok",
      status: "unknown",
      comment: "TikTok URLは未入力です。現状の診療科・ターゲットでは優先度は高くありません。",
    },
    {
      channel: "lineBooking",
      channelLabel: "LINE / 予約導線",
      status: "weak",
      comment:
        "LINE・予約導線ともに確認できませんでした。まずはWeb予約導線の設置を優先し、次にLINE公式で再来院・リマインドを設計することを推奨します。",
    },
  ],
  medicalAdRiskFindings: [
    {
      id: "risk-1",
      expression: "最新",
      context: "…最新の治療機器を導入し…",
      note: "「最新」は文脈により、他院との比較優位を示唆する表現とみなされる可能性があります。事実に基づく客観的記載か確認をおすすめします（法的判断ではありません）。",
      where: "トップページ",
    },
    {
      id: "risk-2",
      expression: "痛くない",
      context: "…痛くない治療を心がけています…",
      note: "「痛くない」は効果・体感の保証と受け取られる可能性があります。表現の文脈によっては注意が必要です。最終確認は医療広告ガイドラインや専門家確認を前提にしてください。",
      where: "診療案内ページ",
    },
  ],
  mmmReadiness: {
    readinessScore: 8,
    availableSignals: [
      "HP URL",
      "GoogleマップURL",
      "YouTube URL",
      "注力施策: HP / SEO記事 / YouTube",
      "月間初診数レンジ: 51-100",
    ],
    missingData: [
      "日別初診数（レンジではなく日次の実数）",
      "診療日 / 休診日カレンダー",
      "Google広告費・クリック数・表示回数",
      "医療コラム / YouTube / SNS の投稿日・成果",
      "ポスティング実施日・部数・費用",
      "天気 / 祝日 / 季節性データ",
    ],
    nextDataToCollect: [
      "まずは日別初診数の記録を開始する（Excel/スプレッドシートで可）",
      "休診日と診療時間の変更履歴を残す",
      "広告費・投稿日を月次でまとめる",
    ],
    paidPlanMessage:
      "有料版では、日別初診数を目的変数、HP記事・広告・YouTube・SNS・ポスティング・MEO・休診日・曜日・祝日・天気などを説明変数として、施策別の初診寄与とおおよそのCPAを推定します。無料版では実データが揃っていないため、これらは算出せず「準備度」の評価にとどめています。",
  },
  rawDiagnostics: {
    website: {
      status: "success",
      fetchedUrls: [
        "https://example-seikei.example.com/",
        "https://example-seikei.example.com/access",
        "https://example-seikei.example.com/column",
      ],
      finalUrl: "https://example-seikei.example.com/",
      title: "サンプル整形外科クリニック｜世田谷区の整形外科・リハビリ",
      metaDescription:
        "世田谷区の整形外科。腰痛・肩こり・スポーツ外傷のリハビリに対応。診療時間・アクセスはこちら。",
      h1: ["サンプル整形外科クリニック"],
      h2: ["診療案内", "アクセス", "院長コラム"],
      hasViewport: true,
      hasTelLink: true,
      hasBookingLink: false,
      hasLineLink: false,
      hasJsonLd: false,
      hasSitemapHint: true,
      internalLinkCount: 12,
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
      detectedKeywords: ["診療時間", "アクセス", "コラム", "リハビリ", "痛み", "整形外科"],
      ctaKeywordPages: 2,
      pageCount: 3,
    },
    pagespeed: {
      status: "skipped",
      note: "PAGESPEED_API_KEY が未設定のため未取得（サンプル）。",
    },
    youtube: {
      status: "skipped",
      note: "YOUTUBE_API_KEY が未設定のため詳細未取得。URL入力は確認済み（サンプル）。",
    },
  },
  notices: [
    "本診断は外部から観測できる情報に基づく初期評価です。実際の初診CPA・初診寄与を断定するものではありません。",
    "医療広告リスクの検出は初期スクリーニングであり、法的判断ではありません。",
  ],
};
