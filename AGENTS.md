# AGENTS.md

## Nix管理コマンド

以下のツールはNix dev shell内でのみ利用可能です。
ターミナルでは `direnv allow` 済みであれば自動的に有効になります。

AIエージェント（Claude Code等）から実行する場合は、必ず `nix develop --command` を前置してください。

```bash
nix develop --command <command>
```

### コマンド一覧

| コマンド       | 用途                     | 実行例                                              |
| -------------- | ------------------------ | --------------------------------------------------- |
| `node`         | JavaScriptランタイム     | `nix develop --command node --version`              |
| `pnpm`         | パッケージマネージャ     | `nix develop --command pnpm install`                |
| `npx`          | パッケージ実行           | `nix develop --command npx tsc --init`              |
| `curl`         | HTTPリクエスト           | `nix develop --command curl -s https://example.com` |
| `jq`           | JSONパーサー             | `nix develop --command jq '.name' package.json`     |
| `rg` (ripgrep) | 高速grep                 | `nix develop --command rg 'pattern' src/`           |
| `fd`           | 高速find                 | `nix develop --command fd '.ts$' src/`              |
| `fzf`          | ファジーファインダー     | `nix develop --command fzf`                         |
| `task`         | タスクランナー (go-task) | `nix develop --command task build`                  |
| `biome`        | Linter / Formatter       | `nix develop --command pnpm exec biome check ./src` |
| `lefthook`     | Git Hooks管理            | `nix develop --command lefthook install`            |

### フォーマッタ

`nix fmt` でコードフォーマットを一括適用できます（nixfmt + Biome）。

```bash
nix develop --command nix fmt
```

### Git Hooks (Lefthook)

pre-commitフックが自動的にBiomeのフォーマットとリントをステージ済みファイルに実行します。

```bash
# フックのインストール
nix develop --command lefthook install

# フックの手動実行（テスト用）
nix develop --command lefthook run pre-commit
```

## プロジェクト共通ルール

### TypeScript / ESM

- `"type": "module"` のESMプロジェクト。`tsconfig.json`で`strict: true`。
- `moduleResolution: "bundler"` のため、**importに拡張子は不要**。
- パスエイリアス `@/*` → `src/*` を使用（例: `import { foo } from "@/app/foo"`）。

### 主要スクリプト

| スクリプト   | 用途                       | 実行例                             |
| ------------ | -------------------------- | ---------------------------------- |
| `pnpm check` | Biomeチェック + 型検査     | `nix develop --command pnpm check` |
| `pnpm build` | esbuildバンドル            | `nix develop --command pnpm build` |
| `pnpm fmt`   | Biomeフォーマット          | `nix develop --command pnpm fmt`   |
| `pnpm lint`  | Biomeリント                | `nix develop --command pnpm lint`  |
| `pnpm dev`   | 開発サーバー起動           | `nix develop --command pnpm dev`   |

### 設定

アプリ設定は `src/app/config/config.yaml` にYAML形式で定義し、`BotConfig`インターフェースで型付けする。
