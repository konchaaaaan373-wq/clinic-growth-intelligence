// =========================================================
// 医療広告リスク 初期スクリーニング
//
// 重要: これは違反の断定ではありません。単語検出のみを根拠に
//       違法/違反を判断しません。すべて「要確認の可能性」として扱います。
// =========================================================

import type { RiskFinding } from "../../../src/lib/types";

/** 文脈により医療広告上の確認が望ましい可能性がある表現の候補 */
export const MEDICAL_AD_RISK_KEYWORDS: string[] = [
  "絶対",
  "必ず",
  "完治",
  "最高",
  "最強",
  "日本一",
  "No.1",
  "no.1",
  "ナンバーワン",
  "地域No.1",
  "地域no.1",
  "最新",
  "最先端",
  "奇跡",
  "安全",
  "痛くない",
  "副作用なし",
  "副作用はありません",
  "口コミ",
  "体験談",
  "ビフォーアフター",
  "before after",
  "キャンペーン",
  "今だけ",
  "限定",
  "モニター",
  "返金保証",
];

const NOTE_BY_KEYWORD: Record<string, string> = {
  最新:
    "「最新」は文脈により、他院との比較優位を示唆する表現とみなされる可能性があります。事実に基づく客観的記載か確認をおすすめします（法的判断ではありません）。",
  最先端:
    "「最先端」は比較優良・誇大と受け取られる可能性があります。表現の文脈によっては注意が必要です。",
  痛くない:
    "「痛くない」は効果・体感の保証と受け取られる可能性があります。最終確認は医療広告ガイドラインや専門家確認を前提にしてください。",
  完治:
    "「完治」は治療効果の保証と受け取られる可能性があります。文脈によっては注意が必要です。",
  安全:
    "「安全」は安全性の保証と受け取られる可能性があります。客観的根拠の有無をご確認ください。",
  副作用なし:
    "副作用が無いと断定する表現は、医療広告上、確認した方がよい可能性があります。",
  口コミ:
    "患者の体験談・口コミの掲載は、医療広告ガイドライン上で扱いに注意が必要とされる場合があります。",
  体験談:
    "患者の体験談は、医療広告ガイドライン上で扱いに注意が必要とされる場合があります。",
  ビフォーアフター:
    "術前術後（ビフォーアフター）写真は、必要な説明を欠くと注意が必要とされる場合があります。",
};

const DEFAULT_NOTE =
  "医療広告上、確認した方がよい可能性があります。単語のみを根拠に違反を断定するものではなく、表現の文脈によっては注意が必要です。最終確認は専門家・ガイドラインを前提にしてください。";

/**
 * テキスト群から要確認表現を抽出する。
 * @param texts 検査対象テキスト（ページ本文・タイトル等）
 * @param labels texts に対応する検出箇所ラベル（任意）
 */
export function detectMedicalAdRisk(
  texts: { text: string; where?: string }[],
): RiskFinding[] {
  const found = new Map<string, RiskFinding>();

  for (const { text, where } of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const kw of MEDICAL_AD_RISK_KEYWORDS) {
      const idx = lower.indexOf(kw.toLowerCase());
      if (idx === -1) continue;

      // 表現ごとに最初の1件のみ保持（過検出を避ける）
      const normalized = normalizeKeyword(kw);
      if (found.has(normalized)) continue;

      found.set(normalized, {
        id: `risk-${normalized}`,
        expression: normalized,
        context: extractContext(text, idx, kw.length),
        note: NOTE_BY_KEYWORD[normalized] ?? DEFAULT_NOTE,
        where,
      });
    }
  }

  return Array.from(found.values());
}

function normalizeKeyword(kw: string): string {
  // 表記ゆれを代表表現に寄せる
  const map: Record<string, string> = {
    "no.1": "No.1",
    ナンバーワン: "No.1",
    "地域no.1": "地域No.1",
    "before after": "ビフォーアフター",
    副作用はありません: "副作用なし",
  };
  return map[kw.toLowerCase()] ?? map[kw] ?? kw;
}

function extractContext(text: string, idx: number, len: number): string {
  const pad = 18;
  const start = Math.max(0, idx - pad);
  const end = Math.min(text.length, idx + len + pad);
  let ctx = text.slice(start, end).replace(/\s+/g, " ").trim();
  // eslint-disable-next-line no-control-regex
  ctx = ctx.replace(/[\x00-\x1F\x7F]/g, "");
  return ctx.slice(0, 80);
}
