# discord-codex

## 環境構築

### 前提条件

以下がインストールされていること：

- [Nix](https://nixos.org/download/) (2.4以上)
- [direnv](https://direnv.net/)

### 1. Nix Flakesの有効化

`~/.config/nix/nix.conf`を作成（または編集）し、以下を追加します：

```
experimental-features = nix-command flakes
```

すでに設定済みの場合は不要です。以下のコマンドで確認できます：

```bash
nix flake --help
```

### 2. シェルフックの設定

`~/.zshrc`に以下を追加します：

```zsh
eval "$(direnv hook zsh)"
```

追加後、ターミナルを開き直すか `source ~/.zshrc` を実行してください。

### 3. リポジトリのクローン

```bash
git clone https://github.com/yukihito-jokyu/discord-codex.git
cd discord-codex
```

### 4. direnvの許可

```bash
direnv allow
```

`use flake` と `dotenv` が実行され、開発環境が自動で構築されます。
初回はNixのパッケージダウンロードが行われるため時間がかかります。

### 5. 環境変数の設定

```bash
cp .env.example .env
```

`.env`に必要な環境変数を記述してください。

### 動作確認

```bash
node --version   # v22.x.x
pnpm --version   # 10.x.x
task --version   # 3.x.x
```

## PR Agent

PRのコメント欄で以下のコマンドを入力すると、AIが自動で処理します。

| コマンド      | 説明                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| `/review`     | コードレビューを実施し、バグ・セキュリティ・パフォーマンス等の問題を指摘 |
| `/describe`   | PRのタイトル・サマリー・変更内容を自動生成                               |
| `/improve`    | コードの改善提案（可読性・効率・ベストプラクティスの観点）               |
| `/ask "質問"` | PRのコードに対して自由に質問                                             |
