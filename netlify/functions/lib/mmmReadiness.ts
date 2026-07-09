// =========================================================
// MMM 準備度パネルの組み立て（統合レイヤー）
//
// 準備度スコアの計算は src/lib/scoring.ts に集約。
// ここでは available/missing/next のリストを含むパネルデータを生成します。
// =========================================================

import { buildMMMReadiness, type DiagnosticsBundle } from "../../../src/lib/scoring";
import type { MMMReadiness, ScoreDetail } from "../../../src/lib/types";

export function buildMMMReadinessPanel(
  bundle: DiagnosticsBundle,
  mmmScore: ScoreDetail,
): MMMReadiness {
  return buildMMMReadiness(bundle, mmmScore);
}
