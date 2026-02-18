"use client";

import { useState } from "react";
import { DownloadFormat, ExtractionMode, TableData, downloadTable } from "@/lib/api";

interface TablePreviewProps {
    tables: TableData[];
    file: File;
    mode: ExtractionMode;
    pages: string;
    area?: string;
    regions?: string;
    onModeChange: (mode: ExtractionMode) => void;
    onRevise: () => void;
    isReextracting?: boolean;
}

export default function TablePreview({
    tables,
    file,
    mode,
    pages,
    area = "",
    regions = "[]",
    onModeChange,
    onRevise,
    isReextracting = false,
}: TablePreviewProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [downloading, setDownloading] = useState<DownloadFormat | null>(null);

    const activeTable = tables[activeIndex] ?? null;

    const handleDownload = async (format: DownloadFormat) => {
        setDownloading(format);
        try {
            await downloadTable(file, -1, format, mode, pages, area, regions);
        } catch (e) {
            alert(`ダウンロードに失敗しました: ${e instanceof Error ? e.message : e}`);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Screen C ヘッダー：アルゴリズム切替 + 戻るボタン */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* アルゴリズム切替 */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        抽出アルゴリズム
                    </span>
                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                        {(["lattice", "stream"] as ExtractionMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => onModeChange(m)}
                                disabled={isReextracting}
                                className={`
                                    flex-1 px-5 py-2 text-sm font-medium transition-all
                                    ${mode === m
                                        ? "bg-indigo-600 text-white"
                                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {isReextracting && mode === m ? (
                                    <span className="animate-spin inline-block mr-1">⏳</span>
                                ) : null}
                                {m === "lattice" ? "🔲 Lattice（罫線あり）" : "〰 Stream（罫線なし）"}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">
                        {mode === "lattice"
                            ? "縦横の罫線（セル境界）を使って表構造を復元。Excel由来の格子型PDF向け。"
                            : "文字の位置と間隔（空白）から列境界を推定。罫線のない表やテキスト中心PDF向け。"}
                    </p>
                </div>

                {/* 選択に戻るボタン */}
                <button
                    onClick={onRevise}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all"
                >
                    ← 選択に戻る
                </button>
            </div>

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
            {activeTable ? (
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
            ) : (
                <div className="text-center py-12 text-slate-400">
                    テーブルが見つかりませんでした。アルゴリズムを切り替えるか、選択範囲を見直してください。
                </div>
            )}

            {/* ダウンロードパネル */}
            {activeTable && (
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">全ページ一括ダウンロード：</span>
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
            )}
        </div>
    );
}
