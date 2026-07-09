// =========================================================
// サンプル診断レポート（営業資料としてそのまま提示できる品質）
//
// 架空の「サンプル整形外科クリニック」。
// 想定: HPあり／予約導線が弱い／症状別ページが少ない／
//       YouTubeはあるが予約につながっていない／GoogleマップURLあり／
//       LINE導線なし／医療広告リスクとして「最新」「痛くない」が要確認。
// スコア内訳合計 = 64/100（15+15+10+7+8+9）。「悪すぎないが改善余地が明確」。
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
    overallScore: 64,
    grade: "B",
    oneLineDiagnosis:
      "基本的な情報発信はできていますが、予約導線・症状別ページ・YouTubeからの予約接続に改善余地があります。",
    executiveSummary:
      "情報発信の土台はありますが、初診の受け皿となる「予約導線」と「症状別ページ」が弱く、流入を来院に変えきれていない状態です。特に、YouTubeを運用しているにもかかわらず予約・HPへの導線がなく、視聴が来院に結びついていません。MMMを行うには、日別初診数と施策履歴の整備が次の一手です。特に「SNS集患接続」（7/15）に伸びしろがあります。なお本診断は外部から観測できる情報に基づく準備度評価であり、実際の初診CPAや初診寄与を断定するものではありません。",
  },
  scores: {
    websiteConversion: {
      score: 15,
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
        "検索から見つけられ、疾患・症状で悩む患者に届くコンテンツ設計になっているかを、診療科（整形外科）に応じて評価します。",
      positives: [
        "title タグが設定されています",
        "meta description が設定されています",
        "h1 見出しが設定されています",
        "症状ページは一部確認できます（「腰痛」「肩こり」など）",
        "院長コラムなど継続的な情報発信が見られます",
      ],
      negatives: [
        "整形外科では「膝痛」「しびれ」「骨粗鬆症」など症状別ページが不足している可能性があります。地域名×症状の検索からの初診獲得では、診療科トップページだけでは弱くなりがちです",
        "症状・疾患名を起点とした内部リンク（例: 症状ページ→医師紹介→予約）の導線が弱い可能性があります",
        "構造化データ（JSON-LD）が確認できませんでした",
      ],
    },
    meoReadiness: {
      score: 10,
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
        "HP内からGoogleマップへのリンクが確認できませんでした",
        "アクセス・駐車場情報が読み取りにくい可能性があります",
      ],
    },
    snsConnection: {
      score: 7,
      maxScore: 15,
      label: "SNS集患接続",
      explanation:
        "SNSが存在し、HPや予約導線と相互に接続されているかを評価します。Instagram/TikTok は非公式取得を行いません。",
      positives: [
        "YouTube チャンネルURLが入力されています",
        "HP内からSNS（YouTube）へのリンクが確認できます",
      ],
      negatives: [
        "Instagram URLが未入力です",
        "TikTok URLが未入力です",
        "YouTubeからHP・予約へ戻す導線の整備余地があります（予約導線が未確認）",
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
      score: 9,
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
      id: "f-snsConnection",
      category: "sns",
      severity: "high",
      title: "SNS集患接続: 改善余地",
      detail: "YouTubeからHP・予約へ戻す導線の整備余地があります",
    },
    {
      id: "f-seoContent",
      category: "seo",
      severity: "medium",
      title: "SEO/医療コンテンツ: 改善余地",
      detail: "「膝痛」「しびれ」「骨粗鬆症」など症状別ページが不足している可能性があります",
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
    },
    {
      id: "qw-symptom",
      title: "整形外科の症状別ページ（「膝痛」「しびれ」「骨粗鬆症」など）を追加する",
      detail: "症状ごとの解説ページを作り、内部リンクで予約へつなぎます。",
      whyImportant:
        "「地域名 × 症状」で検索する初診患者は、診療科トップページよりも症状別ページに着地しやすく、症状ページが無いと検索からの初診流入を取りこぼします。",
      whatToFix:
        "「膝痛」「しびれ」「骨粗鬆症」など、貴院で対応可能な症状ごとに解説ページを作成し、各ページから医師紹介・予約へ内部リンクを張ってください。",
      expectedEffect:
        "指名検索以外（症状検索）からの初診流入を増やしやすくなります。実際の寄与度の測定には、Search Console と日別初診数の連携が必要です。",
      difficulty: "高",
      priority: "高",
      impact: "high",
      effort: "high",
      relatedScore: "seoContent",
    },
    {
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
    },
  ],
  growthOpportunities: [
    {
      id: "growth-0",
      title: "SNSとHP/予約の相互接続を強化する",
      detail:
        "YouTube・SNSからHPの症状ページ・予約へ戻す導線を作り、認知を来院に結びつけます。",
      impact: "high",
      effort: "medium",
      relatedScore: "snsConnection",
    },
    {
      id: "growth-1",
      title: "症状・疾患別コンテンツで検索流入を伸ばす",
      detail:
        "整形外科で検索されやすい「膝痛」「しびれ」「骨粗鬆症」などの症状ページとコラムを継続的に増やし、内部リンクで予約へつなぐことで、指名検索以外の初診流入を育てられます。",
      impact: "high",
      effort: "medium",
      relatedScore: "seoContent",
    },
    {
      id: "growth-2",
      title: "MEO（Googleビジネスプロフィール）活用の土台を整える",
      detail:
        "住所・電話・診療時間・写真・カテゴリ設計を整え、HPと情報を一致させ、HPから地図リンクを張ることで近隣来院を伸ばせます。",
      impact: "high",
      effort: "medium",
      relatedScore: "meoReadiness",
    },
  ],
  channelComments: [
    {
      channel: "hp",
      channelLabel: "HP（自院サイト）",
      status: "weak",
      comment:
        "トップページ上部にWeb予約または電話CTAが見当たりません。広告やSNSから流入しても、初診予約までの導線が弱くなっています。あわせて症状別ページ（「膝痛」「しびれ」「骨粗鬆症」など）を増やすと、検索流入の受け皿になります。",
    },
    {
      channel: "googleMap",
      channelLabel: "Googleマップ / MEO",
      status: "partial",
      comment:
        "GoogleマップURLは確認できましたが、HP（アクセスページ等）からGoogleマップへのリンクが見当たりません。地図リンクを設置し、GBPの診療時間・住所・電話をHPと一致させてください。口コミ数・評価点・写真の実態把握にはGBPインサイトの連携が有効です。",
    },
    {
      channel: "youtube",
      channelLabel: "YouTube",
      status: "partial",
      comment:
        "YouTubeアカウントは入力されていますが、HP・予約ページ・LINEへの導線が弱い可能性があります。動画視聴後の行動先（予約・症状ページ）を概要欄と終了画面で明確にしてください。",
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
        "LINE・予約導線ともに確認できませんでした。まずはWeb予約導線の設置を最優先で行い、次にLINE公式で予約リマインド・再来院を設計することを推奨します。",
    },
  ],
  medicalAdRiskFindings: [
    {
      id: "risk-最新",
      expression: "最新",
      context: "…最新の治療機器を導入し…",
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
      reason:
        "「痛くない」は効果・体感の保証と受け取られる可能性があります。個人差のある事項を断定する表現は文脈により注意が必要です。",
      recommendedAction:
        "「痛みに配慮した」「麻酔を用いる」など、個人差がある旨を含む表現への変更を検討してください。",
      where: "診療案内ページ",
    },
  ],
  mmmReadiness: {
    readinessScore: 9,
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
      detectedKeywords: ["診療時間", "アクセス", "コラム", "リハビリ", "腰痛", "整形外科"],
      ctaKeywordPages: 1,
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
