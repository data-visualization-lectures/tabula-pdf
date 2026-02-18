import io
import os
import tempfile
from typing import Literal

import pandas as pd
import tabula
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(
    title="Tabula Web API",
    description="PDF から表データを抽出する REST API",
    version="1.0.0",
)

# CORS 設定（フロントエンドの Vercel URL を環境変数で指定）
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Tabula Web API is running"}


@app.post("/extract")
async def extract_tables(
    file: UploadFile = File(...),
    mode: Literal["lattice", "stream"] = Form("lattice"),
    pages: str = Form("all"),
):
    """
    PDF をアップロードし、全テーブルを JSON 形式で返す。

    - **mode**: `lattice`（罫線あり）または `stream`（罫線なし）
    - **pages**: `all` または `1,2,3` のようなページ番号
    """
    # ファイルサイズチェック
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズは 10MB 以下にしてください")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF ファイルのみ対応しています")

    # 一時ファイルに書き出して tabula で処理
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        dfs = tabula.read_pdf(
            tmp_path,
            pages=pages,
            multiple_tables=True,
            lattice=(mode == "lattice"),
            stream=(mode == "stream"),
            pandas_options={"dtype": str},  # 型変換エラーを防ぐため文字列で読み込む
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF の解析に失敗しました: {str(e)}")
    finally:
        os.unlink(tmp_path)

    if not dfs:
        return {"tables": [], "count": 0, "message": "テーブルが見つかりませんでした"}

    tables = []
    for i, df in enumerate(dfs):
        # NaN を空文字に変換
        df = df.fillna("")
        tables.append(
            {
                "index": i,
                "rows": len(df),
                "columns": len(df.columns),
                "headers": df.columns.tolist(),
                "data": df.values.tolist(),
            }
        )

    return {"tables": tables, "count": len(tables)}


@app.post("/download")
async def download_table(
    file: UploadFile = File(...),
    table_index: int = Form(0),
    format: Literal["csv", "excel", "json"] = Form("csv"),
    mode: Literal["lattice", "stream"] = Form("lattice"),
    pages: str = Form("all"),
):
    """
    指定したテーブルを CSV / Excel / JSON 形式でダウンロードする。
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズは 10MB 以下にしてください")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        dfs = tabula.read_pdf(
            tmp_path,
            pages=pages,
            multiple_tables=True,
            lattice=(mode == "lattice"),
            stream=(mode == "stream"),
            pandas_options={"dtype": str},
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF の解析に失敗しました: {str(e)}")
    finally:
        os.unlink(tmp_path)

    if not dfs or table_index >= len(dfs):
        raise HTTPException(status_code=404, detail="指定したテーブルが見つかりません")

    df = dfs[table_index].fillna("")
    base_name = f"table_{table_index + 1}"

    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False, encoding="utf-8-sig")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.csv"'},
        )

    elif format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Sheet1")
        output.seek(0)
        return StreamingResponse(
            iter([output.read()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.xlsx"'},
        )

    elif format == "json":
        json_str = df.to_json(orient="records", force_ascii=False)
        return StreamingResponse(
            iter([json_str]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.json"'},
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
