// =========================================================
// 風船テーマの配色ユーティリティ
// キービジュアル（カラフルな風船の束）から採色したアクセントカラーを、
// セクション番号・領域の識別など「意味を持たない彩り」として循環させる。
// 良し悪し（合否・信号機）の意味付けには使わないこと。
// =========================================================

export type BalloonColor = {
  /** 番号チップなどの塗り（Tailwindクラス） */
  chipBg: string;
  /** テキスト強調（Tailwindクラス） */
  text: string;
  /** SVG塗りなどに使う実色 */
  hex: string;
};

/** 風船の並び順で循環するアクセント。index は 0 始まり */
const BALLOON_CYCLE: BalloonColor[] = [
  { chipBg: "bg-brand-500", text: "text-brand-700", hex: "#e75f3f" }, // コーラル
  { chipBg: "bg-sunny-600", text: "text-sunny-800", hex: "#c98d14" }, // イエロー
  { chipBg: "bg-mint-600", text: "text-mint-800", hex: "#55944f" }, // ミント
  { chipBg: "bg-sky-600", text: "text-sky-800", hex: "#3f8ba3" }, // スカイ
  { chipBg: "bg-lavender-600", text: "text-lavender-800", hex: "#7e5cb0" }, // ラベンダー
  { chipBg: "bg-peach-600", text: "text-peach-800", hex: "#c96a3c" }, // ピーチ
  { chipBg: "bg-slate-500", text: "text-slate-600", hex: "#8a8070" }, // 予備（前提と限界など）
];

export function balloonColor(index: number): BalloonColor {
  return BALLOON_CYCLE[index % BALLOON_CYCLE.length];
}

/** "01" のようなセクション番号文字列から配色を引く（01 → index 0） */
export function sectionColor(no: string): BalloonColor {
  const n = Number.parseInt(no, 10);
  return balloonColor(Number.isNaN(n) || n < 1 ? 0 : n - 1);
}
