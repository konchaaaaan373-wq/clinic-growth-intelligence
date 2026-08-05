// =========================================================
// スコア組み立て（Netlify Function 側の統合レイヤー）
//
// 純粋なスコア計算ロジックは src/lib/scoring.ts に集約し、
// ここでは診断素材（HP解析・PageSpeed・YouTube・リスク検出）を束ねて
// Scores オブジェクトを生成します。
// =========================================================

import {
  calculateWebsiteConversionScore,
  calculateSeoContentScore,
  calculateMeoReadinessScore,
  calculateSnsConnectionScore,
  calculateMedicalAdRiskScore,
  calculateMMMReadinessScore,
  isTextThin,
  type DiagnosticsBundle,
} from "../../../src/lib/scoring";
import type { RiskFinding, Scores } from "../../../src/lib/types";

export function buildScores(bundle: DiagnosticsBundle, riskFindings: RiskFinding[]): Scores {
  // 本文がほとんど取得できていない場合、「検出ゼロ = 表現に問題なし」とは
  // 言えないため、医療広告スクリーニングは評価不能として扱う
  const textAvailable = bundle.website?.status !== "failed" && !isTextThin(bundle);
  return {
    websiteConversion: calculateWebsiteConversionScore(bundle),
    seoContent: calculateSeoContentScore(bundle),
    meoReadiness: calculateMeoReadinessScore(bundle),
    snsConnection: calculateSnsConnectionScore(bundle),
    medicalAdRisk: calculateMedicalAdRiskScore(riskFindings, { textAvailable }),
    mmmReadiness: calculateMMMReadinessScore(bundle),
  };
}
