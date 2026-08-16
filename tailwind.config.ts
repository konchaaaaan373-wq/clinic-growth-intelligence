import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 風船テーマの主役色（キービジュアルのコーラルレッドから採色）。
        // CTAや強調はこのスケールを使う。700以上は白文字でもコントラストを確保
        brand: {
          50: "#fef5f1",
          100: "#fde7de",
          200: "#fac9b8",
          300: "#f6a58a",
          400: "#f08060",
          500: "#e75f3f",
          600: "#d44a2c",
          700: "#b23c24",
          800: "#93341f",
          900: "#7a2e1e",
          950: "#42160d",
        },
        // 風船のアクセントカラー（キービジュアルの黄・空・緑・紫・桃から採色）。
        // 意味（良し悪し）は持たせず、彩りとして領域・番号の識別に使う
        sunny: {
          100: "#fdf0d1",
          200: "#fbdf9d",
          400: "#f5c245",
          600: "#c98d14",
          800: "#8a5f10",
        },
        sky: {
          100: "#e3f2f6",
          200: "#c4e4ec",
          400: "#7fc0d4",
          600: "#3f8ba3",
          800: "#2b5f70",
        },
        mint: {
          100: "#e7f3e4",
          200: "#cfe7c9",
          400: "#95c98e",
          600: "#55944f",
          800: "#3c6a3a",
        },
        lavender: {
          100: "#f0eaf8",
          200: "#ddd0ee",
          400: "#af95d5",
          600: "#7e5cb0",
          800: "#573f7c",
        },
        peach: {
          100: "#fdeee6",
          200: "#fbd6c4",
          400: "#f4a983",
          600: "#c96a3c",
          800: "#96502d",
        },
        // キービジュアルの生成り背景に合わせたクリーム地
        cream: {
          50: "#fefcf6",
          100: "#fdf8ec",
          200: "#faf0d9",
          300: "#f3e4c3",
        },
        // 既存コンポーネントの境界線・分割線を一括で温かみのある色に寄せるため、
        // slate を warm gray（ベージュ寄り）で上書きする
        slate: {
          50: "#faf7f0",
          100: "#f3efe4",
          200: "#e8e1d2",
          300: "#d4cbb8",
          400: "#a89e8c",
          500: "#8a8070",
          600: "#6d6455",
          700: "#57503f",
          800: "#3f3a2f",
          900: "#2e2a23",
          950: "#1f1c17",
        },
        ink: {
          DEFAULT: "#3b332c",
          muted: "#6b6154",
          // 注記などの小さな文字にも使うため、白地で4:1程度のコントラストを保つ
          soft: "#7f7565",
        },
      },
      fontFamily: {
        // 本文: Zen Kaku Gothic New（見出しの Zen Maru Gothic と同じ骨格の角ゴシック）。
        // 未読込時はOSの日本語ビジネス文書向けスタックへフォールバックする
        sans: [
          "Zen Kaku Gothic New",
          "Noto Sans JP",
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "Yu Gothic Medium",
          "Yu Gothic",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        // 桁揃えが必要な数値（スコア表など）: tnum を持つ Inter を優先する。
        // Zen Kaku Gothic New は tnum 非対応（数字がプロポーショナル）のため、
        // tabular-nums 指定箇所はこのスタックで揃える（globals.css 参照）
        num: [
          "Inter",
          "Zen Kaku Gothic New",
          "Noto Sans JP",
          "Hiragino Sans",
          "system-ui",
          "sans-serif",
        ],
        // 見出し・スコア数字: 欧文と数字は Quicksand（丸いジオメトリック）、
        // 和文は Zen Maru Gothic（丸ゴシック）。風船のフォルムに合わせる
        display: [
          "Quicksand",
          "Zen Maru Gothic",
          "Hiragino Maru Gothic ProN",
          "Noto Sans JP",
          "Hiragino Sans",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(93, 64, 28, 0.05), 0 2px 6px rgba(93, 64, 28, 0.06)",
        cardHover: "0 6px 16px rgba(93, 64, 28, 0.12)",
      },
      keyframes: {
        // 風船がふわふわ浮く動き。装飾のみに使い、本文には適用しない
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-7px)" },
        },
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        "float-delay": "float 4s ease-in-out 1.3s infinite",
        "float-delay2": "float 4s ease-in-out 2.6s infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
