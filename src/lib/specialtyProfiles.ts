// =========================================================
// 診療科別プロファイル
//
// 診療科ごとに「集患上、症状別ページとして用意したい代表的な症状・疾患」を辞書化。
// SEO/医療コンテンツスコアと改善提案・コメントの具体性を診療科に応じて変える。
//
// 後から診療科・キーワードを追加しやすいよう、単純なデータ構造で保持する。
// =========================================================

export type SpecialtyProfile = {
  /** 正規化した診療科名 */
  key: string;
  label: string;
  /** 入力の診療科文字列から本プロファイルを判定するための別名 */
  aliases: string[];
  /** 症状別ページとして用意したい代表的な症状・疾患 */
  symptoms: string[];
};

export const SPECIALTY_PROFILES: SpecialtyProfile[] = [
  {
    key: "internal",
    label: "内科",
    aliases: ["内科", "総合内科", "一般内科", "消化器内科", "循環器内科", "呼吸器内科", "糖尿病内科"],
    symptoms: [
      "発熱",
      "咳",
      "腹痛",
      "高血圧",
      "糖尿病",
      "脂質異常症",
      "健康診断",
      "予防接種",
      "生活習慣病",
    ],
  },
  {
    key: "orthopedics",
    label: "整形外科",
    aliases: ["整形外科", "整形", "スポーツ整形", "運動器"],
    symptoms: [
      "腰痛",
      "膝痛",
      "肩こり",
      "肩痛",
      "骨粗鬆症",
      "しびれ",
      "捻挫",
      "リハビリ",
      "スポーツ障害",
    ],
  },
  {
    key: "pediatrics",
    label: "小児科",
    aliases: ["小児科", "こども", "子ども", "小児", "キッズ"],
    symptoms: [
      "発熱",
      "咳",
      "鼻水",
      "腹痛",
      "嘔吐",
      "予防接種",
      "乳幼児健診",
      "アレルギー",
      "夜尿症",
    ],
  },
  {
    key: "dermatology",
    label: "皮膚科",
    aliases: ["皮膚科", "皮フ科", "ひふ科", "美容皮膚"],
    symptoms: [
      "湿疹",
      "かゆみ",
      "にきび",
      "アトピー",
      "じんましん",
      "いぼ",
      "水虫",
      "ほくろ",
      "美容皮膚科",
    ],
  },
  {
    key: "ent",
    label: "耳鼻咽喉科",
    aliases: ["耳鼻科", "耳鼻咽喉科", "耳鼻いんこう科", "耳鼻"],
    symptoms: [
      "鼻水",
      "鼻づまり",
      "花粉症",
      "中耳炎",
      "めまい",
      "難聴",
      "のどの痛み",
      "いびき",
      "補聴器",
    ],
  },
  {
    key: "ophthalmology",
    label: "眼科",
    aliases: ["眼科", "アイクリニック"],
    symptoms: [
      "白内障",
      "緑内障",
      "ドライアイ",
      "結膜炎",
      "ものもらい",
      "眼鏡",
      "コンタクト",
      "飛蚊症",
      "糖尿病網膜症",
    ],
  },
  {
    key: "gynecology",
    label: "婦人科",
    aliases: ["婦人科", "産婦人科", "レディース", "レディスクリニック", "産科"],
    symptoms: [
      "生理痛",
      "月経不順",
      "更年期",
      "妊婦健診",
      "子宮頸がん検診",
      "ピル",
      "不正出血",
      "おりもの",
    ],
  },
  {
    key: "psychosomatic",
    label: "心療内科・精神科",
    aliases: ["心療内科", "精神科", "メンタルクリニック", "メンタル"],
    symptoms: [
      "うつ",
      "不眠",
      "不安",
      "パニック",
      "発達障害",
      "ADHD",
      "適応障害",
      "休職",
      "復職",
    ],
  },
  {
    key: "dental",
    label: "歯科",
    aliases: ["歯科", "デンタル", "歯医者", "口腔外科", "矯正歯科"],
    symptoms: [
      "虫歯",
      "歯周病",
      "予防歯科",
      "ホワイトニング",
      "インプラント",
      "矯正",
      "小児歯科",
      "親知らず",
    ],
  },
];

/** 入力の診療科文字列から、最も一致するプロファイルを返す（見つからなければ null） */
export function matchSpecialtyProfile(specialty: string | undefined): SpecialtyProfile | null {
  if (!specialty) return null;
  const s = specialty.toLowerCase();
  // エイリアスの部分一致で最初にマッチしたものを採用（長いエイリアス優先）
  let best: { profile: SpecialtyProfile; len: number } | null = null;
  for (const profile of SPECIALTY_PROFILES) {
    for (const alias of profile.aliases) {
      if (s.includes(alias.toLowerCase())) {
        if (!best || alias.length > best.len) {
          best = { profile, len: alias.length };
        }
      }
    }
  }
  return best?.profile ?? null;
}

export type SpecialtyCoverage = {
  profile: SpecialtyProfile | null;
  present: string[];
  missing: string[];
};

/** 診療科プロファイルに対する、HP本文での症状カバレッジを算出する */
export function analyzeSpecialtyCoverage(
  specialty: string | undefined,
  websiteText: string | undefined,
): SpecialtyCoverage {
  const profile = matchSpecialtyProfile(specialty);
  if (!profile) {
    return { profile: null, present: [], missing: [] };
  }
  const text = (websiteText ?? "").toLowerCase();
  const present: string[] = [];
  const missing: string[] = [];
  for (const symptom of profile.symptoms) {
    if (text && text.includes(symptom.toLowerCase())) {
      present.push(symptom);
    } else {
      missing.push(symptom);
    }
  }
  return { profile, present, missing };
}
