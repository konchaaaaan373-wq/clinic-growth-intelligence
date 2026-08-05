// =========================================================
// 医療広告リスク初期スクリーニングのテスト
//
// 偽陽性を減らす文脈判定（ナビゲーション文言・口コミ導線・
// 診療体制の案内など）が意図通り機能することを検証する。
// =========================================================

import { describe, expect, it } from "vitest";
import { detectMedicalAdRisk } from "../medicalAdRisk";

function detect(text: string) {
  return detectMedicalAdRisk([{ text, where: "テスト" }]);
}

describe("文脈判定: よくある無害な文言を誤検出しない", () => {
  it("「最新のお知らせ」などナビゲーション文言は検出しない", () => {
    const found = detect("最新のお知らせ一覧はこちらです。最新情報を更新しています。");
    expect(found.find((f) => f.expression === "最新")).toBeUndefined();
  });

  it("「最新の治療機器」は要確認（medium）として検出する", () => {
    const found = detect("当院では最新の治療機器を導入しています。");
    const f = found.find((x) => x.expression === "最新");
    expect(f?.severity).toBe("medium");
  });

  it("「Googleの口コミはこちら」は文脈確認（low）に下げる", () => {
    const found = detect("Googleの口コミはこちらからご覧いただけます。");
    const f = found.find((x) => x.expression === "口コミ");
    expect(f?.severity).toBe("low");
  });

  it("「土曜限定の専門外来」は文脈確認（low）に下げる", () => {
    const found = detect("土曜限定の専門外来を開設しています。");
    const f = found.find((x) => x.expression === "限定");
    expect(f?.severity).toBe("low");
  });

  it("「今だけ限定キャンペーン」の「限定」は要確認（medium）のまま", () => {
    const found = detect("今だけ限定のキャンペーンを実施中です。");
    const f = found.find((x) => x.expression === "限定");
    expect(f?.severity).toBe("medium");
  });

  it("「必ず医師にご相談ください」は文脈確認（low）に下げる", () => {
    const found = detect("服用前に必ず医師にご相談ください。");
    const f = found.find((x) => x.expression === "必ず");
    expect(f?.severity).toBe("low");
  });

  it("「副作用と安全管理について」は文脈確認（low）に下げる", () => {
    const found = detect("副作用と安全管理について説明します。");
    const f = found.find((x) => x.expression === "安全");
    expect(f?.severity).toBe("low");
  });
});

describe("保証・断定表現は高優先で検出する", () => {
  it("「完治」は優先確認（high）", () => {
    const found = detect("この治療で完治します。");
    expect(found.find((f) => f.expression === "完治")?.severity).toBe("high");
  });

  it("「絶対安全」の「安全」は優先確認（high）", () => {
    const found = detect("当院の手術は絶対安全です。");
    expect(found.find((f) => f.expression === "安全")?.severity).toBe("high");
  });
});

describe("重複と表記ゆれの正規化", () => {
  it("同一表現が複数回出現しても1件に集約される", () => {
    const found = detect("効果は必ず現れます。結果も必ず出ます。");
    const matches = found.filter((f) => f.expression === "必ず");
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe("medium");
  });

  it("「ナンバーワン」は「No.1」に正規化される", () => {
    const found = detect("地域ナンバーワンの実績です。");
    expect(found.find((f) => f.expression === "No.1")).toBeDefined();
  });
});
