# Neco Clinic Report

> リポジトリ名 `clinic-growth-intelligence` は **内部名** です。外向きのプロダクト名は **Neco Clinic Report** です。

医療機関向けの **無料の外部集患力診断サービス** です。
クリニックが自院の HP URL・GoogleマップURL・YouTube・Instagram・TikTok などを入力すると、
**外部から観測できる範囲で** 「集患力」「HP導線」「SEO/コンテンツ」「MEO準備度」「SNS接続」「医療広告スクリーニング」「MMM準備度」を自動診断し、改善提案を返します。

## ブランド体系

| 名称 | 位置づけ |
| --- | --- |
| **Neco Clinic Report** | プロダクト全体 |
| **Clinic Report Free** | URLベースの無料診断（本リポジトリで提供） |
| **Clinic Report Analytics** | 実データ連携による有料の分析プラットフォーム（将来提供） |
| **Clinic Report MMM** | 初診数に対する施策寄与推定機能（Clinic Report Analytics 上の最初の分析機能） |

> **重要な前提**
> 外部URLだけでは、真のマーケティング効果・実際の初診CPA・新患数への寄与・広告費対効果・直接来院を含めた実成果は算出できません。
> 本サービスは「**効果測定**」ではなく、「**外部から見える集患力診断**」「**MMM準備診断（施策効果測定のための事前監査）**」として設計しています。
> 無料版では **真の初診CPAや初診寄与は算出・断定しません。**

> 📖 **プロダクト哲学**: 機能追加・コピー作成・スコアリング変更の前に、
> [**docs/product-philosophy.md**](docs/product-philosophy.md) を必ずお読みください。
> 「絶対原則（Non-negotiable Principles）」「何であって何でないか」「Freeが主張してはならないこと」
> 「未入力・取得失敗・医療広告スクリーニングの原則」「スコアの意味論」「コピーライティングのガードレール」を定義しています。
> フェーズ計画は [docs/roadmap.md](docs/roadmap.md) に分離しています。

---

## 目次

- [プロダクト哲学（docs/product-philosophy.md）](docs/product-philosophy.md)
- [ロードマップ（docs/roadmap.md）](docs/roadmap.md)
- [事業としての位置づけ](#事業としての位置づけ)
- [できること / できないこと](#できること--できないこと)
- [有料版 MMM 構想](#有料版-mmm-構想将来)
- [医療広告スクリーニングの限界](#医療広告スクリーニングの限界)
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

## 事業としての位置づけ

### この無料版は何を診断するのか

医療機関が入力した **HP URL・GoogleマップURL・各種SNS URL** をもとに、
**外部から観測できる範囲** で「集患の土台」を横断診断します。具体的には、

- **HP集患導線** … 広告・SNS・検索から流入した患者が、予約・来院まで進める導線になっているか
- **SEO/医療コンテンツ** … 診療科ごとの症状・疾患で検索する患者に届くページ設計になっているか
- **MEO準備度** … Googleビジネスプロフィールを活かす土台（住所・電話・診療時間・地図リンク）がHPに整っているか
- **SNS集患接続** … YouTube/Instagram/TikTok/LINE がHP・予約と相互に接続されているか
- **医療広告スクリーニング** … 文脈により確認が望ましい表現の初期スクリーニング（断定はしない）
- **MMM準備度** … 施策効果測定（初診数MMM）を始めるためのデータがどれだけ揃っているか

診断結果は、院長・事務長がそのまま読める **レポート形式**（総合スコア／ランクA〜D／
今すぐ直すべき3点／チャネル別コメント）で提示します。

### なぜ外部URLだけでは「真のCPA」を出さないのか

初診がどの施策の効果で生まれたかは、外部から観測できるHP・SNSの構造だけでは分かりません。
実際の初診数への寄与や初診CPA（顧客獲得単価）を出すには、少なくとも次が必要です。

1. **目的変数** … 日別の初診数（電話予約・直接来院を含む実来院）
2. **説明変数の時系列** … 広告費・投稿日・コラム公開日・ポスティング・休診日・曜日・祝日・天気 など
3. **突き合わせ** … 上記を日単位で並べ、統計的に寄与を分解する処理

無料版はこれらの実データを持たないため、CPAや寄与度を **推定も断定もしません**。
代わりに「外部から見える集患ボトルネック」と「MMMを始めるための準備度」を可視化し、
**次に何を計測すべきか** を明確にします。これが無料版のコアバリューです。

### Clinic Report Analytics（有料版）では何を実現するのか

**Clinic Report Analytics** では、上記の実データを連携し、**Clinic Report MMM**（クリニック版 MMM = マーケティング・ミックス・モデリング）を行います。

- 日別初診数を **目的変数**、HP記事・Google広告・YouTube・SNS・ポスティング・MEO・休診日・曜日・祝日・天気などを **説明変数** としてモデル化
- **どの施策が初診数にどれだけ寄与したか** を推定
- 施策別の **推定CPA**、来月の施策提案、予算配分提案を提示

Clinic Report Free の診断結果は、この Clinic Report Analytics に進むための **オンボーディング**（準備度チェックと不足データの棚卸し）として機能します。

### Neco / 医療機関支援への応用余地

本SaaSは、医療機関支援（集患・経営支援）の入口ツールとして設計しています。

- **リード獲得**: 無料診断は、医療機関が自発的にHP/SNS情報を入力する自然な接点になります
- **商談の共通言語**: スコアと「今すぐ直すべき3点」は、担当者と院長・事務長が同じ画面を見て改善を合意するための資料になります
- **継続支援への接続**: MMM準備度の可視化により、単発の制作・広告運用ではなく、データに基づく継続的な集患改善（有料MMM）へ自然に接続できます
- **拡張性**: 診療科別の症状辞書・スコアリングはデータ駆動で追加でき、支援対象の診療科拡大に対応しやすい構造です

---

## できること / できないこと

### 無料版（Clinic Report Free）でできること

- HP URL を入力するだけで、外部から見える集患上の弱点を診断
- **HP集患導線 / SEO・医療コンテンツ / MEO準備度 / SNS集患接続 / 医療広告スクリーニング / MMM準備度** を横断診断
- **診療科別（内科・整形外科・小児科・皮膚科・耳鼻科・眼科・婦人科・心療内科/精神科・歯科）の症状辞書** に基づき、不足している症状別ページを具体名で指摘
- 総合スコア（0–100）とランク（A/B/C/D）、スコア内訳を表示
- 「今すぐ直すべき3点」（なぜ重要か／何を直すか／改善の狙い／難易度／優先度）「伸ばせる余地が大きい3点」「チャネル別コメント」を提示
- 医療広告上、文脈により確認が望ましい表現の **初期スクリーニング**（違反の断定はしません）
- 初診数 MMM を始めるために **どのデータが足りないか** を可視化
- レポートは localStorage 保存・ブラウザ印刷（PDF保存）に対応（PDFの初期ファイル名は診断ごとにユニーク）

### 無料版（Clinic Report Free）でできないこと（＝断定しないこと）

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

無料版のUI上には、有料版への自然な導線（`/about-mmm` ページ、結果ページの CTA）を設けています。

---

## 医療広告スクリーニングの限界

本サービスの医療広告スクリーニングは、**単語ベースの初期スクリーニング** です。以下の限界を理解してご利用ください。

- **違反・違法の判定ではありません。** 医療広告ガイドライン上、文脈によっては確認が望ましい表現を機械的に抽出しているだけで、法的判断・適合性の保証は行いません。
- **文脈は完全には判定できません。** 同じ単語でも、前後の説明や打消し表現によって問題の有無は変わります。本ツールは検出した文脈スニペットを提示しますが、最終判断は行いません。
- **見逃し・過検出があります。** 画像内の文言・動的に描画されるテキスト・取得できなかったページは対象外です。逆に、問題のない用法まで「要確認」として拾う場合があります。
- **推奨対応はあくまで参考です。** 表示する「注意理由」「推奨対応」は改善の方向性の例示であり、最終確認は **医療広告ガイドラインや専門家（弁護士・広告審査等）** を前提としてください。

この方針に沿って、UI上でも「違反です」「修正必須です」などの断定表現は使用せず、「要確認表現」「確認が望ましい可能性」という表現に統一しています。

---

## レポートの保存と共有

- **PDF保存 / 印刷**: 一般ユーザー向けの主要な保存手段です。ブラウザの印刷ダイアログから「PDFに保存」を選びます。
  - PDFの初期ファイル名は `document.title` に依存するため、レポート表示中はタイトルを
    `NecoClinicReport_<医療機関名またはhostname>_<YYYYMMDD-HHMM>_<短縮ID>` に差し替えて、
    **診断ごとにユニークなファイル名**になるようにしています（既存PDFの上書きを防止）。
  - きれいに保存するには、印刷設定で「ヘッダーとフッター」をオフ、「背景グラフィック」をオンにしてください。
- **JSONダウンロードは開発 / デバッグ用途** です。
  - **一般ユーザー向けの共有手段ではありません。** 本番UIには表示せず、開発環境（`import.meta.env.DEV`）でのみ
    「開発用: JSONを保存」ボタンを表示します。
  - `downloadReportJson()` / `buildReportFileBaseName()` は内部関数として残しています。
- **将来計画**: レポートの共有は、`/reports/:id` による共有URL＋サーバー側保存に置き換える予定です
  （現状はクライアント状態・localStorage・PDF/JSONにとどめています）。

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
| 認証・決済 | なし（現時点では未実装） |

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
        medicalAdRisk.ts  # 医療広告表現の初期スクリーニング
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
- **HP URL の取得に失敗しても結果は返ります**。ただしサイト品質の低さとしては扱わず、総合スコア・ランクは「評価不能」とし、
  取得失敗専用の次アクション（URL確認・情報追加・Botブロック確認）を案内します（詳細は [docs/product-philosophy.md](docs/product-philosophy.md) §5）。
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

> 段階計画（Free → CSVベースMMM → API連携）の詳細は [docs/roadmap.md](docs/roadmap.md) を参照してください。

1. **Clinic Report Analytics / Clinic Report MMM の実装**: 日別初診数を目的変数とした時系列モデル、施策別寄与・推定CPA・予算配分提案
2. **データ連携**: GA4 / Search Console / Google 広告 / YouTube Analytics / Google ビジネスプロフィール
3. **永続化と認証**: レポート保存用 DB、医療機関アカウント、履歴比較
4. **診断ロジックの高度化**: LLM による所見要約・改善提案、疾患別ページ構造のより精緻な検出
5. **PDF 生成の自動化**: サーバーサイドでの整形済みPDF出力
   - 短期: ブラウザ印刷（現行）。印刷ダイアログで「ヘッダーとフッター」オフ・「背景グラフィック」オンを推奨（UI上にも案内を表示）
   - 中期: `/report-print` のような印刷専用ルートを用意し、画面用UI（ボタン・CTA・折りたたみ）を含まないレイアウトで出力する
   - 将来: レポート共有URL `/reports/:id`（永続化とセット）+ サーバーサイドPDF生成（Playwright / Puppeteer 等）で、ブラウザ設定に依存しない提出用PDFを配布する

---

### ライセンス / 位置づけ

本リポジトリは無料版（Clinic Report Free）の実装です。外部から観測可能な情報のみを対象とした診断であり、
医療広告の適合性や施策効果を保証・断定するものではありません。
