# Implementation Plan: Tabula Web Tech Stack

## 目的
本ドキュメントは、**Tabula Web プロジェクト**の実装方針を、直近の個別バグ修正ではなく技術スタック観点で定義する。  
前提インフラは **Vercel（Frontend） + Railway（Backend）**。

---

## アーキテクチャ

```
Browser
  ↓
Vercel (Next.js)
  ↓ HTTPS
Railway (API / Worker)
  ↓
Storage + DB + Queue (必要に応じて)
```

### 役割分担
1. Frontend（Next.js / Vercel）
- UI描画、状態管理、認証済みセッションの保持
- アップロード操作、ジョブ開始、進捗表示、結果表示
- 重い処理は持たず、すべてAPI経由で実行

2. Backend（FastAPI or Java API / Railway）
- ファイル受け取り、処理実行、結果生成、ダウンロード提供
- 同期処理と非同期ジョブ処理の境界管理
- 入力検証、認可、監査ログ

3. Data Layer（必要に応じて）
- 永続メタデータ: PostgreSQL
- ファイル本体: オブジェクトストレージ（S3互換）
- 重い処理: Queue + Worker（必要な場合）

---

## 技術スタック

### Frontend
1. Next.js App Router
2. TypeScript
3. API client 層（`lib/api.ts` 等）で通信を一元化
4. 監視イベント（例: GA, PostHog）をレイアウトで一括設定

### Backend（API）
1. FastAPI（tabula-py / tabula-java 呼び出し）
2. ファイルアップロードは multipart/form-data
3. 処理パラメータは JSON で明示化（曖昧なフォールバックを避ける）
4. 失敗時は 4xx/5xx を明示し、silent fallback を禁止

### Infrastructure / Deploy
1. Frontend: Vercel
2. Backend: Railway
3. 環境変数で接続先を管理（`NEXT_PUBLIC_API_URL`, `CORS_ORIGINS`）
4. リリース単位で Frontend/Backend の互換性を管理

---

## 処理モデル（本プロジェクト）

### A. 軽量処理（同期）
1. UI -> API 呼び出し
2. API が即時処理
3. UI が結果表示

### B. 重量処理（非同期）
1. UI -> `/jobs` で投入
2. Worker が処理
3. UI は `/jobs/{id}` をポーリング or push
4. 完了後、結果ファイルをダウンロード

本プロジェクトでは、ページ数・ファイルサイズ・処理時間が閾値を超える場合に B への移行を検討する。

---

## セキュリティと運用

1. 認証必須（公開サービスの場合）
2. テナント分離（ユーザー単位でデータ・ファイル・ジョブを分離）
3. ファイルサイズ制限、MIME/拡張子検証、タイムアウト設定
4. レート制限と監査ログ
5. 例外時は明示エラー返却（暗黙フォールバック禁止）

---

## 開発フェーズ

### Phase 1: Foundation
1. Frontend/Backend の疎通
2. アップロード・抽出・ダウンロードの最短フロー
3. 最低限のエラーハンドリング

### Phase 2: Reliability
1. 非同期ジョブ化
2. 冪等性、再試行、タイムアウト制御
3. ログ・メトリクス・アラート整備

### Phase 3: SaaS Readiness（必要時）
1. 認証・課金（Stripe等）
2. テナント分離
3. 利用上限・プラン制御

---

## Definition of Done

1. Frontend と Backend がバージョン互換で動作する
2. 同一入力に対して再現性のある出力が得られる
3. 失敗時に原因が追跡可能（ログ、HTTPステータス、エラー詳細）
4. Vercel + Railway 上で本番相当の E2E 動作確認が完了している
