# Clinic Growth Intelligence

医療機関向けの **無料 集患力診断 SaaS（MVP）** です。
クリニックが自院の HP URL・GoogleマップURL・YouTube・Instagram・TikTok などを入力すると、
**外部から観測できる範囲で** 「集患力」「HP導線」「SEO/コンテンツ」「MEO準備度」「SNS接続」「医療広告リスク」「MMM準備度」を自動診断し、改善提案を返します。

> **重要な前提**
> 外部URLだけでは、真のマーケティング効果・実際の初診CPA・新患数への寄与・広告費対効果・直接来院を含めた実成果は算出できません。
> 本サービスは「**効果測定**」ではなく、「**外部から見える集患力診断**」「**MMM準備診断（施策効果測定のための事前監査）**」として設計しています。
> 無料版では **真の初診CPAや初診寄与は算出・断定しません。**

---

## 目次

- [できること / できないこと](#できること--できないこと)
- [有料版 MMM 構想](#有料版-mmm-構想将来)
- [技術スタック](#技術スタック)
- [ディレクトリ構成](#ディレクトリ構成)
- [セットアップ / ローカル起動](#セットアップ--ローカル起動)
- [環境変数](#環境変数)
- [Netlify デプロイ手順](#netlify-デプロイ手順)
- [Netlify Functions の説明](#netlify-functions-の説明)
- [APIキーなしでの挙動](#apiキーなしでの挙動)
- [セキュリティ上の注意](#セキュリティ上の注意)
- [今後のロードマップ](#今後のロードマップ)

---

## できること / できないこと

### 無料版 MVP でできること

- HP URL を入力するだけで、外部から見える集患上の弱点を診断
- **HP集患導線 / SEO・医療コンテンツ / MEO準備度 / SNS集患接続 / 医療広告リスク / MMM準備度** を横断診断
- 総合スコア（0–100）とランク（A/B/C/D）、スコア内訳を表示
- 「今すぐ直すべき3点」「伸ばせる余地が大きい3点」「チャネル別コメント」を提示
- 医療広告上、文脈により確認が望ましい表現の **初期スクリーニング**（違反の断定はしません）
- 初診数 MMM を始めるために **どのデータが足りないか** を可視化
- レポートは localStorage 保存・JSON ダウンロード・ブラウザ印刷（PDF保存）に対応

### 無料版 MVP でできないこと（＝断定しないこと）

- 真の初診 CPA の算出
- 各施策の初診数への寄与度の断定
- 広告費対効果・実成果（電話予約・直接来院を含む）の測定
- 医療広告ガイドラインへの適合性の保証・法的判断
- Google マップの口コミ数・評価点・GBP インサイト等の取得（非公式スクレイピングは行いません）

---

## 有料版 MMM 構想（将来）

有料版では、クリニック版 **MMM（マーケティング・ミックス・モデリング）** を提供する構想です。

- **目的変数**: 日別初診数
- **説明変数**: HP記事、Google広告、YouTube、Instagram、TikTok、ポスティング、MEO、休診日、曜日、祝日、天気 など
- **アウトプット**: 施策別の初診寄与の推定、施策別の推定CPA、来月の施策提案、予算配分提案

MVP のUI上には、有料版への自然な導線（`/about-mmm` ページ、結果ページの CTA）を設けています。

---

## 技術スタック

| 領域 | 採用技術 |
| --- | --- |
| フロントエンド | Vite + React + TypeScript |
| スタイリング | Tailwind CSS |
| ルーティング | React Router |
| サーバーサイド | Netlify Functions（TypeScript, esbuild バンドル） |
| HTML パース | node-html-parser |
| デプロイ | Netlify |
| DB | なし（localStorage / JSON ダウンロードで保持） |
| 認証・決済 | なし（MVP） |

---

## ディレクトリ構成

```txt
clinic-growth-intelligence/
  README.md
  netlify.toml            # Netlify ビルド / Functions / リダイレクト設定
  package.json
  tsconfig*.json          # プロジェクト参照（app / node / functions）
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  index.html
  .env.example
  src/
    main.tsx / App.tsx
    routes/               # HomePage / AuditPage / ResultsPage / SamplePage / AboutMMMPage
    components/           # Header, Footer, Hero, AuditForm, ScoreCard, ... など
    lib/
      types.ts            # フロント・バック共通の型
      scoring.ts          # ルールベースのスコアリングエンジン（純粋関数）
      sampleReport.ts     # /sample 用サンプルレポート
      utils.ts / api.ts
    styles/globals.css
  netlify/
    functions/
      analyze.ts          # POST /.netlify/functions/analyze
      health.ts           # GET  /.netlify/functions/health
      lib/
        safeFetch.ts      # SSRF 対策付き fetch
        parseWebsite.ts   # クロール + HTML パース
        scoreWebsite.ts   # スコア組み立て（scoring.ts を利用）
        pagespeed.ts      # PageSpeed Insights（任意）
        youtube.ts        # YouTube Data API（任意）
        medicalAdRisk.ts  # 医療広告リスクの初期スクリーニング
        mmmReadiness.ts   # MMM 準備度パネル組み立て
```

> **型の共通化**: `src/lib/types.ts` と `src/lib/scoring.ts` をフロントと Netlify Functions の双方から参照しています（Functions は esbuild でバンドルされます）。

---

## セットアップ / ローカル起動

前提: Node.js 20 以上推奨。

```bash
# 依存インストール
npm install

# 環境変数ファイルを用意（任意のAPIキーは空でもOK）
cp .env.example .env

# フロントエンド開発サーバー（http://localhost:5173）
npm run dev
```

### Netlify Functions も含めてローカルで動かす場合

フロントの `npm run dev` だけでは Netlify Functions は起動しません。
`/.netlify/functions/analyze` を含めてローカル検証するには Netlify CLI を使います。

```bash
npm install -g netlify-cli
netlify dev        # フロント + Functions を同時に起動（http://localhost:8888）
```

### スクリプト

```bash
npm run dev        # 開発サーバー
npm run build      # tsc -b && vite build（本番ビルド）
npm run preview    # ビルド成果物のプレビュー
npm run typecheck  # 型チェックのみ
npm run lint       # ESLint
```

---

## 環境変数

`.env.example` を参照してください。

| 変数 | 用途 | 露出範囲 |
| --- | --- | --- |
| `PAGESPEED_API_KEY` | PageSpeed Insights API（任意） | **サーバー（Functions）のみ** |
| `YOUTUBE_API_KEY` | YouTube Data API v3（任意） | **サーバー（Functions）のみ** |
| `VITE_APP_NAME` | アプリ表示名 | クライアント（公開） |
| `VITE_CONTACT_EMAIL` | 問い合わせ用メール（CTAの mailto 先） | クライアント（公開） |

> `PAGESPEED_API_KEY` / `YOUTUBE_API_KEY` は **`VITE_` 接頭辞を付けない** ことでクライアントに露出しません。
> Netlify 側では **Site settings → Environment variables** に設定してください。

---

## Netlify デプロイ手順

1. 本リポジトリを GitHub に push する
2. Netlify で **Add new site → Import an existing project** を選び、対象リポジトリを連携
3. ビルド設定は `netlify.toml` により自動認識されます
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. 必要に応じて環境変数（`PAGESPEED_API_KEY`, `YOUTUBE_API_KEY`, `VITE_CONTACT_EMAIL` 等）を設定
5. Deploy を実行

`netlify.toml` では、Functions のパス（`/.netlify/functions/*`）を SPA fallback より先に評価し、
それ以外は `index.html` に返す SPA ルーティングを設定しています。

---

## Netlify Functions の説明

- `POST /.netlify/functions/analyze`
  - 入力: `AuditInput`（JSON）
  - 出力: `{ ok: true, report: AuditReport }` または `{ ok: false, error: string }`
  - 処理: 入力検証 → HP解析（SSRF対策付き fetch + クロール）→ 任意のPageSpeed/YouTube連携 → ルールベース採点 → レポート生成
- `GET /.netlify/functions/health`
  - 稼働確認。APIキーの **有無（boolean）** のみ返し、値は返しません。

---

## APIキーなしでの挙動

- **APIキーが未設定でも診断は動作します。**
  - `PAGESPEED_API_KEY` 未設定 → `pagespeed.status = "skipped"`
  - `YOUTUBE_API_KEY` 未設定 → `youtube.status = "skipped"`（YouTube URL 入力は「確認済み」として扱う）
- 外部API が失敗・レート制限・タイムアウトになっても、**診断全体は落とさず** `"failed"` 状態を保持して継続します。
- **HP URL の取得に失敗しても結果は返ります**（「サイト取得に失敗しましたが、入力情報をもとに可能な範囲で診断しました」と表示）。
- APIキーや実URLがなくても、`/sample` で診断結果の見え方を確認できます。

---

## セキュリティ上の注意

- **SSRF 対策**: `netlify/functions/lib/safeFetch.ts`
  - `http` / `https` のみ許可
  - `localhost` / `127.0.0.0/8` / `10.0.0.0/8` / `172.16.0.0/12` / `192.168.0.0/16` / `169.254.0.0/16`（メタデータIP含む）/ `0.0.0.0` / CGNAT / IPv6 ローカルアドレス を遮断
  - ホスト名は DNS 解決して **全解決先IPを検証**、リダイレクトは手動追跡して各ホップを再検証
  - **fetch タイムアウト** と **最大レスポンスサイズ制限**（既定 2MB）
- **入力サニタイズ**: サーバー側で制御文字除去・最大長制限・不正URLの除外を実施
- **XSS 対策**: 表示は React が既定でエスケープ。危険な `dangerouslySetInnerHTML` は不使用
- **APIキー秘匿**: `PAGESPEED_API_KEY` / `YOUTUBE_API_KEY` は Functions 側のみで使用し、クライアントに出しません
- **患者個人情報**: 入力フォームに注意文を明示。患者個人情報は入力しないでください
- **免責**: 本診断は法的適合性の保証ではなく、改善の参考情報です

---

## 今後のロードマップ

1. **有料版 MMM の実装**: 日別初診数を目的変数とした時系列モデル、施策別寄与・推定CPA・予算配分提案
2. **データ連携**: GA4 / Search Console / Google 広告 / YouTube Analytics / Google ビジネスプロフィール
3. **永続化と認証**: レポート保存用 DB、医療機関アカウント、履歴比較
4. **診断ロジックの高度化**: LLM による所見要約・改善提案、疾患別ページ構造のより精緻な検出
5. **PDF 生成の自動化**: サーバーサイドでの整形済みPDF出力

---

### ライセンス / 位置づけ

本リポジトリは MVP です。外部から観測可能な情報のみを対象とした診断であり、
医療広告の適合性や施策効果を保証・断定するものではありません。
