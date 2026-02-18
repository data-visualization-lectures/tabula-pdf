const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ExtractionMode = "lattice" | "stream";
export type DownloadFormat = "csv" | "excel" | "json";

export interface TableData {
    index: number;
    rows: number;
    columns: number;
    headers: string[];
    data: string[][];
}

export interface ExtractResponse {
    tables: TableData[];
    count: number;
    message?: string;
}

// Railway のコールドスタート対策：最大3回リトライ
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delayMs = 3000
): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if ((res.status === 502 || res.status === 503) && i < retries - 1) {
                await new Promise((r) => setTimeout(r, delayMs));
                continue;
            }
            return res;
        } catch (e) {
            if (i < retries - 1) {
                await new Promise((r) => setTimeout(r, delayMs));
                continue;
            }
            throw e;
        }
    }
    throw new Error("リクエストが失敗しました（リトライ上限）");
}

/**
 * PDF の総ページ数を取得する（Screen B のページ切り替えに使用）
 */
export async function getPageCount(file: File): Promise<number> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetchWithRetry(`${API_BASE_URL}/page-count`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
        throw new Error(err.detail || `エラー: ${res.status}`);
    }

    const data = await res.json();
    return data.page_count;
}

/**
 * PDF の指定ページを画像 URL として返す（Screen B の PDF 表示に使用）
 */
export async function getPageImageUrl(file: File, page: number): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("page", String(page));

    const res = await fetchWithRetry(`${API_BASE_URL}/page-image`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
        throw new Error(err.detail || `エラー: ${res.status}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

/**
 * PDF からテーブルを抽出する
 * @param regions - 領域情報の配列（JSON 文字列化して送信）
 */
export async function extractTables(
    file: File,
    mode: ExtractionMode = "lattice",
    pages: string = "all",
    area: string = "",
    regions: string = "[]"
): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("pages", pages);
    formData.append("area", area);
    formData.append("regions", regions);

    const res = await fetchWithRetry(`${API_BASE_URL}/extract`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
        throw new Error(err.detail || `エラー: ${res.status}`);
    }

    return res.json();
}

/**
 * 指定テーブルをファイルとしてダウンロードする
 * @param area - "top,left,bottom,right" 形式の抽出範囲（省略時は全体）
 */
export async function downloadTable(
    file: File,
    tableIndex: number,
    format: DownloadFormat,
    mode: ExtractionMode = "lattice",
    pages: string = "all",
    area: string = "",
    regions: string = "[]"
): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("table_index", String(tableIndex));
    formData.append("format", format);
    formData.append("mode", mode);
    formData.append("pages", pages);
    formData.append("area", area);
    formData.append("regions", regions);

    const res = await fetchWithRetry(`${API_BASE_URL}/download`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "ダウンロードに失敗しました" }));
        throw new Error(err.detail || `エラー: ${res.status}`);
    }

    const blob = await res.blob();
    const ext = format === "excel" ? "xlsx" : format;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tableIndex === -1 ? `tables_all.${ext}` : `table_${tableIndex + 1}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
}


export interface DetectedArea {
    top: number;
    left: number;
    bottom: number;
    right: number;
    page: number;
}

export interface DetectResponse {
    areas: DetectedArea[];
    page: number;
}

/**
 * 指定ページの表領域を自動検出する
 */
export async function detectTables(file: File, page: number): Promise<DetectResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("page", String(page));

    const res = await fetchWithRetry(`${API_BASE_URL}/detect-tables`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        // 自動検出失敗は致命的ではないので空配列を返すなどハンドリングしても良いが、
        // ここではエラーを投げて UI 側で無視するか判断させる
        const err = await res.json().catch(() => ({ detail: "自動検出に失敗しました" }));
        throw new Error(err.detail || `エラー: ${res.status}`);
    }

    return res.json();
}
