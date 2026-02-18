"use client";

import { useState } from "react";
import { DownloadFormat, TableData, downloadTable } from "@/lib/api";
import { ExtractionMode } from "@/lib/api";

interface TablePreviewProps {
    tables: TableData[];
    file: File;
    mode: ExtractionMode;
    pages: string;
}

export default function TablePreview({ tables, file, mode, pages }: TablePreviewProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [downloading, setDownloading] = useState<DownloadFormat | null>(null);

    const activeTable = tables[activeIndex];

    const handleDownload = async (format: DownloadFormat) => {
        setDownloading(format);
        try {
            await downloadTable(file, activeIndex, format, mode, pages);
        } catch (e) {
            alert(`ダウンロードに失敗しました: ${e instanceof Error ? e.message : e}`);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* テーブル選択タブ */}
            {tables.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {tables.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={`
                px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${activeIndex === i
                                    ? "bg-indigo-600 text-white shadow"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }
              `}
                        >
                            テーブル {i + 1}
                            <span className="ml-1.5 text-xs opacity-70">
                                {t.rows}行 × {t.columns}列
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* テーブルプレビュー */}
            <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm max-h-[420px]">
                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-indigo-600 text-white">
                        <tr>
                            {activeTable.headers.map((h, i) => (
                                <th
                                    key={i}
                                    className="px-4 py-2.5 text-left font-semibold whitespace-nowrap border-r border-indigo-500 last:border-r-0"
                                >
                                    {h || `列 ${i + 1}`}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {activeTable.data.map((row, ri) => (
                            <tr
                                key={ri}
                                className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}
                            >
                                {row.map((cell, ci) => (
                                    <td
                                        key={ci}
                                        className="px-4 py-2 border-r border-b border-slate-100 last:border-r-0 whitespace-nowrap"
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ダウンロードパネル */}
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-600">ダウンロード：</span>
                {(["csv", "excel", "json"] as DownloadFormat[]).map((fmt) => (
                    <button
                        key={fmt}
                        onClick={() => handleDownload(fmt)}
                        disabled={downloading !== null}
                        className={`
              flex items-center gap-1.5 px-5 py-2 rounded-lg font-medium text-sm
              transition-all duration-150
              ${fmt === "csv" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
              ${fmt === "excel" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              ${fmt === "json" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
                    >
                        {downloading === fmt ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <span>⬇</span>
                        )}
                        {fmt.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
}
