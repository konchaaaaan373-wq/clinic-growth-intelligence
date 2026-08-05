// =========================================================
// スコアリングエンジンのテスト
//
// 検証する設計原則:
//  1. 配点の整合性（全項目達成で満点）
//  2. 達成率方式（未入力・取得不能は減点せず分母から除外）
//  3. 重複計上の禁止（1つの事実は1カテゴリのみに影響）
//  4. 本文薄すぎガード（JS描画サイトを「弱い」と誤評価しない）
//  5. 総合スコアの再正規化とグレード境界
// =========================================================

import { describe, expect, it } from "vitest";
import type { AuditInput, ScoreDetail, Scores, WebsiteDiagnostics } from "../types";
import {
  calculateMedicalAdRiskScore,
  calculateMeoReadinessScore,
  calculateMMMReadinessScore,
  calculateOverallScore,
  calculateSeoContentScore,
  calculateSnsConnectionScore,
  calculateWebsiteConversionScore,
  effectiveRatio,
  generateChannelComments,
  generateQualitativeReview,
  generateQuickWins,
  gradeFromScore,
  isTextThin,
  type DiagnosticsBundle,
} from "../scoring";
import { SAMPLE_REPORT } from "../sampleReport";

// ---------------------------------------------------------
// テスト用ビルダー
// ---------------------------------------------------------

function makeInput(overrides: Partial<AuditInput> = {}): AuditInput {
  return {
    clinicName: "テストクリニック",
    websiteUrl: "https://example.com",
    specialty: "内科",
    location: "東京都",
    consent: true,
    source: "detailed-form",
    ...overrides,
  };
}

function makeWebsite(overrides: Partial<WebsiteDiagnostics> = {}): WebsiteDiagnostics {
  return {
    status: "success",
    fetchedUrls: ["https://example.com/", "https://example.com/access"],
    h1: ["テストクリニック"],
    h2: ["診療案内"],
    hasViewport: true,
    hasTelLink: true,
    hasBookingLink: true,
    hasLineLink: true,
    hasJsonLd: true,
    hasSitemapHint: true,
    internalLinkCount: 12,
    externalLinks: [],
    snsLinks: {
      youtube: true,
      instagram: true,
      tiktok: true,
      line: true,
      facebook: false,
      x: false,
    },
    hasGoogleMapsLink: true,
    detectedKeywords: [],
    ctaKeywordPages: 3,
    pageCount: 4,
    title: "テストクリニック｜東京都の内科",
    metaDescription: "東京都の内科クリニック。発熱・生活習慣病の診療を行っています。",
    ...overrides,
  };
}

// 内科プロファイルの症状語を4つ以上含む、十分な長さ（300文字以上）の本文。
// 注意: 重複計上テストで置換するキーワード（診療時間・受付時間・休診・コラム・ブログ）
// 以外の同義キーワード（診療日・news・column 等）を含めないこと。
const RICH_TEXT = [
  "テストクリニックは地域のかかりつけ医として内科診療を行っています",
  "診療時間 9:00-13:00 15:00-18:00 受付時間は終了15分前まで 休診となる曜日は日曜と祝日です",
  "アクセス 〒100-0001 東京都千代田区テスト1丁目2-3 住所はこちら テスト駅から徒歩3分 駐車場を3台分ご用意しています",
  "初めての方へ 初診の方は保険証をお持ちのうえ お時間に余裕をもってお越しください",
  "発熱 咳 腹痛 高血圧 糖尿病 脂質異常症 生活習慣病の診療と健康診断 予防接種に対応しています",
  "院長コラム 健康に関する情報を定期的に発信しています ブログでは生活習慣の改善についても解説しています",
  "かぜの症状や からだの不調を感じたら 早めの受診をおすすめします",
  "お問い合わせ ご予約はお電話または受付にてお願いいたします",
].join(" ").toLowerCase();

function makeBundle(overrides: Partial<DiagnosticsBundle> = {}): DiagnosticsBundle {
  return {
    input: makeInput(),
    website: makeWebsite(),
    websiteText: RICH_TEXT,
    ...overrides,
  };
}

/** 全項目達成の理想バンドル（入力も完備） */
function perfectBundle(): DiagnosticsBundle {
  return makeBundle({
    input: makeInput({
      googleMapsUrl: "https://maps.google.com/?q=test",
      youtubeUrl: "https://youtube.com/@test",
      instagramUrl: "https://instagram.com/test",
      tiktokUrl: "https://tiktok.com/@test",
      lineUrl: "https://lin.ee/test",
      bookingUrl: "https://booking.example.com",
      activeChannels: ["HP", "YouTube"],
      monthlyNewPatientsRange: "51-100",
    }),
    youtube: { status: "success", videoCount: 10 },
  });
}

function makeDetail(
  score: number,
  maxScore: number,
  evaluableMaxScore: number,
  status: "scored" | "not_evaluable" = "scored",
): ScoreDetail {
  return {
    score,
    maxScore,
    evaluableMaxScore,
    label: "t",
    explanation: "t",
    positives: [],
    negatives: [],
    status,
  };
}

// ---------------------------------------------------------
// 1. 配点の整合性
// ---------------------------------------------------------

describe("配点の整合性（全項目達成で満点）", () => {
  const b = perfectBundle();

  it("HP集患導線: 25点満点", () => {
    const d = calculateWebsiteConversionScore(b);
    expect(d.score).toBe(25);
    expect(d.evaluableMaxScore).toBe(25);
    expect(d.negatives).toHaveLength(0);
  });

  it("SEO/医療コンテンツ: 25点満点", () => {
    const d = calculateSeoContentScore(b);
    expect(d.score).toBe(25);
    expect(d.evaluableMaxScore).toBe(25);
  });

  it("MEO準備度: 15点満点", () => {
    const d = calculateMeoReadinessScore(b);
    expect(d.score).toBe(15);
    expect(d.evaluableMaxScore).toBe(15);
  });

  it("SNS集患接続: 15点満点", () => {
    const d = calculateSnsConnectionScore(b);
    expect(d.score).toBe(15);
    expect(d.evaluableMaxScore).toBe(15);
  });

  it("MMM準備度: 10点満点", () => {
    const d = calculateMMMReadinessScore(b);
    expect(d.score).toBe(10);
    expect(d.evaluableMaxScore).toBe(10);
  });

  it("医療広告: 検出ゼロで10点満点", () => {
    const d = calculateMedicalAdRiskScore([], { textAvailable: true });
    expect(d.score).toBe(10);
  });

  it("総合スコア: 全カテゴリ満点で100点・グレードA", () => {
    const scores: Scores = {
      websiteConversion: calculateWebsiteConversionScore(b),
      seoContent: calculateSeoContentScore(b),
      meoReadiness: calculateMeoReadinessScore(b),
      snsConnection: calculateSnsConnectionScore(b),
      medicalAdRisk: calculateMedicalAdRiskScore([], { textAvailable: true }),
      mmmReadiness: calculateMMMReadinessScore(b),
    };
    const overall = calculateOverallScore(scores);
    expect(overall).toBe(100);
    expect(gradeFromScore(overall!)).toBe("A");
  });
});

// ---------------------------------------------------------
// 2. 達成率方式（unknown ≠ weak）
// ---------------------------------------------------------

describe("達成率方式: 未入力は減点せず分母から除外する", () => {
  it("URLのみ診断でも、サイトが完璧なら総合スコアはAに到達できる", () => {
    // SNS・GBP・初診数などが未入力でも、未評価扱いなら総合を押し下げない
    const b = makeBundle({
      input: makeInput({ source: "quick-url", specialty: "未指定", location: "未指定" }),
      website: makeWebsite({
        // HPからSNSは検出されない想定（未運用か判別できない）
        snsLinks: {
          youtube: false,
          instagram: false,
          tiktok: false,
          line: false,
          facebook: false,
          x: false,
        },
        hasLineLink: false,
      }),
    });
    const scores: Scores = {
      websiteConversion: calculateWebsiteConversionScore(b),
      seoContent: calculateSeoContentScore(b),
      meoReadiness: calculateMeoReadinessScore(b),
      snsConnection: calculateSnsConnectionScore(b),
      medicalAdRisk: calculateMedicalAdRiskScore([], { textAvailable: true }),
      mmmReadiness: calculateMMMReadinessScore(b),
    };
    // SNS: 存在が確認できないため評価不能（弱い、ではない）
    expect(scores.snsConnection.status).toBe("not_evaluable");
    // MMM: URLのみ診断では全項目未評価
    expect(scores.mmmReadiness.status).toBe("not_evaluable");
    const overall = calculateOverallScore(scores);
    expect(overall).not.toBeNull();
    expect(overall!).toBeGreaterThanOrEqual(80);
  });

  it("SNS未入力の unknowns には「未評価」の説明が入り、negatives には入らない", () => {
    const b = makeBundle({
      input: makeInput(),
      website: makeWebsite({
        snsLinks: {
          youtube: false,
          instagram: false,
          tiktok: false,
          line: false,
          facebook: false,
          x: false,
        },
        hasLineLink: false,
      }),
    });
    const d = calculateSnsConnectionScore(b);
    expect(d.negatives).toHaveLength(0);
    expect((d.unknowns ?? []).length).toBeGreaterThan(0);
  });

  it("総合スコアは評価不能カテゴリの重みを除外して再正規化する", () => {
    const scores: Scores = {
      websiteConversion: makeDetail(25, 25, 25),
      seoContent: makeDetail(25, 25, 25),
      meoReadiness: makeDetail(0, 15, 0, "not_evaluable"),
      snsConnection: makeDetail(0, 15, 0, "not_evaluable"),
      medicalAdRisk: makeDetail(10, 10, 10),
      mmmReadiness: makeDetail(0, 10, 0, "not_evaluable"),
    };
    // 評価できたのは 25+25+10 = 60点分の重みで、達成率100% → 総合100
    expect(calculateOverallScore(scores)).toBe(100);
  });

  it("部分評価カテゴリの達成率は評価できた項目のみを分母にする", () => {
    // 10点満点中、6点分だけ評価できて6点獲得 → 達成率100%
    const d = makeDetail(6, 10, 6);
    expect(effectiveRatio(d)).toBe(1);
  });

  it("すべて評価不能なら総合スコアは null", () => {
    const nd = makeDetail(0, 25, 0, "not_evaluable");
    const scores: Scores = {
      websiteConversion: nd,
      seoContent: nd,
      meoReadiness: nd,
      snsConnection: nd,
      medicalAdRisk: nd,
      mmmReadiness: nd,
    };
    expect(calculateOverallScore(scores)).toBeNull();
  });
});

// ---------------------------------------------------------
// 3. 重複計上の禁止
// ---------------------------------------------------------

describe("重複計上の禁止: 1つの観測事実は1カテゴリのみに影響する", () => {
  it("診療時間の記載はHP集患導線のみに影響し、MEOには影響しない", () => {
    const withHours = perfectBundle();
    const withoutHours = makeBundle({
      ...perfectBundle(),
      websiteText: RICH_TEXT.replace(/診療時間|受付時間|休診/g, ""),
    });
    const wcA = calculateWebsiteConversionScore(withHours);
    const wcB = calculateWebsiteConversionScore(withoutHours);
    const meoA = calculateMeoReadinessScore(withHours);
    const meoB = calculateMeoReadinessScore(withoutHours);
    expect(wcA.score).toBeGreaterThan(wcB.score);
    expect(meoA.score).toBe(meoB.score);
  });

  it("tel: リンクはHP集患導線のみに影響し、MEOには影響しない", () => {
    const withTel = perfectBundle();
    const withoutTel = { ...perfectBundle(), website: makeWebsite({ hasTelLink: false }) };
    expect(calculateWebsiteConversionScore(withTel).score).toBeGreaterThan(
      calculateWebsiteConversionScore(withoutTel).score,
    );
    expect(calculateMeoReadinessScore(withTel).score).toBe(
      calculateMeoReadinessScore(withoutTel).score,
    );
  });

  it("ブログの有無はSEOのみに影響し、MMM準備度には影響しない", () => {
    const withBlog = perfectBundle();
    const withoutBlog = makeBundle({
      ...perfectBundle(),
      websiteText: RICH_TEXT.replace(/コラム|ブログ/g, ""),
    });
    expect(calculateSeoContentScore(withBlog).score).toBeGreaterThan(
      calculateSeoContentScore(withoutBlog).score,
    );
    expect(calculateMMMReadinessScore(withBlog).score).toBe(
      calculateMMMReadinessScore(withoutBlog).score,
    );
  });

  it("有料版への関心（interestedInMMM）はスコアに影響しない", () => {
    const base = perfectBundle();
    const interested = makeBundle({
      ...base,
      input: makeInput({ ...base.input, interestedInMMM: true }),
    });
    const notInterested = makeBundle({
      ...base,
      input: makeInput({ ...base.input, interestedInMMM: false }),
    });
    expect(calculateMMMReadinessScore(interested).score).toBe(
      calculateMMMReadinessScore(notInterested).score,
    );
  });
});

// ---------------------------------------------------------
// 4. 本文薄すぎガード（JS描画サイト対策）
// ---------------------------------------------------------

describe("本文薄すぎガード: テキストが取れないサイトを「弱い」と誤評価しない", () => {
  const thinBundle = makeBundle({ websiteText: "予約" }); // 300文字未満

  it("isTextThin が検出する", () => {
    expect(isTextThin(thinBundle)).toBe(true);
    expect(isTextThin(makeBundle())).toBe(false);
  });

  it("キーワード系項目（診療時間・初診案内）は減点されず分母から除外される", () => {
    const d = calculateWebsiteConversionScore(thinBundle);
    // tel(5) + 予約(6) + viewport(3) + CTA複数ページ(3) = 17 のみ評価対象
    expect(d.evaluableMaxScore).toBe(17);
    expect(d.negatives.some((n) => n.includes("診療時間"))).toBe(false);
    expect((d.unknowns ?? []).length).toBeGreaterThan(0);
  });

  it("医療広告スクリーニングは「検出ゼロ=問題なし」とせず評価不能にする", () => {
    const d = calculateMedicalAdRiskScore([], { textAvailable: false });
    expect(d.status).toBe("not_evaluable");
  });
});

// ---------------------------------------------------------
// 5. 医療広告スコアの減点ロジック
// ---------------------------------------------------------

describe("医療広告スコア: severity別の減点", () => {
  const finding = (expression: string, severity: "low" | "medium" | "high") => ({
    id: `risk-${expression}`,
    expression,
    context: "",
    severity,
    reason: "",
    recommendedAction: "",
  });

  it("high は3点、medium は1点減点、low は減点しない", () => {
    const d = calculateMedicalAdRiskScore(
      [finding("完治", "high"), finding("最新", "medium"), finding("必ず", "low")],
      { textAvailable: true },
    );
    expect(d.score).toBe(10 - 3 - 1);
  });

  it("同一表現の重複は1回のみ数える", () => {
    const d = calculateMedicalAdRiskScore(
      [finding("完治", "high"), finding("完治", "high")],
      { textAvailable: true },
    );
    expect(d.score).toBe(7);
  });
});

// ---------------------------------------------------------
// 6. グレード境界
// ---------------------------------------------------------

describe("グレード境界", () => {
  it.each([
    [100, "A"],
    [80, "A"],
    [79, "B"],
    [60, "B"],
    [59, "C"],
    [40, "C"],
    [39, "D"],
    [0, "D"],
  ])("%i点 → %s", (score, grade) => {
    expect(gradeFromScore(score)).toBe(grade);
  });
});

// ---------------------------------------------------------
// 7. 質的評価（集患スタイル診断）
// ---------------------------------------------------------

describe("質的評価: 集患スタイル診断", () => {
  it("スタイル・強み・講評を必ず返す", () => {
    const b = perfectBundle();
    const scores: Scores = {
      websiteConversion: calculateWebsiteConversionScore(b),
      seoContent: calculateSeoContentScore(b),
      meoReadiness: calculateMeoReadinessScore(b),
      snsConnection: calculateSnsConnectionScore(b),
      medicalAdRisk: calculateMedicalAdRiskScore([], { textAvailable: true }),
      mmmReadiness: calculateMMMReadinessScore(b),
    };
    const q = generateQualitativeReview(scores, b);
    expect(q.style.name.length).toBeGreaterThan(0);
    // ルール: UIはOS絵文字を使わずアイコンキーで表現する
    expect(q.style.icon).toBeTruthy();
    expect(q.style.emoji).toBeUndefined();
    expect(q.strengths.length).toBeGreaterThan(0);
    expect(q.narrative).toContain(q.style.name);
    // 「点数がすべてではない」姿勢が講評に含まれる
    expect(q.narrative).toContain("点数には写りません");
  });

  it("スタイルには必ず「次の一手」（CTAの根拠）が付く", () => {
    const bundles = [
      perfectBundle(),
      makeBundle({
        input: makeInput({ source: "quick-url", specialty: "未指定", location: "未指定" }),
        websiteText: "",
      }),
    ];
    for (const b of bundles) {
      const scores: Scores = {
        websiteConversion: calculateWebsiteConversionScore(b),
        seoContent: calculateSeoContentScore(b),
        meoReadiness: calculateMeoReadinessScore(b),
        snsConnection: calculateSnsConnectionScore(b),
        medicalAdRisk: calculateMedicalAdRiskScore([], { textAvailable: true }),
        mmmReadiness: calculateMMMReadinessScore(b),
      };
      const q = generateQualitativeReview(scores, b);
      expect(q.style.nextStep ?? "").not.toBe("");
    }
  });

  it("全カテゴリ高達成ならオールラウンダー型になる", () => {
    const b = perfectBundle();
    const scores: Scores = {
      websiteConversion: calculateWebsiteConversionScore(b),
      seoContent: calculateSeoContentScore(b),
      meoReadiness: calculateMeoReadinessScore(b),
      snsConnection: calculateSnsConnectionScore(b),
      medicalAdRisk: calculateMedicalAdRiskScore([], { textAvailable: true }),
      mmmReadiness: calculateMMMReadinessScore(b),
    };
    expect(generateQualitativeReview(scores, b).style.name).toBe("オールラウンダー型");
  });
});

// ---------------------------------------------------------
// 8. Quick Wins とサンプルレポートの整合性
// ---------------------------------------------------------

describe("Quick Wins", () => {
  it("常に最大3件を返す", () => {
    const b = makeBundle({
      input: makeInput({ source: "quick-url", specialty: "未指定", location: "未指定" }),
      website: makeWebsite({
        hasTelLink: false,
        hasBookingLink: false,
        hasGoogleMapsLink: false,
      }),
      websiteText: "",
    });
    const scores: Scores = {
      websiteConversion: calculateWebsiteConversionScore(b),
      seoContent: calculateSeoContentScore(b),
      meoReadiness: calculateMeoReadinessScore(b),
      snsConnection: calculateSnsConnectionScore(b),
      medicalAdRisk: calculateMedicalAdRiskScore([], { textAvailable: false }),
      mmmReadiness: calculateMMMReadinessScore(b),
    };
    const wins = generateQuickWins(scores, b);
    expect(wins.length).toBeLessThanOrEqual(3);
    expect(wins.length).toBeGreaterThan(0);
    // URLのみ診断では「情報を追加して再診断」が先頭
    expect(wins[0].id).toBe("qw-add-info");
  });
});

// ---------------------------------------------------------
// 9. 文言が観測事実を超えないこと（レビュー指摘の回帰テスト）
// ---------------------------------------------------------

describe("文言が観測事実を超えない", () => {
  it("HP未取得時のSNS未評価文言は「HP内リンクが無い」ことに言及しない", () => {
    const b = makeBundle({
      input: makeInput(),
      website: makeWebsite({ status: "failed" }),
      websiteText: "",
    });
    const d = calculateSnsConnectionScore(b);
    for (const u of d.unknowns ?? []) {
      expect(u).not.toContain("HP内からもリンクが見つからない");
    }
  });

  it("YouTube APIが成功しても投稿数が取得できない場合は「投稿なし」と断定しない", () => {
    const b = makeBundle({
      input: makeInput({ youtubeUrl: "https://youtube.com/@test" }),
      youtube: { status: "success", videoCount: null },
    });
    const d = calculateSnsConnectionScore(b);
    expect(d.negatives.some((n) => n.includes("動画投稿が確認できませんでした"))).toBe(false);
    expect((d.unknowns ?? []).some((u) => u.includes("投稿数はAPIから取得できませんでした"))).toBe(
      true,
    );
  });

  it("電話導線があり予約導線が無い場合、HPコメントは「電話CTAが無い」と主張せず、ステータスはgoodにしない", () => {
    const b = makeBundle({
      website: makeWebsite({ hasTelLink: true, hasBookingLink: false, hasLineLink: false }),
    });
    const scores: Scores = {
      websiteConversion: calculateWebsiteConversionScore(b),
      seoContent: calculateSeoContentScore(b),
      meoReadiness: calculateMeoReadinessScore(b),
      snsConnection: calculateSnsConnectionScore(b),
      medicalAdRisk: calculateMedicalAdRiskScore([], { textAvailable: true }),
      mmmReadiness: calculateMMMReadinessScore(b),
    };
    const hp = generateChannelComments(b, scores).find((c) => c.channel === "hp")!;
    expect(hp.status).not.toBe("good");
    expect(hp.comment).not.toContain("電話CTAも確認できませんでした");
    expect(hp.comment).toContain("電話導線は確認できます");
  });
});

describe("サンプルレポートの整合性", () => {
  it("総合スコアはスコア内訳から再計算した値と一致する", () => {
    expect(SAMPLE_REPORT.summary.overallScore).toBe(
      calculateOverallScore(SAMPLE_REPORT.scores),
    );
  });

  it("各カテゴリで score ≤ evaluableMaxScore ≤ maxScore が成り立つ", () => {
    for (const detail of Object.values(SAMPLE_REPORT.scores)) {
      const evalMax = detail.evaluableMaxScore ?? detail.maxScore;
      expect(detail.score).toBeLessThanOrEqual(evalMax);
      expect(evalMax).toBeLessThanOrEqual(detail.maxScore);
    }
  });

  it("質的評価（集患スタイル）が含まれる", () => {
    expect(SAMPLE_REPORT.qualitative).toBeDefined();
    expect(SAMPLE_REPORT.qualitative!.style.name.length).toBeGreaterThan(0);
  });

  it("サンプルは「改善余地が明確なB評価」の物語を保つ", () => {
    expect(SAMPLE_REPORT.summary.grade).toBe("B");
    // 予約導線が弱い、というサンプルの想定が Quick Wins に反映される
    expect(SAMPLE_REPORT.quickWins.some((q) => q.id === "qw-booking-firstview")).toBe(true);
  });
});
