# Tabula ウェブツール実装計画

本家 Tabula はローカルインストール前提のデスクトップツールだが、本プロジェクトでは**ウェブ上で誰でも使えるPDF表抽出ツール**として提供することを目指す。

## 構成概要

```
[フロントエンド: Next.js]          [バックエンド: FastAPI]
  Vercel (無料枠)          →API→   Railway (Docker)
  PDF アップロード UI               tabula-py + pandas
  テーブルプレビュー                openjdk-17 同梱
  CSV/JSON/Excel DL
```

> [!IMPORTANT]
> **分離構成**：フロントエンドは Vercel（Next.js に最適化・無料枠）、バックエンドは Railway（Docker で Java/Python 同梱）にデプロイする。バックエンドには CORS 設定が必要。

---

## Proposed Changes

### Backend（FastAPI + tabula-py）

#### [NEW] `backend/main.py`
FastAPI アプリ本体。以下のエンドポイントを実装：

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/` | GET | ヘルスチェック |
| `/extract` | POST | PDFをアップロードし全テーブルをJSONで返す |
| `/download` | POST | 指定テーブルをCSV/Excel形式でダウンロード |

#### [NEW] `backend/requirements.txt`
```
fastapi
uvicorn[standard]
tabula-py
pandas
openpyxl
python-multipart
```

#### [NEW] `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim

# Java（JRE）インストール
RUN apt-get update && apt-get install -y \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Frontend（Next.js）

#### [NEW] `frontend/` — Next.js プロジェクト

主要ページ・コンポーネント：

| ファイル | 役割 |
|---------|------|
| `app/page.tsx` | メインページ（PDF アップロード → テーブル表示） |
| `components/UploadZone.tsx` | ドラッグ＆ドロップ対応 PDF アップロードエリア |
| `components/TablePreview.tsx` | 抽出テーブルのプレビュー表示（複数テーブル対応） |
| `components/DownloadPanel.tsx` | CSV / Excel / JSON 形式でのダウンロード |
| `lib/api.ts` | バックエンド API 呼び出しユーティリティ |

---

### インフラ・デプロイ

#### [NEW] `backend/railway.toml`
Railway の設定ファイル。Dockerfile を指定してビルド。

#### [NEW] `frontend/vercel.json`
Vercel の設定ファイル。環境変数でバックエンド URL を指定。

#### [NEW] `.env.example`
```
# バックエンド（Railway）
CORS_ORIGINS=https://your-frontend.vercel.app

# フロントエンド（Vercel）
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## 機能スコープ（MVP）

| 機能 | 優先度 |
|------|--------|
| PDF アップロード（最大 10MB） | ✅ Must |
| 全テーブル自動抽出・一覧表示 | ✅ Must |
| テーブルごとの CSV ダウンロード | ✅ Must |
| Excel（.xlsx）ダウンロード | ✅ Must |
| JSON ダウンロード | ✅ Must |
| 複数ページ対応 | ✅ Must |
| 抽出モード選択（lattice / stream） | 🟡 Should |
| ページ範囲指定 | 🟡 Should |
| テーブル手動選択（座標指定） | 🔴 Nice to have |

> [!NOTE]
> tabula-py の抽出モードは `lattice`（罫線あり）と `stream`（罫線なし）の2種類。本家 Tabula と同様に両方選択できると精度が上がる。

---

## ディレクトリ構成（完成形）

```
tabula-pdf/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   └── page.tsx
│   ├── components/
│   │   ├── UploadZone.tsx
│   │   ├── TablePreview.tsx
│   │   └── DownloadPanel.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── package.json
│   └── next.config.ts
├── railway.toml
├── .env.example
└── tabula_web_tool_comparison.md
```

---

## Verification Plan

### 1. ローカル動作確認（Docker）

```bash
# バックエンドをDockerでビルド・起動
cd backend
docker build -t tabula-backend .
docker run -p 8000:8000 tabula-backend

# ヘルスチェック
curl http://localhost:8000/

# PDFアップロードテスト（サンプルPDFを使用）
curl -X POST http://localhost:8000/extract \
  -F "file=@sample.pdf" | jq .
```

### 2. フロントエンドローカル確認

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000 でブラウザ確認
```

### 3. Railway デプロイ確認

- Railway ダッシュボードでビルドログを確認
- デプロイ後の URL に対して `/extract` エンドポイントを curl でテスト
- フロントエンドから実際に PDF をアップロードしてテーブルが表示されることを確認

### 4. ブラウザ手動テスト（MVP検証）

1. サンプルPDF（表を含むもの）をアップロード
2. テーブルが一覧表示されることを確認
3. CSV / Excel / JSON それぞれでダウンロードし、内容を確認
4. 複数テーブルを含むPDFで全テーブルが抽出されることを確認
