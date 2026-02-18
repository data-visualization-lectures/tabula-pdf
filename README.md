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
