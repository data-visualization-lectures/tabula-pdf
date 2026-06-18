import io
import json
import os
import tempfile
from dataclasses import dataclass
from typing import Literal

import pandas as pd
import tabula
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pdf2image import convert_from_path
from pypdf import PdfReader

app = FastAPI(
    title="Tabula Web API",
    description="PDF から表データを抽出する REST API",
    version="2.0.0",
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


@dataclass(frozen=True)
class PageGeometry:
    width_pt: float
    height_pt: float
    rotation: int


def _strip_cell_newlines(df: pd.DataFrame) -> pd.DataFrame:
    """セル内の改行コードを除去する（ヘッダー含む）"""
    df = df.replace(r'\r\n|\r|\n', '', regex=True)
    df.columns = [str(c).replace('\r\n', '').replace('\r', '').replace('\n', '') for c in df.columns]
    return df


def _parse_area(area: str) -> list[float] | None:
    """
    "top,left,bottom,right" 形式の文字列を float リストに変換する。
    空文字列の場合は None を返す（全ページ抽出）。
    """
    area = area.strip()
    if not area:
        return None
    try:
        parts = [float(x) for x in area.split(",")]
        if len(parts) != 4:
            raise ValueError
        return parts
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="area は 'top,left,bottom,right' の形式で指定してください（例: 100,50,400,500）",
        )


def _get_page_geometry(reader: PdfReader, page_number: int) -> PageGeometry:
    """表示上のページ寸法を Tabula 座標系の基準値として取得する。"""
    if page_number < 1 or page_number > len(reader.pages):
        raise HTTPException(status_code=404, detail=f"ページ {page_number} が見つかりません")

    pdf_page = reader.pages[page_number - 1]
    rotation = int(pdf_page.get('/Rotate', 0) or 0) % 360
    width_pt = float(pdf_page.cropbox.width)
    height_pt = float(pdf_page.cropbox.height)

    if rotation in (90, 270):
        width_pt, height_pt = height_pt, width_pt

    return PageGeometry(width_pt=width_pt, height_pt=height_pt, rotation=rotation)


def _clamp_ratio(value: float) -> float:
    return min(max(value, 0.0), 1.0)


def _region_to_tabula_area(region: dict, geometry: PageGeometry) -> list[float]:
    """0.0-1.0 の相対領域を Tabula の top,left,bottom,right pt に変換する。"""
    top = float(region.get("top", 0)) * geometry.height_pt
    left = float(region.get("left", 0)) * geometry.width_pt
    bottom = float(region.get("bottom", 0)) * geometry.height_pt
    right = float(region.get("right", 0)) * geometry.width_pt
    return [top, left, bottom, right]


def _tabula_table_to_region(table: dict, geometry: PageGeometry, page_number: int) -> dict:
    """Tabula JSON の絶対座標をフロントエンド用の相対領域に変換する。"""
    top = float(table.get("top", 0))
    left = float(table.get("left", 0))
    width = float(table.get("width", 0))
    height = float(table.get("height", 0))

    return {
        "top": _clamp_ratio(top / geometry.height_pt),
        "left": _clamp_ratio(left / geometry.width_pt),
        "bottom": _clamp_ratio((top + height) / geometry.height_pt),
        "right": _clamp_ratio((left + width) / geometry.width_pt),
        "page": page_number,
    }


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Tabula Web API is running"}


@app.post("/page-image")
async def get_page_image(
    file: UploadFile = File(...),
    page: int = Form(1),
):
    """
    PDF の指定ページを PNG 画像として返す。
    Screen B（範囲選択画面）での PDF 表示に使用。

    - **page**: 1 始まりのページ番号
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズは 10MB 以下にしてください")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF ファイルのみ対応しています")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        images = convert_from_path(
            tmp_path,
            first_page=page,
            last_page=page,
            dpi=150,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF のページ画像変換に失敗しました: {str(e)}")
    finally:
        os.unlink(tmp_path)

    if not images:
        raise HTTPException(status_code=404, detail=f"ページ {page} が見つかりません")

    img_io = io.BytesIO()
    images[0].save(img_io, format="PNG")
    img_io.seek(0)

    return Response(content=img_io.read(), media_type="image/png")


@app.post("/page-count")
async def get_page_count(
    file: UploadFile = File(...),
):
    """
    PDF の総ページ数を返す。
    Screen B でのページ切り替えに使用。
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズは 10MB 以下にしてください")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF ファイルのみ対応しています")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # pdf2image の pdfinfo を使ってページ数を取得
        from pdf2image.pdf2image import pdfinfo_from_path
        info = pdfinfo_from_path(tmp_path)
        page_count = info["Pages"]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF の解析に失敗しました: {str(e)}")
    finally:
        os.unlink(tmp_path)

    return {"page_count": page_count}


@app.post("/extract")
async def extract_table(
    file: UploadFile = File(...),
    mode: Literal["lattice", "stream"] = Form("lattice"),
    pages: str = Form("all"),
    area: str = Form(""),
    regions: str = Form("[]"),
):
    """
    PDF から表データを抽出する。
    - **regions**: 各ページの抽出範囲（割合 0.0-1.0）を指定する JSON 文字列
      例: '[{"page": 1, "top": 0.1, "left": 0.1, "bottom": 0.5, "right": 0.9}, ...]'
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズは 10MB 以下にしてください")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF ファイルのみ対応しています")

    # 旧来のエリア指定がある場合はパース
    legacy_area = _parse_area(area)
    
    # 新しい複数領域指定のパース
    try:
        region_list = json.loads(regions) if regions else []
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="regions は JSON 配列文字列で指定してください")
    if not isinstance(region_list, list):
        raise HTTPException(status_code=400, detail="regions は JSON 配列文字列で指定してください")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        all_dfs = []

        # Case 1: Regions (Multi-page / Multi-area) が指定されている場合
        if region_list:
            reader = PdfReader(tmp_path)
            # ページごとに処理をまとめる
            page_regions = {}
            for r in region_list:
                p = int(r.get("page", 1))
                if p not in page_regions:
                    page_regions[p] = []
                page_regions[p].append(r)

            # ページごとに Tabula を実行
            # Tabula-py の area は top, left, bottom, right (points)
            for p_num, r_list in sorted(page_regions.items()):
                geometry = _get_page_geometry(reader, p_num)

                areas_pt = []
                for r in r_list:
                    areas_pt.append(_region_to_tabula_area(r, geometry))
                
                # print(f"[DEBUG] Page {p_num}: Rotation={geometry.rotation}, W={geometry.width_pt}, H={geometry.height_pt}")
                # print(f"[DEBUG] Areas PT: {areas_pt}")

                if areas_pt:
                    dfs = tabula.read_pdf(
                        tmp_path,
                        pages=p_num,
                        multiple_tables=True,
                        lattice=(mode == "lattice"),
                        stream=(mode == "stream"),
                        area=areas_pt,
                        pandas_options={"dtype": str},
                    )
                    # print(f"[DEBUG] DFS Count: {len(dfs)}")
                    
                    if dfs:
                         for df in dfs:
                            if df.empty: continue
                            if df.shape in [(1, 2), (2, 1), (1, 1)]: continue
                            if df.replace(r'^\s*$', float('nan'), regex=True).dropna(how='all').empty: continue
                            all_dfs.append(df)

        # Case 2: Legacy Area (Single area)
        elif legacy_area:
             # 旧来の area パラメータは相対座標(%)で来ることを想定しないといけないが
             # verify_backend.sh でテストした通り relative_area=True で処理する
            dfs = tabula.read_pdf(
                tmp_path,
                pages=pages,
                multiple_tables=True,
                lattice=(mode == "lattice"),
                stream=(mode == "stream"),
                area=legacy_area,
                relative_area=True,
                pandas_options={"dtype": str},
            )
            if dfs:
                for df in dfs:
                    if df.empty: continue
                    if df.shape in [(1, 2), (2, 1), (1, 1)]: continue
                    if df.replace(r'^\s*$', float('nan'), regex=True).dropna(how='all').empty: continue
                    all_dfs.append(df)
        
        # Case 3: 全自動
        else:
            dfs = tabula.read_pdf(
                tmp_path,
                pages=pages,
                multiple_tables=True,
                lattice=(mode == "lattice"),
                stream=(mode == "stream"),
                pandas_options={"dtype": str},
            )
            if dfs:
                all_dfs.extend(dfs)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF の解析に失敗しました: {str(e)}")
    finally:
        os.unlink(tmp_path)

    tables = []
    # all_dfs が空の場合や None の場合をケア
    if all_dfs:
        for i, df in enumerate(all_dfs):
            df = df.fillna("")
            df = _strip_cell_newlines(df)
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
    area: str = Form(""),
    regions: str = Form("[]"),
):
    """
    指定したテーブルを CSV / Excel / JSON 形式でダウンロードする。
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズは 10MB 以下にしてください")

    legacy_area = _parse_area(area)
    
    try:
        region_list = json.loads(regions) if regions else []
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="regions は JSON 配列文字列で指定してください")
    if not isinstance(region_list, list):
        raise HTTPException(status_code=400, detail="regions は JSON 配列文字列で指定してください")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        all_dfs = []

        # Case 1: Regions
        if region_list:
            reader = PdfReader(tmp_path)
            page_regions = {}
            for r in region_list:
                p = int(r.get("page", 1))
                if p not in page_regions:
                    page_regions[p] = []
                page_regions[p].append(r)

            for p_num, r_list in sorted(page_regions.items()):
                geometry = _get_page_geometry(reader, p_num)

                areas_pt = []
                for r in r_list:
                    areas_pt.append(_region_to_tabula_area(r, geometry))

                if areas_pt:
                    dfs = tabula.read_pdf(
                        tmp_path,
                        pages=p_num,
                        multiple_tables=True,
                        lattice=(mode == "lattice"),
                        stream=(mode == "stream"),
                        area=areas_pt,
                        pandas_options={"dtype": str},
                    )
                    if dfs:
                        # 抽出時と同様のフィルタリング
                        valid_dfs = []
                        for df in dfs:
                            if df.empty: continue
                            if df.shape in [(1, 2), (2, 1), (1, 1)]: continue
                            if df.replace(r'^\s*$', float('nan'), regex=True).dropna(how='all').empty: continue
                            valid_dfs.append(df)
                        all_dfs.extend(valid_dfs)

        # Case 2: Legacy Area
        elif legacy_area:
            dfs = tabula.read_pdf(
                tmp_path,
                pages=pages,
                multiple_tables=True,
                lattice=(mode == "lattice"),
                stream=(mode == "stream"),
                area=legacy_area,
                relative_area=True,
                pandas_options={"dtype": str},
            )
            if dfs:
                all_dfs.extend(dfs)
        
        # Case 3: Auto
        else:
            dfs = tabula.read_pdf(
                tmp_path,
                pages=pages,
                multiple_tables=True,
                lattice=(mode == "lattice"),
                stream=(mode == "stream"),
                pandas_options={"dtype": str},
            )
            if dfs:
                all_dfs.extend(dfs)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF の解析に失敗しました: {str(e)}")
    finally:
        os.unlink(tmp_path)

    if not all_dfs:
        raise HTTPException(status_code=404, detail="テーブルが見つかりません")

    if table_index != -1 and table_index >= len(all_dfs):
        raise HTTPException(status_code=404, detail="指定したテーブルが見つかりません")

    if table_index == -1:
        selected_dfs = [_strip_cell_newlines(df.fillna("")) for df in all_dfs]
        base_name = "tables_all"
    else:
        selected_dfs = [_strip_cell_newlines(all_dfs[table_index].fillna(""))]
        base_name = f"table_{table_index + 1}"

    if format == "csv":
        output = io.StringIO()
        for i, df in enumerate(selected_dfs):
            df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.csv"'},
        )


    elif format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            if len(selected_dfs) == 1:
                selected_dfs[0].to_excel(writer, index=False, sheet_name="Sheet1")
            else:
                for i, df in enumerate(selected_dfs):
                    sheet_name = f"Table_{i + 1}"[:31]
                    df.to_excel(writer, index=False, sheet_name=sheet_name)
        output.seek(0)
        return StreamingResponse(
            iter([output.read()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.xlsx"'},
        )

    elif format == "json":
        if len(selected_dfs) == 1:
            json_str = selected_dfs[0].to_json(orient="records", force_ascii=False)
        else:
            payload = []
            for i, df in enumerate(selected_dfs):
                payload.append(
                    {
                        "index": i,
                        "rows": len(df),
                        "columns": len(df.columns),
                        "headers": df.columns.tolist(),
                        "data": df.values.tolist(),
                    }
                )
            json_str = json.dumps(payload, ensure_ascii=False)
        return StreamingResponse(
            iter([json_str]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.json"'},
        )


@app.post("/detect-tables")
async def detect_tables(
    file: UploadFile = File(...),
    page: int = Form(1),
):
    """
    指定ページ内の表領域を自動検出し、相対座標（0.0〜1.0）のリストとして返す。
    Screen B での自動検出機能に使用。
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズは 10MB 以下にしてください")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 1. pypdf でページサイズ（ポイント単位）を取得
        reader = PdfReader(tmp_path)
        geometry = _get_page_geometry(reader, page)

        # 2. tabula-py で表領域を検出 (guess=True, output_format="json")
        # JSON output contain list of tables with absolute coordinates (points)
        tables = tabula.read_pdf(
            tmp_path,
            pages=page,
            guess=True,
            multiple_tables=True,
            output_format="json",
            lattice=True,  # lattice=True (格子) or stream=True? usually detecting generic tables needs guess=True which handles both? 
                           # tabula-py documentation says guess=True is default.
                           # But explicit mode might be needed? 
                           # Let's trust default guess behavior for detection.
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF の解析に失敗しました: {str(e)}")
    finally:
        os.unlink(tmp_path)

    # 3. 座標を相対値に変換して返す
    detected_areas = []
    if tables:
        for t in tables:
            detected_areas.append(_tabula_table_to_region(t, geometry, page))

    return {"areas": detected_areas, "page": page}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
