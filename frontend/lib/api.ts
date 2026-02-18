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

export async function extractTables(
    file: File,
    mode: ExtractionMode = "lattice",
    pages: string = "all"
): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("pages", pages);

    const res = await fetch(`${API_BASE_URL}/extract`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "不明なエラー" }));
        throw new Error(err.detail || `エラー: ${res.status}`);
    }

    return res.json();
}

export async function downloadTable(
    file: File,
    tableIndex: number,
    format: DownloadFormat,
    mode: ExtractionMode = "lattice",
    pages: string = "all"
): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("table_index", String(tableIndex));
    formData.append("format", format);
    formData.append("mode", mode);
    formData.append("pages", pages);

    const res = await fetch(`${API_BASE_URL}/download`, {
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
    a.download = `table_${tableIndex + 1}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
}
