# Tabula Web

PDF ファイルから表データを抽出できるウェブツール。  
[tabula-py](https://github.com/chezou/tabula-py) / [tabula-java](https://github.com/tabulapdf/tabula-java) をバックエンドに使用。

## 構成

```
tabula-pdf/
├── backend/   # FastAPI + tabula-py（Railway にデプロイ）
└── frontend/  # Next.js（Vercel にデプロイ）
```

## ローカル開発

### バックエンド（Docker）

```bash
cd backend
docker build -t tabula-backend .
docker run -p 8000:8000 -e CORS_ORIGINS="http://localhost:3000" tabula-backend
```

### フロントエンド

```bash
cd frontend
cp ../.env.example .env.local
# .env.local の NEXT_PUBLIC_API_URL を http://localhost:8000 に設定
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## デプロイ

### Railway（バックエンド）

1. Railway でプロジェクトを作成し、`backend/` ディレクトリを指定
2. 環境変数 `CORS_ORIGINS` に Vercel の URL を設定
3. Dockerfile が自動検出されてビルド・デプロイされる

### Vercel（フロントエンド）

1. Vercel でプロジェクトを作成し、`frontend/` ディレクトリを指定
2. 環境変数 `NEXT_PUBLIC_API_URL` に Railway の URL を設定
3. GitHub 連携で自動デプロイ

## 機能

- PDF アップロード（ドラッグ＆ドロップ対応、最大 10MB）
- 全テーブルの自動抽出・プレビュー表示
- 抽出モード選択（Lattice: 罫線あり / Stream: 罫線なし）
- ページ範囲指定
- CSV / Excel / JSON ダウンロード

## 制約（メモリとファイルサイズ）

### 1) ソースコード上の制約（本リポジトリ実装）

- PDF アップロード上限は **10MB** に固定（`MAX_FILE_SIZE = 10 * 1024 * 1024`）
- 各 API で `await file.read()` を使うため、受信した PDF は一度メモリ上に展開される
- 抽出処理では `tabula-py` 経由で `tabula-java`（JVM）が動作し、追加メモリを消費する
- `/page-image` では `pdf2image` による画像化を行うため、ページ画像生成時はさらにメモリ使用量が増える

### 2) システム（インフラ）上の制約（Railway）

- 実際の抽出安定性は、Railway 上のサービスメモリ上限に依存する
- Free: `Up to 1 vCPU / 0.5 GB RAM per service`
- Hobby: `Up to 48 vCPU / 48 GB RAM per service`
- Hobby 補足: `Up to 6 replicas, at 8 vCPU / 8 GB RAM per replica`

> 2026-02-24 時点。Railway のプラン仕様は更新される可能性があるため、最新値は公式 Pricing を参照してください。

- https://railway.com/pricing
- https://docs.railway.com/pricing
- https://docs.railway.com/reference/pricing/plans

### 3) 運用上の目安（この実装 + Free プラン）

- コード上限: **10MB**
- 安定運用目安: **3〜5MB程度**
- 画像多め・スキャン PDF は、同サイズでも失敗しやすい
