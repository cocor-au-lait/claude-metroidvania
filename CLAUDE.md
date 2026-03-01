# CLAUDE.md — Claude Code 作業指示

Claude Code がセッション開始時に自動で読み込む設定ファイル。
ゲーム仕様の正典は [docs/spec.md](docs/spec.md) を参照すること。

## ワークフロー

- フェーズごとにブランチ（`phase/N-name`）を切り、コミット・プッシュ・PR を作成する
- コミット前に実装内容をユーザーへ示し、確認を取ってからコミットする
- ブランチ命名規則: `phase/N-description` / `fix/description` / `add/description`
- **新ブランチは必ず `origin/master` ベースで作成する**（前フェーズ PR がマージ済みかを `git fetch origin` で確認してから）
- PR コンフリクト発生時は `git rebase origin/master && git push --force-with-lease` で解消する

## 技術制約

- タイルマップはコードで生成（Tiled エディタ不使用）
- グラフィックは仮素材（矩形・色付きスプライト）で可
- サウンドは省略可
- モバイル対応は対象外

## 定数の置き場所

ゲームパラメータ（画面サイズ・プレイヤー速度など）はすべて `src/config.ts` で管理する。
