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

type RiskNote = { reason: string; recommendedAction: string };

const NOTE_BY_KEYWORD: Record<string, RiskNote> = {
  最新: {
    reason:
      "医療広告では、比較優良・誇大に見える表現は文脈によって注意が必要です。「最新」は他院との比較優位を示唆する表現とみなされる場合があります。",
    recommendedAction:
      "客観的根拠の明示、導入時期・機器名などの具体的説明、または別表現への変更を検討してください。",
  },
  最先端: {
    reason:
      "「最先端」は比較優良・誇大と受け取られる可能性があります。表現の文脈によっては注意が必要です。",
    recommendedAction:
      "客観的な根拠や具体的な内容を併記するか、事実ベースの表現への変更を検討してください。",
  },
  痛くない: {
    reason:
      "「痛くない」は効果・体感の保証と受け取られる可能性があります。個人差のある事項を断定する表現は文脈により注意が必要です。",
    recommendedAction:
      "「痛みに配慮した」「麻酔を用いる」など、個人差がある旨を含む表現への変更を検討してください。",
  },
  完治: {
    reason:
      "「完治」は治療効果の保証と受け取られる可能性があります。効果を保証する表現は文脈により注意が必要です。",
    recommendedAction:
      "効果には個人差がある旨を明記するか、断定を避けた表現への変更を検討してください。",
  },
  安全: {
    reason:
      "「安全」は安全性の保証と受け取られる可能性があります。リスクゼロを示唆する表現は文脈により注意が必要です。",
    recommendedAction:
      "考えられるリスク・副作用の説明を併記し、安全性を断定しない表現を検討してください。",
  },
  副作用なし: {
    reason:
      "副作用が無いと断定する表現は、医療広告上、確認した方がよい可能性があります。",
    recommendedAction:
      "起こりうる副作用やその頻度の説明を併記し、断定を避ける表現を検討してください。",
  },
  口コミ: {
    reason:
      "患者の体験談・口コミの掲載は、医療広告ガイドライン上、扱いに注意が必要とされる場合があります。",
    recommendedAction:
      "治療内容の説明・リスク情報などを適切に併記できているか、掲載可否も含めて確認してください。",
  },
  体験談: {
    reason:
      "患者の体験談は、医療広告ガイドライン上、扱いに注意が必要とされる場合があります。",
    recommendedAction:
      "掲載可否と、必要な説明が併記されているかを確認してください。",
  },
  ビフォーアフター: {
    reason:
      "術前術後（ビフォーアフター）写真は、必要な説明を欠くと注意が必要とされる場合があります。",
    recommendedAction:
      "治療内容・費用・リスク・副作用などの説明が併記されているかを確認してください。",
  },
};

const DEFAULT_NOTE: RiskNote = {
  reason:
    "医療広告では、比較優良・誇大・保証に見える表現は文脈によって注意が必要です。単語のみを根拠に違反を断定するものではありません。",
  recommendedAction:
    "客観的根拠の明示、具体的な説明の追加、または別表現への変更を検討してください。最終確認は医療広告ガイドラインや専門家確認を前提にしてください。",
};

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

      const note = NOTE_BY_KEYWORD[normalized] ?? DEFAULT_NOTE;
      found.set(normalized, {
        id: `risk-${normalized}`,
        expression: normalized,
        context: extractContext(text, idx, kw.length),
        reason: note.reason,
        recommendedAction: note.recommendedAction,
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
