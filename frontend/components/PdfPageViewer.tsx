"use client";

import { useCallback, useRef, useState, Dispatch, SetStateAction } from "react";
import type { Area } from "@/lib/pdfAreas";
import { useI18n } from "@/components/I18nProvider";
import { usePdfPageImage } from "@/hooks/usePdfPageImage";

type DragType = "create" | "move" | "resize";
type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w";

const MIN_AREA_SIZE = 0.01;
const RESIZE_HANDLES: ResizeHandle[] = ["nw", "ne", "sw", "se", "n", "e", "s", "w"];

interface DragState {
    type: DragType;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    targetIndex: number; // move/resize 対象の index
    initialArea?: Area; // move/resize 開始時のエリア状態
    handle?: ResizeHandle; // resize の場合のハンドル位置
}

interface PdfPageViewerProps {
    pdfFile: File;
    pageCount: number;
    areas: Area[];
    onAreasChange: Dispatch<SetStateAction<Area[]>>;
    isAutoDetecting: boolean;
    autoDetectCurrentPage: number | null;
    autoDetectProcessedCount: number;
}

function clampRatio(value: number) {
    return Math.max(0, Math.min(1, value));
}

function createAreaFromDrag(drag: DragState, currentPage: number): Area | null {
    const minX = Math.min(drag.startX, drag.currentX);
    const maxX = Math.max(drag.startX, drag.currentX);
    const minY = Math.min(drag.startY, drag.currentY);
    const maxY = Math.max(drag.startY, drag.currentY);

    if (maxX - minX <= MIN_AREA_SIZE || maxY - minY <= MIN_AREA_SIZE) {
        return null;
    }

    return {
        top: minY,
        left: minX,
        bottom: maxY,
        right: maxX,
        page: currentPage,
    };
}

function moveArea(area: Area, dx: number, dy: number): Area {
    const width = area.right - area.left;
    const height = area.bottom - area.top;

    let left = area.left + dx;
    let top = area.top + dy;

    left = Math.max(0, Math.min(1 - width, left));
    top = Math.max(0, Math.min(1 - height, top));

    return {
        ...area,
        top,
        left,
        bottom: top + height,
        right: left + width,
    };
}

function resizeArea(area: Area, dx: number, dy: number, handle: ResizeHandle): Area {
    let { top, left, bottom, right } = area;

    if (handle.includes("n")) top += dy;
    if (handle.includes("s")) bottom += dy;
    if (handle.includes("w")) left += dx;
    if (handle.includes("e")) right += dx;

    top = clampRatio(top);
    left = clampRatio(left);
    bottom = clampRatio(bottom);
    right = clampRatio(right);

    if (right - left < MIN_AREA_SIZE) {
        if (handle.includes("w")) {
            left = Math.max(0, right - MIN_AREA_SIZE);
        } else {
            right = Math.min(1, left + MIN_AREA_SIZE);
        }
    }

    if (bottom - top < MIN_AREA_SIZE) {
        if (handle.includes("n")) {
            top = Math.max(0, bottom - MIN_AREA_SIZE);
        } else {
            bottom = Math.min(1, top + MIN_AREA_SIZE);
        }
    }

    return { ...area, top, left, bottom, right };
}

function areaFromDrag(drag: DragState, currentPage: number): Area | null {
    if (drag.type === "create") {
        return createAreaFromDrag(drag, currentPage);
    }

    if (!drag.initialArea) {
        return null;
    }

    const dx = drag.currentX - drag.startX;
    const dy = drag.currentY - drag.startY;

    if (drag.type === "move") {
        return moveArea(drag.initialArea, dx, dy);
    }

    if (drag.type === "resize" && drag.handle) {
        return resizeArea(drag.initialArea, dx, dy, drag.handle);
    }

    return null;
}

function findAreaIndexOnPage(areas: Area[], currentPage: number, pageAreaIndex: number) {
    const pageAreas = areas.filter((a) => a.page === currentPage);
    const targetArea = pageAreas[pageAreaIndex];
    return targetArea ? areas.indexOf(targetArea) : -1;
}

function replaceAreaOnPage(areas: Area[], currentPage: number, pageAreaIndex: number, updatedArea: Area) {
    const globalIndex = findAreaIndexOnPage(areas, currentPage, pageAreaIndex);
    if (globalIndex === -1) return areas;

    const next = [...areas];
    next[globalIndex] = updatedArea;
    return next;
}

function removeAreaOnPage(areas: Area[], currentPage: number, pageAreaIndex: number) {
    const globalIndex = findAreaIndexOnPage(areas, currentPage, pageAreaIndex);
    if (globalIndex === -1) return areas;

    const next = [...areas];
    next.splice(globalIndex, 1);
    return next;
}

export default function PdfPageViewer({
    pdfFile,
    pageCount,
    areas,
    onAreasChange,
    isAutoDetecting,
    autoDetectCurrentPage,
    autoDetectProcessedCount,
}: PdfPageViewerProps) {
    const { t } = useI18n();
    const [currentPage, setCurrentPage] = useState(1);
    const [drag, setDrag] = useState<DragState | null>(null);
    const { imageUrl, loadingImage } = usePdfPageImage(pdfFile, currentPage);

    const containerRef = useRef<HTMLDivElement>(null);

    const getResizeCursor = (handle: ResizeHandle) => {
        if (handle === "n" || handle === "s") return "ns-resize";
        if (handle === "e" || handle === "w") return "ew-resize";
        if (handle === "nw" || handle === "se") return "nwse-resize";
        return "nesw-resize";
    };

    // 現在ページの選択枠
    const currentAreas = areas.filter((a) => a.page === currentPage);

    // マウス座標 → コンテナ内の相対座標（0〜1）
    const getRelativePos = useCallback(
        (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return { x: 0, y: 0 };
            return {
                x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
                y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
            };
        },
        []
    );

    // ─── Event Handlers ───

    const handleMouseDownContainer = (e: React.MouseEvent<HTMLDivElement>) => {
        // 背景クリック時のみ新規作成
        if (isAutoDetecting) return;
        if (e.button !== 0) return;
        const pos = getRelativePos(e);
        setDrag({
            type: "create",
            startX: pos.x,
            startY: pos.y,
            currentX: pos.x,
            currentY: pos.y,
            targetIndex: -1,
        });
    };

    const handleMouseDownArea = (e: React.MouseEvent<HTMLDivElement>, area: Area, index: number) => {
        if (isAutoDetecting) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        const pos = getRelativePos(e);
        setDrag({
            type: "move",
            startX: pos.x,
            startY: pos.y,
            currentX: pos.x,
            currentY: pos.y,
            targetIndex: index,
            initialArea: { ...area },
        });
    };

    const handleMouseDownHandle = (e: React.MouseEvent<HTMLDivElement>, area: Area, index: number, handle: ResizeHandle) => {
        if (isAutoDetecting) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        const pos = getRelativePos(e);
        setDrag({
            type: "resize",
            startX: pos.x,
            startY: pos.y,
            currentX: pos.x,
            currentY: pos.y,
            targetIndex: index,
            initialArea: { ...area },
            handle,
        });
    };

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!drag) return;
            const pos = getRelativePos(e);
            setDrag((d) => d && { ...d, currentX: pos.x, currentY: pos.y });
        },
        [drag, getRelativePos]
    );

    const handleMouseUp = useCallback(
        () => {
            if (isAutoDetecting) return;
            if (!drag) return;

            const updatedArea = areaFromDrag(drag, currentPage);

            if (updatedArea && drag.type === "create") {
                onAreasChange((prev) => [...prev, updatedArea]);
            } else if (updatedArea) {
                onAreasChange((prev) => replaceAreaOnPage(prev, currentPage, drag.targetIndex, updatedArea));
            }

            setDrag(null);
        },
        [drag, currentPage, isAutoDetecting, onAreasChange]
    );

    const getRenderArea = (area: Area, index: number) => {
        if (drag && (drag.type === "move" || drag.type === "resize") && drag.targetIndex === index && drag.initialArea) {
            return areaFromDrag(drag, currentPage) ?? area;
        }
        return area;
    };

    const removeArea = (index: number) => {
        onAreasChange((prev) => removeAreaOnPage(prev, currentPage, index));
    };

    const clearCurrentPage = () => {
        if (isAutoDetecting) return;
        onAreasChange((prev) => prev.filter((a) => a.page !== currentPage));
        // 親の処理済みフラグは消さない = 「一度検出したがユーザーが消した」状態を維持
        // もし「消したらまた再検出してほしい」ならここで onProcessPage(null) 的な処理が必要だが
        // 仕様としては「勝手に復活しない」が正解なので、何もしなくてよい
    };

    const clearAll = () => {
        if (isAutoDetecting) return;
        onAreasChange(() => []);
        // ここでも processedPages はリセットしない（セッション中は再検出しない）
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all"
                    >
                        {t("page_prev")}
                    </button>
                    <span className="text-sm text-slate-300">
                        {t("page_indicator", { current: currentPage, total: pageCount })}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                        disabled={currentPage === pageCount}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all"
                    >
                        {t("page_next")}
                    </button>
                    {isAutoDetecting && (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-300 animate-pulse">
                            <span className="animate-spin">⏳</span>
                            {t("page_autodetecting", {
                                processed: autoDetectProcessedCount,
                                total: pageCount,
                                detail: autoDetectCurrentPage ? t("page_autodetecting_detail", { current: autoDetectCurrentPage }) : "",
                            })}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {currentAreas.length > 0 && (
                        <button
                            onClick={clearCurrentPage}
                            disabled={isAutoDetecting}
                            className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t("page_clear_current")}
                        </button>
                    )}
                    {areas.length > 0 && (
                        <button
                            onClick={clearAll}
                            disabled={isAutoDetecting}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t("page_clear_all")}
                        </button>
                    )}
                </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-800 select-none">
                {loadingImage ? (
                    <div className="flex items-center justify-center h-96 text-slate-400">
                        <span className="animate-spin mr-2">⏳</span> {t("page_loading")}
                    </div>
                ) : imageUrl ? (
                    <div
                        ref={containerRef}
                        className={`relative ${isAutoDetecting ? "cursor-wait" : "cursor-crosshair"}`}
                        onMouseDown={handleMouseDownContainer}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => setDrag(null)}
                    >
                        <img
                            src={imageUrl}
                            alt={`Page ${currentPage}`}
                            className="w-full h-auto block"
                            draggable={false}
                        />

                        {currentAreas.map((originalArea, i) => {
                            const area = getRenderArea(originalArea, i);
                            const isActive = drag?.targetIndex === i;

                            return (
                                <div
                                    key={i}
                                    className={`absolute border-2 ${isActive ? "border-red-400 bg-red-400/20" : "border-red-500 bg-red-500/10"} group`}
                                    style={{
                                        left: `${area.left * 100}%`,
                                        top: `${area.top * 100}%`,
                                        width: `${(area.right - area.left) * 100}%`,
                                        height: `${(area.bottom - area.top) * 100}%`,
                                        cursor: "move",
                                    }}
                                    onMouseDown={(e) => handleMouseDownArea(e, originalArea, i)}
                                >
                                    {RESIZE_HANDLES.map((h) => (
                                        <div
                                            key={h}
                                            className={`absolute w-3 h-3 bg-red-500 rounded-full border border-white z-20
                                                opacity-0 group-hover:opacity-100 transition-opacity
                                                ${h.includes("n") ? "-top-1.5" : h.includes("s") ? "-bottom-1.5" : "top-1/2 -translate-y-1/2"}
                                                ${h.includes("w") ? "-left-1.5" : h.includes("e") ? "-right-1.5" : "left-1/2 -translate-x-1/2"}
                                            `}
                                            style={{ cursor: getResizeCursor(h) }}
                                            onMouseDown={(e) => handleMouseDownHandle(e, originalArea, i, h)}
                                        />
                                    ))}
                                    <button
                                        disabled={isAutoDetecting}
                                        className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed z-30"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); removeArea(i); }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}

                        {drag?.type === "create" && (
                            <div
                                className="absolute border-2 border-dashed border-red-400 bg-red-400/10 pointer-events-none"
                                style={{
                                    left: `${Math.min(drag.startX, drag.currentX) * 100}%`,
                                    top: `${Math.min(drag.startY, drag.currentY) * 100}%`,
                                    width: `${Math.abs(drag.currentX - drag.startX) * 100}%`,
                                    height: `${Math.abs(drag.currentY - drag.startY) * 100}%`,
                                }}
                            />
                        )}

                        {isAutoDetecting && (
                            <div className="absolute inset-0 bg-slate-900/20 pointer-events-none" />
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-96 text-slate-400">
                        {t("page_load_failed")}
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-500 text-center">
                {t("page_hint")}
            </p>
        </div>
    );
}
