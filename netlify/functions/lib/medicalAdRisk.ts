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

type Severity = "low" | "medium" | "high";
const SEV_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

/** 表現ごとの基準severity（文脈で上下する） */
const BASE_SEVERITY: Record<string, Severity> = {
  絶対: "high",
  完治: "high",
  最高: "high",
  最強: "high",
  日本一: "high",
  "No.1": "high",
  "地域No.1": "high",
  奇跡: "high",
  副作用なし: "high",
  返金保証: "high",
  最新: "medium",
  最先端: "medium",
  痛くない: "medium",
  安全: "medium",
  必ず: "medium",
  口コミ: "medium",
  体験談: "medium",
  ビフォーアフター: "medium",
  キャンペーン: "medium",
  今だけ: "medium",
  限定: "medium",
  モニター: "medium",
};

/**
 * 文脈を踏まえてseverityを判定する。null を返した場合は除外（検出しない）。
 * - 「必ず診察/医師/受診/確認」など安全確認・受診促進文脈の「必ず」は low（または除外）
 * - 「安全に◯◯できた/摂れた」など患者状態の記述の「安全」は low
 * - 「絶対安全/安全です/安全性を保証」など保証表現の「安全」は high
 */
function classifySeverity(expression: string, windowText: string): Severity | null {
  const c = windowText;

  if (expression === "必ず") {
    // 受診促進・安全確認の文脈（違反リスクは低い、むしろ推奨される表現）
    if (
      /必ず[^。]{0,8}(医師|診察|受診|来院|確認|ご相談|相談|検査|指示)/.test(c) ||
      /(診察|医師|専門医)[^。]{0,6}(のうえ|の上|に相談|にご相談|の判断)/.test(c) ||
      /必ずしも/.test(c)
    ) {
      return "low";
    }
    return "medium";
  }

  if (expression === "安全") {
    // 保証表現（リスクゼロの断定）
    if (
      /(絶対|完全に|全く|まったく|100%|１００%)[^。]{0,4}安全/.test(c) ||
      /安全(です|性は保証|性を保証|を保証|であることを保証)/.test(c)
    ) {
      return "high";
    }
    // 副作用・リスクの説明や安全管理の文脈（例:「副作用と安全管理」「安全性について」）。
    // 安全性を保証するのではなく、リスク情報を適切に提供している文脈のため低リスク。
    if (
      /(副作用|リスク|合併症)[^。]{0,12}安全/.test(c) ||
      /安全(管理|対策|確認|性について|性の確認|性に関する|に配慮|への配慮)/.test(c)
    ) {
      return "low";
    }
    // 患者状態・体験の記述（〜安全に◯◯できた/摂れた/受けられた/過ごせた）
    if (/安全に[^。]{0,8}(摂|とれ|取れ|受け|過ご|使用|使え|行え|できた|できる)/.test(c)) {
      return "low";
    }
    return "medium";
  }

  return BASE_SEVERITY[expression] ?? "medium";
}

/**
 * テキスト群から要確認表現を抽出する（文脈に応じてseverityを付与）。
 * 同一表現が複数箇所にある場合は、最も高いseverityの箇所を代表として残す。
 */
export function detectMedicalAdRisk(
  texts: { text: string; where?: string }[],
): RiskFinding[] {
  const found = new Map<string, RiskFinding>();

  for (const { text, where } of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();

    for (const kw of MEDICAL_AD_RISK_KEYWORDS) {
      const kwLower = kw.toLowerCase();
      const normalized = normalizeKeyword(kw);

      // すべての出現箇所を走査し、最も高いseverityの箇所を採用
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const idx = lower.indexOf(kwLower, from);
        if (idx === -1) break;
        from = idx + kwLower.length;

        const windowText = extractWindow(text, idx, kw.length, 40);
        const sev = classifySeverity(normalized, windowText);
        if (!sev) continue;

        const existing = found.get(normalized);
        if (!existing || SEV_RANK[sev] > SEV_RANK[existing.severity]) {
          const note = NOTE_BY_KEYWORD[normalized] ?? DEFAULT_NOTE;
          found.set(normalized, {
            id: `risk-${normalized}`,
            expression: normalized,
            context: extractContext(text, idx, kw.length),
            severity: sev,
            reason: note.reason,
            recommendedAction: note.recommendedAction,
            where,
          });
        }
      }
    }
  }

  // 表示順: high → medium → low
  return Array.from(found.values()).sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
}

/** severity判定用の広めの文脈窓（表示用の extractContext より広い） */
function extractWindow(text: string, idx: number, len: number, pad: number): string {
  const start = Math.max(0, idx - pad);
  const end = Math.min(text.length, idx + len + pad);
  return text.slice(start, end).replace(/\s+/g, "");
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
