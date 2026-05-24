# Re:che キャンペーン 申込フォーム（GitHub × 公式LINE × GAS）

プロLINE不要・**完全無料**で「申込フォーム → やる気判定 → 公式LINE誘導 → 誰が回答したか自動記録」を実現する仕組み。

## 仕組み（全体図）

```
①GitHubサイト（index.html）= フォーム＋LINEログイン
        ↓ 回答を送信（LINEユーザーIDも一緒に）
②GAS（Code.gs）= 判定＋スプシ保存
        ↓
   ┌─ 承認（参加=本気/できる範囲 かつ スクール=検討/迷い中）→ 公式LINE追加ボタン表示
   ├─ 見送り（参加=様子見 または スクール=考えていない）→ お断り画面（LINEに飛ばさない）
   └─ 承認が100名超え → 「満員」→ 受付終了画面
        ↓
③スプレッドシート = 誰が(本名+LINE名+ユーザーID)回答したか全記録
```

**ポイント：** LINEログインで回答時点にLINEユーザーIDを取得するので、公式LINE追加後に「誰が登録したか」が確実にわかる（相手の返信に依存しない）。

---

## くみこがやる作業（この順番で）

### STEP 1. GitHubでサイトを公開
1. GitHubで新規リポジトリを作成（例：`reche-campaign`、Public）
2. `index.html` をアップロード
3. リポジトリの Settings → Pages → Branch を `main` / `root` にして Save
4. 数分後に公開URLが出る（例：`https://ユーザー名.github.io/reche-campaign/`）→ **このURLを控える**

### STEP 2. LINE Developers設定
> ⚠️ **重要：** LINEログイン用チャネルは、いまの公式LINE（Messaging API）と**同じプロバイダーの中**に作ること。別プロバイダーだとユーザーIDが一致せず突合できません。

1. [LINE Developers](https://developers.line.biz/) にログイン
2. 公式LINEがあるプロバイダーを開く（なければ新規作成）
3. 「新規チャネル作成」→ **LINEログイン** を選ぶ
4. 作成後、チャネル内の **LIFF** タブ →「追加」
   - エンドポイントURL：**STEP 1 のGitHub PagesのURL**
   - サイズ：`Full`
   - Scope：`profile` にチェック
5. 発行された **LIFF ID** を控える（例：`2001234567-xxxxxxxx`）
6. 公式アカウントの **友だち追加URL** を控える（LINE Official Account Manager → 友だち追加ガイド、または `https://lin.ee/xxxx`）

### STEP 3. GAS（バックエンド）設定
1. [script.google.com](https://script.google.com/) で新規プロジェクト
2. `gas/Code.gs` の中身を全部貼り付けて保存
3. 上部の関数選択で `setup` を選び ▶ 実行（初回は権限承認が出る → 許可）
   - 実行ログに「スプシ作成完了 ▶ URL」が出る → **このスプシが応募者管理表**
4. 右上「デプロイ」→「新しいデプロイ」→ 種類：**ウェブアプリ**
   - 実行ユーザー：**自分**
   - アクセスできるユーザー：**全員**
5. 発行された **ウェブアプリURL（末尾 /exec）** を控える

### STEP 4. index.htmlに3つの値を入れて再アップ
`index.html` の上部の3行を、STEP 1〜3で控えた値に差し替える：
```js
const LIFF_ID       = "ここにLIFF ID";
const GAS_URL       = "ここにGASウェブアプリURL(/exec)";
const LINE_ADD_URL  = "ここに公式LINE友だち追加URL";
```
→ 保存して GitHub に再アップロード。**完成。**

---

## テスト方法
1. スマホ or PCで GitHub PagesのURLを開く
2. LINEログイン → フォーム入力
3. 「本気/できる範囲」で送信 → 公式LINE追加ボタンが出る／「様子を見たい」で送信 → お断り画面
4. 応募者管理スプシに行が追加されていればOK

## 運用
- 応募状況は**スプレッドシート**を見るだけ。`ステータス`列で 承認/見送り/満員 が一目でわかる
- `LINEユーザーID`＋`本名`＋`LINE名`が並ぶので、公式LINEの誰が誰か照合できる
- 定員は `Code.gs` の `CAPACITY = 100` で変更可

## Phase2（任意・あとで強化）
公式LINEに「**実際に追加したか**」まで自動でチェックマークを付けたい場合は、Messaging APIのWebhook（friend follow）を受けて、スプシの`公式LINE追加`列を更新する処理を足せる。必要になったら声かけて。

## ファイル
- `index.html` … フォーム本体（GitHub Pagesに置く）
- `gas/Code.gs` … バックエンド（GASに貼る）
- `README.md` … この手順書
