# Tabula ウェブツール構築：バージョン比較と推奨構成

> 調査日：2026-02-18

## 結論：`tabula-py`（Python版）が最適

---

## 各バージョンの比較

| 項目 | tabula-java | tabula-py (Python) | tabula-js (Node.js) |
|------|------------|-------------------|---------------------|
| **コア実装** | ✅ 本家（抽出ロジックの源泉） | ⚡ tabula-javaのラッパー | ⚡ tabula-javaのラッパー |
| **GitHub Stars** | ⭐ 2,000 | ⭐ 2,300 | ⭐ 82 |
| **メンテナンス状況** | 🟡 散発的なバグ修正 | 🟢 活発（2024年10月 v2.10.0リリース） | 🔴 2022年8月にアーカイブ済み（廃止） |
| **Java依存** | Java本体 | JRE必要（内部でJava呼び出し） | JRE必要（内部でJava呼び出し） |
| **Webフレームワーク連携** | Spring/Spark等 | Flask / FastAPI / Django | Express等 |
| **データ処理連携** | 限定的 | pandas連携が強力 | 限定的 |
| **デプロイ容易性** | 🟡 Javaサーバー必要 | 🟢 Dockerで容易 | 🔴 廃止のため非推奨 |

---

## なぜ `tabula-py` が最適か

### 1. 最も活発にメンテナンスされている
- 2024年10月にv2.10.0をリリース（Python 3.13対応）
- `tabula-js` は2022年にアーカイブ済みで実質廃止

### 2. Webバックエンドとの相性が抜群
- **FastAPI** や **Flask** と組み合わせてREST APIを簡単に構築できる
- `pandas.DataFrame` として結果を受け取れるため、JSON変換・後処理が容易

### 3. Dockerでのデプロイが現実的
- `python:3.x + openjdk` のマルチステージDockerfileで完結
- Railway / Render / Google Cloud Run などのDockerサポートプラットフォームにデプロイ可能

### 4. エコシステムが豊富
- pandas、openpyxl、FastAPIなどPythonの豊富なライブラリと組み合わせ可能

---

## 推奨アーキテクチャ

```
[ブラウザ (HTML/JS)]
       ↓ PDF アップロード
[Python バックエンド (FastAPI)]
       ↓ tabula-py で抽出
[tabula-java (JVM内部で実行)]
       ↓ DataFrame → JSON/CSV
[ブラウザへ結果返却]
```

**技術スタック例：**
- バックエンド：`FastAPI` + `tabula-py` + `pandas`
- フロントエンド：React / Next.js（またはシンプルなHTML）
- インフラ：Docker（Python + JRE同梱）

---

## Vercelへのデプロイについて

### ⚠️ tabula-py は Vercel に直接デプロイできない

tabula-pyは内部でJava（JRE）を呼び出すため、**VercelのPythonサーバーレス環境ではJavaが利用できず動作しない**。

| 制約 | 詳細 |
|------|------|
| **Java非対応** | VercelのPythonランタイムにJREは含まれない |
| **バンドルサイズ制限** | Pythonファンクションの上限は250MB（JREを同梱すると超過する可能性大） |
| **カスタムランタイム** | 独自ランタイム構築は可能だが複雑で非現実的 |

### ✅ Vercelで使えるJava不要の代替ライブラリ

Vercelにデプロイしたい場合は、Javaに依存しない純粋なPythonライブラリを使う。

| ライブラリ | 特徴 | Vercel対応 |
|-----------|------|------------|
| **pdfplumber** | テキスト・表の抽出に強い。PDFMiner.sixベース | ✅ 対応 |
| **PyMuPDF (fitz)** | 高速・軽量。v1.23以降でテーブル抽出対応 | ✅ 対応 |
| **camelot-py** | 表抽出専門。精度が高い（Ghostscript依存あり） | ⚠️ 要確認 |
| **pypdf** | 軽量・純粋Python。複雑な表には不向き | ✅ 対応 |

> **推奨**：Vercelを使うなら `pdfplumber` または `PyMuPDF` が最も現実的。

---

## デプロイプラットフォーム比較

| プラットフォーム | tabula-py対応 | Docker対応 | 無料枠 | 特徴 |
|----------------|--------------|-----------|--------|------|
| **Vercel** | ❌ Java非対応 | ❌ | ✅ | フロントエンド向け。Java不要ライブラリなら可 |
| **Railway** | ✅ | ✅ | 🟡 限定的 | Dockerfile自動検出。開発者体験が良い |
| **Render** | ✅ | ✅ | ✅ | Docker/ネイティブ両対応。ゼロダウンタイム |
| **Google Cloud Run** | ✅ | ✅ | ✅ | フルマネージドコンテナ。スケールtoゼロ |
| **Heroku** | ✅ | ✅ | ❌ | 老舗PaaS。無料枠廃止済み |

### 推奨構成（tabula-pyを使う場合）

```
[ブラウザ (Next.js / React)]
       ↓ PDF アップロード
[Railway / Render / Cloud Run]
  FastAPI + tabula-py + pandas
  （Docker: python:3.12 + openjdk-17）
       ↓ JSON/CSV
[ブラウザへ結果返却]
```

### 推奨構成（Vercelを使いたい場合）

```
[ブラウザ (Next.js)]
       ↓ PDF アップロード
[Vercel Serverless Functions]
  Python: pdfplumber / PyMuPDF
  （Java不要・純粋Pythonライブラリ）
       ↓ JSON/CSV
[ブラウザへ結果返却]
```

---

## 注意点

- **Java依存**：tabula-pyはJRE（Java Runtime Environment）のインストールが必要。Dockerで管理するのが現実的。
- **スキャンPDF非対応**：画像ベースのPDFには対応していない。OCRが必要な場合は `pytesseract` 等との組み合わせを検討。
- **ファイルサイズ制限**：大きなPDFはメモリを多く消費するため、アップロードサイズ制限の設定を推奨。

---

## 参考リンク

- [tabula-java](https://github.com/tabulapdf/tabula-java) - コアライブラリ
- [tabula-py](https://github.com/chezou/tabula-py) - Python版（推奨）
- [tabula-js](https://github.com/ezodude/tabula-js) - Node.js版（アーカイブ済み・非推奨）
- [tabula 本家](https://github.com/tabulapdf/tabula) - デスクトップアプリ版
- [pdfplumber](https://github.com/jsvine/pdfplumber) - Java不要のPDF表抽出ライブラリ
- [PyMuPDF](https://github.com/pymupdf/PyMuPDF) - 高速PDF処理ライブラリ（Vercel対応）
- [Vercel Python Runtime](https://vercel.com/docs/functions/runtimes/python) - Vercel公式Pythonランタイムドキュメント
