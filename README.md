# ちいさな手Saki — 手書き命名書オーダーサイト

手書き（毛筆）の命名書を受注販売するための静的1ページサイトです。商品紹介と、お名前・生年月日を入力すると仕上がりイメージを縦書きで表示する「命名書プレビュー」、注文内容テキストの自動生成・コピー機能を備え、決済はSTORES（ https://chiisanatesaki.stores.jp ）へのリンクで行います。ビルドツールやnpmパッケージには依存しないvanilla HTML/CSS/JS構成で、GitHub Pagesで無料公開できます。個人情報はサイトから一切送信・保存しません（プレビュー入力はブラウザ内で完結します）。

## ファイル構成

```
小さな手Saki/
├── index.html              … ページ本体（全セクションのHTMLと文言）
├── css/style.css           … デザイン一式
├── js/config.js            … ストアURL・商品ページURLの設定（後日差し替えるのはここだけ）
├── js/wareki.js            … 和暦変換（純粋関数）
├── js/pricing.js           … 価格計算（純粋関数）
├── js/order-text.js        … 注文テキスト生成（純粋関数）
├── js/app.js               … プレビュー・コピー・リンクのDOM配線
├── assets/                 … 商品・見本写真（EXIF除去済み）、SNSアイコン、favicon
├── tests/                  … Node組み込みテストランナー用テスト
├── STORES設定手順書.md      … STORES側の設定手順（ユーザー作業用）
└── README.md               … このファイル
```

## ローカルでの動作確認

プロジェクト直下で簡易サーバーを起動し、ブラウザで開きます。

```bash
cd "$HOME/AIの作業場/小さな手Saki"
python3 -m http.server 4173
```

ブラウザで http://localhost:4173 を開くとサイトが表示されます。終了するにはターミナルで `Ctrl + C` を押します。

※ `index.html` をダブルクリックで直接開くと、ES Modules の制約で JavaScript が動かない場合があります。必ず上記のサーバー経由で確認してください。

## テストの実行

和暦変換・価格計算・注文テキスト生成の全テストを実行します。

```bash
cd "$HOME/AIの作業場/小さな手Saki"
node --test
```

すべて PASS になることを確認してください（依存パッケージのインストールは不要です）。

## 公開（GitHub Pages）

- 公開先: Organization **chiisanatesaki** のリポジトリ `chiisanatesaki.github.io`
- 公開URL: **https://chiisanatesaki.github.io/**
- 公開リポジトリには**匿名の単一コミット**のみを置く運用です（個人名・メールを含むコミット履歴、ローカルパス入りの内部文書・docs はpushしない）

### 更新を公開へ反映する

1. ローカルで変更し、`node --test` が全件PASSすることを確認
2. Claudeに「サイトを公開に反映して」と依頼 → 匿名スナップショットを作り直してpushします（push前に確認があります）
3. 数分でサイトに反映されます

## 写真の追加・差し替え方法

実物写真は導入済みです（`assets/photo-*.jpg`）。新しい写真を追加・差し替えたいときは、写真ファイルをプロジェクト直下に置いて Claude に「この写真をサイトに入れて」と依頼してください。Web用のリサイズ・圧縮と**EXIF（位置情報など）の除去**まで行ってから `assets/` に配置します。

自分で行う場合は、公開前に写真の位置情報が消えていることを必ず確認してください（スマホ撮影の写真には自宅の緯度経度が入っていることがあります）。

## STORES商品ページURLの設定（STORES登録後）

STORESに商品を登録すると各商品ページのURLが確定します。`STORES設定手順書.md` の手順7に沿ってURLをClaudeへ共有すると、`js/config.js` の `PRODUCT_URLS` を実URLに差し替えます。差し替えるまでの間、「STORESで注文する」ボタンはストアのトップページ（ https://chiisanatesaki.stores.jp ）へ誘導します。
