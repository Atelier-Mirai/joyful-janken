# じゃんけんゲーム

HTML・CSS・JavaScript だけで作ったじゃんけんゲームです。ビルドや外部ライブラリを使わず、`index.html` をダブルクリックすれば遊べます。Web 制作を学び始めた人の教材として、初心者向けのシンプル版と、PWA と成績管理を備えた本格版を用意しています。

## 遊び方

| 版 | 開くファイル | 内容 |
| --- | --- | --- |
| シンプル版 | `simple-index.html` | 手を選ぶと、その場で勝敗が決まる。スコアとリセットだけの最小構成 |
| 本格版 | `index.html` | コンピュータの手がシャッフルされ、手を選んで勝負する。成績の保存・ファイル入出力・オフライン対応 |

どちらも `file://` で直接開けます。本格版からシンプル版へのリンクはないので、シンプル版は `simple-index.html` を直接開いてください。

PWA（ホーム画面への追加・オフライン動作）を試すときは、ローカルサーバーで開きます。Service Worker は `file://` では動きません。

```sh
ruby -run -e httpd . -p 8000
# http://localhost:8000/ を開く
```

## 本格版の機能

- **対戦成績の自動保存** — 勝ち・負け・あいこの合計と、直近 100 戦の履歴を `localStorage` に保存します。勝率（あいこを除く）と連勝数も表示します。
- **ファイルへの書き出し** — 成績を `janken-record-YYYY-MM-DD.json` として保存します。
- **ファイルからの読み込み** — 書き出したファイルを、別の端末やブラウザで読み込めます。形式・版・勝敗の整合性・合計との矛盾・サイズを確かめ、問題があれば理由を表示して読み込みません。いまの成績を置き換える前には確認します。
- **PWA** — Web App Manifest と Service Worker で、ホーム画面への追加とオフラインでのプレイに対応します。新しい版を公開すると「更新する」ボタンが表示されます。
- **画面に合わせた配置**
  - 広い画面（60rem 以上）では、対戦と成績を左右に並べ、2 枚の高さを揃えます。履歴の欄は残りの高さを埋め、収まらない分は欄の中でスクロールして見られます。
  - スマートフォンでは、対戦画面を 1 画面に収め、上に勝ち・負け・あいこの小さな集計を出します。成績は「成績」ボタンで下から開くパネルに表示します。× ボタン・Esc キー・パネルの外を押すと閉じます。
- **BGM と効果音** — 右上のボタンで ON/OFF を切り替えられ、設定は保存されます。
- **ダークモード**、**キーボード操作**、**動きを減らす設定**（`prefers-reduced-motion`）に対応しています。

### 動作を確かめた画面サイズ

| 画面 | 配置 | 最初から見える履歴 |
| --- | --- | --- |
| iPhone SE（375×667、Safari では約 375×550） | 1 列・成績はパネル | ― |
| iPad mini（744×1133） | 1 列・成績はパネル | ― |
| iPad Pro 縦（1032×1376） | 2 列 | 16 件 |
| iPad Pro 横（1376×1032） | 2 列 | 8 件 |
| パソコン（1440×900） | 2 列 | 5 件 |
| ノート PC（1280×720） | 2 列（少しスクロール） | 3 件 |

### 成績ファイルの形式

```json
{
  "app": "joyful-janken",
  "version": 1,
  "savedAt": "2026-09-26T13:10:00.000Z",
  "totals": { "win": 3, "lose": 3, "draw": 1 },
  "history": [
    { "at": "2026-09-26T13:09:12.345Z", "player": "guu", "computer": "choki", "result": "win" }
  ]
}
```

手は `guu`・`choki`・`paa`、勝敗はプレイヤーから見た `win`・`lose`・`draw` です。`totals` は全対戦の合計、`history` は新しい 100 件までの記録です。

## ファイル構成

```
.
├── index.html              # 本格版
├── simple-index.html       # シンプル版
├── manifest.webmanifest    # PWA の設定（アプリ名・アイコン）
├── sw.js                   # Service Worker（スコープの都合でルートに置く）
├── LICENSE                 # MIT ライセンス
├── stylesheets/
│   ├── style.css           # 本格版
│   └── simple.css          # シンプル版
├── javascripts/
│   ├── app.js              # 本格版
│   └── simple.js           # シンプル版
├── images/                 # 手の画像・アイコン
└── sounds/                 # BGM・効果音
```

## 学習のポイント

### 読む順番

1. **シンプル版**（`simple-index.html` → `simple.css` → `simple.js`）で、ボタンを押す → データを変える → 画面を更新する、という基本の流れをつかむ。
2. **本格版**（`index.html` → `app.js` → `style.css` → `sw.js`）で、同じ流れに保存・ファイル・PWA が加わる様子を見る。本格版のコメントは、初めて出てくる仕組みと、そう書いた理由を中心に説明しています。

### HTML

- `data-ui`（表示する部品）と `data-action`（操作する部品）で JavaScript とつなぐ
- `<dialog>`、`<dl>`、`<time>` などの意味のある要素
- `role="status"`・`aria-pressed`・`aria-expanded`・`aria-label` で、状態を読み上げに伝える
- アイコンは `<symbol>` にまとめ、`<use>` で呼び出す

### CSS

- カスケードレイヤー（`@layer`）で、層の順番によって優先順位を決める
- ネスト、論理プロパティ（`inline-size`・`margin-inline` など）、レンジ記法のメディアクエリ（`width >= 60rem`）
- カスタムプロパティと `color-mix()` による配色と、ダークモード
- `clamp()`・`min()`・`dvh` で、画面の幅と高さに合わせて大きさを変える
- Grid と Flexbox（`flex: 1 1 0` で残りの高さを埋める）
- コンテナクエリと `cqi`、`:has()`
- 状態は JavaScript から `data-state` やクラスで受け取り、見た目の切り替えは CSS に任せる

### JavaScript

- 状態をデータとして持ち、描画関数でまとめて画面へ反映する設計
- クラス：`#` で始まるプライベートメンバー、`static` メソッド、ゲッター・セッター、`toJSON()`
- `requestAnimationFrame` で、画面の更新頻度に左右されないアニメーションを作る
- `localStorage` への保存と、読み込んだ値の検証
- `Blob` と一時 URL で書き出し、`file.text()` で読み込む
- `async` / `await` と Promise（`<dialog>` で「はい／いいえ」を待つ）
- `matchMedia()`・`inert`・`storage` イベント

### PWA

- Web App Manifest
- Service Worker の `install`・`activate`・`fetch` と、キャッシュの版の上げ方
- 新しい版への更新の流れと、音声の Range リクエストへの対応

### 書き方の約束

- 名前を付けて使う関数は `function` 宣言、ほかの関数に渡す処理はアロー関数、クラスの中はメソッド記法
- `if` や `for` は、1 行でも `{}` を付ける
- 画面の部品は `document.querySelector()` で探す
- クラス名はハイフン区切り（`.history-item`・`.button-primary`）。状態は `is-` を付けたクラスか `data-*` 属性で表す
- シンプル版はスクリプトが 1 本なので、即時関数で包まない。本格版は途中で処理を止める箇所があるので、即時関数で包む

## ブラウザサポート

Google Chrome・Microsoft Edge・Safari・Firefox の最新版を対象にしています。メッセージを文節の切れ目で折り返す指定（`word-break: auto-phrase`）は Chrome・Edge だけで効き、ほかのブラウザでは通常の折り返しになります。

## 使用素材

### BGM
- **夏休みの探検**
  [甘茶の音楽工房](https://amachamusic.chagasi.com/)より

### 効果音
- **勝利時**：「やったーー！」
  声優: 音枝優日
  [効果音ラボ](https://soundeffect-lab.info/)より
- **敗北時**：「負けました...」
  声優: 藤堂れんげ
  [効果音ラボ](https://soundeffect-lab.info/)より
- **あいこ時**：「まだまだ！」
  声優: IC
  [効果音ラボ](https://soundeffect-lab.info/)より

## ライセンス

[MIT ライセンス](LICENSE)で公開しています。ただし、BGM と効果音の利用条件は、それぞれの配布元の規約に従います。

© 2022–2026 アトリヱ未來

## デモ

[デモをプレイする](https://joyful-janken.netlify.app)

## 開発者

[アトリヱ未來](https://github.com/Atelier-Mirai/joyful-janken)

## 貢献方法

バグレポートやプルリクエストを歓迎します。

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/AmazingFeature`）
3. 変更をコミット（`git commit -m 'Add some AmazingFeature'`）
4. ブランチにプッシュ（`git push origin feature/AmazingFeature`）
5. プルリクエストを開く
