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

### フォーマッタ

`nix fmt` でコードフォーマットを一括適用できます（nixfmt + prettier）。

```bash
nix develop --command nix fmt
```
