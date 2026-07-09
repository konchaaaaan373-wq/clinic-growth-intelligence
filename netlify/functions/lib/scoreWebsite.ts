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
  type DiagnosticsBundle,
} from "../../../src/lib/scoring";
import type { RiskFinding, Scores } from "../../../src/lib/types";

export function buildScores(bundle: DiagnosticsBundle, riskFindings: RiskFinding[]): Scores {
  return {
    websiteConversion: calculateWebsiteConversionScore(bundle),
    seoContent: calculateSeoContentScore(bundle),
    meoReadiness: calculateMeoReadinessScore(bundle),
    snsConnection: calculateSnsConnectionScore(bundle),
    medicalAdRisk: calculateMedicalAdRiskScore(riskFindings),
    mmmReadiness: calculateMMMReadinessScore(bundle),
  };
}
