// =========================================================
// 手描き風の風船SVG。ロゴ・ローディング・フッターなどの装飾に使う。
// あえて左右非対称のパスとゆらいだ糸で「手で描いた感じ」を出している。
// =========================================================

type BalloonMarkProps = {
  /** 風船の塗り色（実色）。既定はキービジュアルのコーラル */
  color?: string;
  /** 表示サイズ（高さpx）。幅は自動 */
  size?: number;
  className?: string;
  /** 糸を描くか（ロゴなど小さい場面では省略できる） */
  withString?: boolean;
};

export default function BalloonMark({
  color = "#e75f3f",
  size = 28,
  className,
  withString = true,
}: BalloonMarkProps) {
  const height = withString ? 34 : 24;
  return (
    <svg
      width={(size * 22) / height}
      height={size}
      viewBox={`0 0 22 ${height}`}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* 本体: わずかに右へ膨らんだ非対称の風船 */}
      <path
        d="M11 1.6 C6.1 1.6 2.6 5.5 2.8 10.1 c0.2 4.1 3.1 7.5 6.6 8.5 l-0.8 1.5 c-0.2 0.4 0.1 0.8 0.5 0.8 h3.8 c0.4 0 0.7 -0.4 0.5 -0.8 l-0.8 -1.5 c3.6 -1 6.5 -4.5 6.6 -8.7 C19.4 5.3 15.8 1.6 11 1.6 Z"
        fill={color}
      />
      {/* ハイライト */}
      <path
        d="M6.4 6.2 c0.7 -1.6 2.2 -2.7 3.6 -2.9"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.75"
      />
      {withString && (
        <path
          d="M11 21.2 c1.6 1.9 -1.7 3.4 -0.2 5.4 c1.2 1.6 -0.6 2.9 -1.2 3.9"
          stroke="#8a8070"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** 3つの風船がふわふわ浮く飾り。ローディングやフッターで使う */
export function BalloonTrio({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-end gap-1" aria-hidden="true">
      <BalloonMark color="#e75f3f" size={size} className="animate-float" />
      <BalloonMark color="#f5c245" size={size * 1.15} className="animate-float-delay" />
      <BalloonMark color="#7fc0d4" size={size * 0.9} className="animate-float-delay2" />
    </span>
  );
}
