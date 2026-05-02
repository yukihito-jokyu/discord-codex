# Architecture

discord-codex は OpenAI Codex SDK を利用した Discord Bot。Slash コマンドとメンションの 2 つの入力チャネルを持ち、Hono HTTP サーバーでリクエストを受け付け、Redis で会話スレッドを永続化する。

## ディレクトリマップ

```
src/
├── app/              起動・設定・組み立て（Composition Root）
├── server/           HTTP 受付・通信制御
├── bot/              Discord ボットの振る舞い
├── ai/               AI に関するすべて
├── infrastructure/   外部サービスとの通信
├── sdk/discord/      Discord 固有の型変換
└── shared/           どの層でも使う共通部品
```

### 各ディレクトリの責務

#### `src/app/` — 起動・設定・組み立て

- **役割**: アプリケーション全体の起動と設定。全依存関係を 1 箇所で構築・配線する（Composition Root）
- **ここに置くもの**: 起動処理、環境変数の検証、設定ファイルの読み込み、依存関係の組み立て
- **ここに置かないもの**: ビジネスロジック、HTTP 処理、外部 API 呼び出し
- **判定基準**: 「アプリケーションが起動するときに 1 回だけ実行される処理」ならここ
- **主要ファイル**:
  - `bootstrap.ts` — 全サービスのインスタンス化と依存注入
  - `config/env.ts` — 環境変数の Zod 検証
  - `config/bot.config.ts` — YAML 設定の Zod 検証
  - `config/config.yaml` — デフォルト設定値

#### `src/server/` — HTTP 受付・通信制御

- **役割**: 外部からのリクエストを受け付け、適切なハンドラに渡す。リクエスト単位の横断処理（認証・ロギング）を担う
- **ここに置くもの**: HTTP ルート、ミドルウェア（認証・ロギング・署名検証）、Gateway 接続管理
- **ここに置かないもの**: ビジネスロジック、AI 処理、Discord API の直接呼び出し
- **判定基準**: 「リクエストを受け取ってからハンドラに渡すまで」の処理ならここ
- **主要ファイル**:
  - `hono.ts` — Hono アプリのファクトリ。ルートとミドルウェアをマウント
  - `routes/discord.route.ts` — Interaction / Gateway の両方を受け付ける単一エンドポイント
  - `routes/health.route.ts` — ヘルスチェック
  - `middleware/` — 署名検証、アクセス制御、リクエストロギング
  - `gateway/discord.gateway.ts` — 24 時間の Gateway WebSocket リスナー

#### `src/bot/` — Discord ボットの振る舞い

- **役割**: Discord のコマンド・メッセージに対する振る舞いを定義する。ユースケース層に相当
- **ここに置くもの**: コマンドクラス、イベントハンドラ、コマンドルーター
- **ここに置かないもの**: HTTP 通信の詳細、外部 API の直接呼び出し、AI の内部実装
- **判定基準**: 「ユーザーの操作（コマンド実行・メンション）に対して何をするか」を定義する処理ならここ
- **主要ファイル**:
  - `commands/command.interface.ts` — `Command` インターフェース（`name`, `definition`, `execute`）
  - `commands/ai/` — AI 関連コマンド（`chat`, `summary`）
  - `commands/utility/` — ユーティリティコマンド（`ping`）
  - `handlers/interaction.handler.ts` — Slash コマンドを Router に渡して実行
  - `handlers/message.handler.ts` — メンションイベントを処理
  - `router.ts` — コマンド名 → Command インスタンスの解決

#### `src/ai/` — AI に関するすべて

- **役割**: AI（Codex）との対話を管理する。チャットのスレッド永続化、プロンプト構築、要約生成
- **ここに置くもの**: AI クライアントのラッパー、AI サービス（チャット・要約）、プロンプトテンプレート
- **ここに置かないもの**: Discord 固有の処理、HTTP リクエスト処理、UI の構築
- **判定基準**: 「AI モデルに対する入出力」に関わる処理ならここ
- **主要ファイル**:
  - `client/codex.client.ts` — Codex SDK のラッパー（スレッド管理）
  - `services/ai.service.ts` — チャットサービス。Redis でスレッド ID を永続化
  - `services/summary.service.ts` — URL 要約サービス
  - `prompts/system.ts` — システムプロンプトのビルダー
  - `prompts/templates/` — 用途別プロンプトテンプレート

#### `src/infrastructure/` — 外部サービスとの通信

- **役割**: アプリケーション外のサービス（Discord API, Redis, Web）との通信をカプセル化する
- **ここに置くもの**: 外部 API クライアント、DB クライアント、外部サービスのエラー処理
- **ここに置かないもの**: ビジネスロジック、Discord 型のドメイン変換、AI 処理
- **判定基準**: 「アプリケーション外部のサービスと通信する処理」ならここ。外部サービスを差し替えるときはこの層だけを変更する
- **主要ファイル**:
  - `discord/discord-api.client.ts` — Discord REST API の fetch ラッパー
  - `redis/redis.client.ts` — Redis クライアント。接続失敗時はインメモリ Map にフォールバック
  - `web/web-fetcher.client.ts` — Jina Reader API で URL コンテンツを取得

#### `src/sdk/discord/` — Discord 固有の型変換

- **役割**: Discord API のペイロードとアプリケーションのドメイン型の相互変換。外部 API 仕様の変更影響をこの層に閉じ込める
- **ここに置くもの**: Discord API の型定義、raw ペイロード → ドメイン型の変換、ドメイン型 → Discord レスポンスの変換
- **ここに置かないもの**: ビジネスロジック、外部 API 呼び出し、HTTP ルーティング
- **判定基準**: 「Discord API の仕様に依存する型や変換」ならここ。Discord 以外のサービスに関わる型変換は置かない
- **主要ファイル**:
  - `types/domain.ts` — `DomainInteraction`, `DomainResponse` など
  - `types/gateway.ts` — `GatewayEvent` など
  - `adapter/interaction.adapter.ts` — raw → DomainInteraction 変換
  - `adapter/gateway-event.adapter.ts` — Gateway イベントの解析
  - `adapter/response.adapter.ts` — DomainResponse → Discord レスポンス変換

#### `src/shared/` — どの層でも使う共通部品

- **役割**: 全層から利用される基盤型とユーティリティ。特定のビジネス要件や外部サービスに依存しない
- **ここに置くもの**: エラー型、Result 型、ロガー、フォーマッタ、バリデーション、定数
- **ここに置かないもの**: ビジネスロジック、外部 API 呼び出し、特定のドメインに固有な処理
- **判定基準**: 「複数の層から使われ、どの層にも属さない処理」ならここ。1 つの層でしか使わないものはその層に置く
- **主要ファイル**:
  - `types/result.ts` — `Result<T, E>` 型（関数型エラーハンドリング）
  - `types/errors.ts` — `AppError`, `ValidationError` など
  - `utils/logger.ts` — Pino ロガーのファクトリ
  - `utils/constants.ts` — Discord メッセージ長上限、TTL など

## 処理をどこに書くか

```
新しい機能を追加したい
│
├─ 新しい Slash コマンドを追加したい
│  1. src/bot/commands/ に Command インターフェースを実装したクラスを作成
│  2. src/app/bootstrap.ts の commands 配列に追加
│
├─ メンションの応答を変えたい
│  → src/bot/handlers/message.handler.ts を修正
│
├─ 新しいミドルウェアを追加したい（レート制限など）
│  1. src/server/middleware/ にミドルウェア関数を作成
│  2. src/server/routes/discord.route.ts に適用
│
├─ 新しい AI プロンプトを追加したい
│  → src/ai/prompts/templates/ にプロンプトビルダーを追加
│
├─ 新しい外部サービスを連携したい（DB、API など）
│  1. src/infrastructure/ にクライアントクラスを作成
│  2. src/app/bootstrap.ts でインスタンス化し、必要なサービスに注入
│
├─ 新しい HTTP エンドポイントを追加したい
│  1. src/server/routes/ にルートを作成
│  2. src/server/hono.ts にマウント
│
├─ Discord API の型変換を追加・変更したい
│  → src/sdk/discord/adapter/ を修正
│
├─ 新しい設定値を追加したい
│  → 「設定の追加」セクションを参照
│
├─ 全層で使う型やエラーを追加したい
│  → src/shared/types/ に追加
│
└─ 全層で使う汎用ユーティリティを追加したい
   → src/shared/utils/ に追加
```

## 依存の方向

依存は上から下へ一方通行。下位層が上位層を import してはならない。

```
app（Composition Root — 全層に依存してよい）
 │
 ├──→ server
 │      │
 │      ├──→ bot
 │      │      │
 │      │      ├──→ ai
 │      │      │      │
 │      │      │      └──→ infrastructure ──→ shared
 │      │      │
 │      │      ├──→ infrastructure ──→ shared
 │      │      │
 │      │      └──→ sdk/discord ──→ shared
 │      │
 │      └──→ sdk/discord ──→ shared
 │
 └──→ shared（何にも依存しない）
```

**禁止例**:
- `infrastructure` が `bot` や `ai` を import する
- `shared` が他の層を import する
- `server` が `infrastructure` を直接 import する（ハンドラ経由で受け取る）

`app/bootstrap.ts` だけが例外として全層を import できる。

## リクエストフロー

### Slash コマンド

```
Discord API
  │ POST /api/webhooks/discord
  ▼
[Server] 受信 → 署名検証 → アクセス制御
  ▼
[SDK] raw ペイロード → DomainInteraction に変換
  ▼
[Bot] InteractionHandler → Router → Command.execute()
  ▼
[AI] プロンプト構築 → Codex 呼び出し → Redis にスレッド保存
  ▼
[Infrastructure] Codex API 通信 / Discord API で応答を更新
```

Discord は 3 秒以内の応答を要求するため、コマンドは即座に `deferred()` を返し、バックグラウンドで処理後に `editInteractionResponse` で結果を更新する。

### メンションイベント

```
Discord Gateway（24 時間 WebSocket リスナー）
  │ POST /api/webhooks/discord（Gateway トークンヘッダー付き）
  ▼
[Server] トークン検証
  ▼
[SDK] Gateway イベント解析 → メンション検出 → 本文抽出
  ▼
[Bot] MessageHandler → スレッド作成（必要に応じて）
  ▼
[AI] チャット応答 → Redis でスレッド ID を紐付け
  ▼
[Infrastructure] Discord API でメッセージ送信
```

Gateway イベントは @chat-adapter/discord が WebSocket で受信し、ローカルの Webhook エンドポイントに転送する。このハイブリッド構成により、Interaction（Slash コマンド）と MESSAGE_CREATE（メンション）の両方を処理できる。

## bootstrap.ts — すべての起点

`app/bootstrap.ts` は Composition Root として、全サービスのインスタンスを生成し依存を配線する。

### 依存を追加する手順

```
1. infrastructure/ にクライアントクラスを作成
2. ai/services/ にサービスクラスを作成（クライアントを受け取る）
3. bot/commands/ にコマンドクラスを作成（サービスを受け取る）
4. bootstrap.ts で以下の順に配線:
   a. クライアントを生成
   b. サービスを生成（クライアントを注入）
   c. コマンドを生成（サービスを注入）
   d. commands 配列にコマンドを追加
```

### 配線の例（チャットコマンドの場合）

```typescript
// bootstrap.ts 内
const codex = new CodexClient(apiKey, options);   // infrastructure
const redis = new RedisClient(url);                // infrastructure
const aiService = new AIService(codex, redis);     // ai
const chatCommand = new ChatCommand(aiService, discordApiClient, appId); // bot
const commands = [chatCommand, ...];                // bot → router
```

## 設定の追加

新しい設定値を追加する際は、値の性質に応じて配置先を決める。

| 値の性質 | 配置先 | 例 |
|----------|--------|-----|
| 秘匿値・デプロイごとに変わる | 環境変数 + `env.ts` | API キー、トークン、URL |
| 動作のチューニング値 | `config.yaml` + `bot.config.ts` | モデル名、タイムアウト、上限ユーザー |

両方とも Zod スキーマで起動時に検証する。環境変数は config.yaml より優先される。

## 共通パターン集

| やりたいこと | 変更箇所 |
|---|---|
| Slash コマンドを追加 | 1. `bot/commands/` に Command クラス作成<br>2. `app/bootstrap.ts` の commands 配列に追加 |
| 外部 API を追加 | 1. `infrastructure/` にクライアント作成<br>2. `app/bootstrap.ts` でインスタンス化して注入 |
| AI プロンプトを変更 | `ai/prompts/` の該当ファイルを修正 |
| アクセス制御を変更 | `server/middleware/access-control.ts` を修正 |
| エラー型を追加 | `shared/types/errors.ts` に追加 |
| 設定値を追加 | 環境変数なら `config/env.ts`、チューニング値なら `config.yaml` + `config/bot.config.ts` |
| ドメイン型を追加 | `sdk/discord/types/` に追加 |
