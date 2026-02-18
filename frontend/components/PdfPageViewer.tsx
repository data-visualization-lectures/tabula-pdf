"use client";

import { useCallback, useEffect, useRef, useState, Dispatch, SetStateAction } from "react";
import { getPageImageUrl } from "@/lib/api";

export type Area = {
    top: number;
    left: number;
    bottom: number;
    right: number;
    page: number;
};

type DragType = "create" | "move" | "resize";
type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w";

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

export default function PdfPageViewer({
    pdfFile,
    pageCount,
    areas,
    onAreasChange,
    isAutoDetecting,
    autoDetectCurrentPage,
    autoDetectProcessedCount,
}: PdfPageViewerProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loadingImage, setLoadingImage] = useState(false);
    const [drag, setDrag] = useState<DragState | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // ページ画像の読み込み
    useEffect(() => {
        let cancelled = false;
        let prevUrl: string | null = null;

        const load = async () => {
            setLoadingImage(true);
            setImageUrl(null);
            try {
                const url = await getPageImageUrl(pdfFile, currentPage);
                if (!cancelled) {
                    if (prevUrl) URL.revokeObjectURL(prevUrl);
                    prevUrl = url;
                    setImageUrl(url);
                }
            } catch (e) {
                console.error("ページ画像の取得に失敗しました", e);
            } finally {
                if (!cancelled) setLoadingImage(false);
            }
        };

        load();
        return () => {
            cancelled = true;
            if (prevUrl) URL.revokeObjectURL(prevUrl);
        };
    }, [pdfFile, currentPage]);

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

            // 変更のコミット
            if (drag.type === "create") {
                const minX = Math.min(drag.startX, drag.currentX);
                const maxX = Math.max(drag.startX, drag.currentX);
                const minY = Math.min(drag.startY, drag.currentY);
                const maxY = Math.max(drag.startY, drag.currentY);

                if (maxX - minX > 0.01 && maxY - minY > 0.01) {
                    const newArea: Area = {
                        top: minY,
                        left: minX,
                        bottom: maxY,
                        right: maxX,
                        page: currentPage,
                    };
                    onAreasChange((prev) => [...prev, newArea]);
                }
            } else if (drag.type === "move" && drag.initialArea) {
                const dx = drag.currentX - drag.startX;
                const dy = drag.currentY - drag.startY;
                const init = drag.initialArea;

                let newTop = init.top + dy;
                let newLeft = init.left + dx;
                let newBottom = init.bottom + dy;
                let newRight = init.right + dx;

                const width = newRight - newLeft;
                const height = newBottom - newTop;

                // 範囲制限
                if (newLeft < 0) { newLeft = 0; newRight = width; }
                if (newTop < 0) { newTop = 0; newBottom = height; }
                if (newRight > 1) { newRight = 1; newLeft = 1 - width; }
                if (newBottom > 1) { newBottom = 1; newTop = 1 - height; }

                const updatedArea = { ...init, top: newTop, left: newLeft, bottom: newBottom, right: newRight };

                // グローバルな areas 配列の該当部分を更新
                onAreasChange((prev) => {
                    const pageAreas = prev.filter((a) => a.page === currentPage);
                    const targetArea = pageAreas[drag.targetIndex];
                    if (!targetArea) return prev;
                    const globalIndex = prev.indexOf(targetArea);
                    if (globalIndex === -1) return prev;
                    const next = [...prev];
                    next[globalIndex] = updatedArea;
                    return next;
                });
            } else if (drag.type === "resize" && drag.initialArea && drag.handle) {
                const dx = drag.currentX - drag.startX;
                const dy = drag.currentY - drag.startY;
                const init = drag.initialArea;

                let { top, left, bottom, right } = init;

                if (drag.handle.includes("n")) top += dy;
                if (drag.handle.includes("s")) bottom += dy;
                if (drag.handle.includes("w")) left += dx;
                if (drag.handle.includes("e")) right += dx;

                // 最小サイズ & 反転防止
                if (right - left < 0.01) {
                    if (drag.handle.includes("w")) left = right - 0.01;
                    else right = left + 0.01;
                }
                if (bottom - top < 0.01) {
                    if (drag.handle.includes("n")) top = bottom - 0.01;
                    else bottom = top + 0.01;
                }

                const updatedArea = {
                    top: Math.max(0, Math.min(1, top)),
                    left: Math.max(0, Math.min(1, left)),
                    bottom: Math.max(0, Math.min(1, bottom)),
                    right: Math.max(0, Math.min(1, right)),
                    page: currentPage
                };

                onAreasChange((prev) => {
                    const pageAreas = prev.filter((a) => a.page === currentPage);
                    const targetArea = pageAreas[drag.targetIndex];
                    if (!targetArea) return prev;
                    const globalIndex = prev.indexOf(targetArea);
                    if (globalIndex === -1) return prev;
                    const next = [...prev];
                    next[globalIndex] = updatedArea;
                    return next;
                });
            }

            setDrag(null);
        },
        [drag, currentPage, isAutoDetecting, onAreasChange]
    );

    const getRenderArea = (area: Area, index: number) => {
        // ドラッグ中のエリアがあれば、その計算値を返す
        if (drag && (drag.type === "move" || drag.type === "resize") && drag.targetIndex === index && drag.initialArea) {
            const dx = drag.currentX - drag.startX;
            const dy = drag.currentY - drag.startY;
            const init = drag.initialArea;

            if (drag.type === "move") {
                let top = init.top + dy;
                let left = init.left + dx;
                let bottom = init.bottom + dy;
                let right = init.right + dx;

                const w = right - left;
                const h = bottom - top;

                if (left < 0) { left = 0; right = w; }
                if (top < 0) { top = 0; bottom = h; }
                if (right > 1) { right = 1; left = 1 - w; }
                if (bottom > 1) { bottom = 1; top = 1 - h; }

                return { ...init, top, left, bottom, right };
            } else if (drag.type === "resize" && drag.handle) {
                const dx = drag.currentX - drag.startX; // ここはバグってたので修正不要、再利用
                const dy = drag.currentY - drag.startY;
                let { top, left, bottom, right } = init;
                if (drag.handle.includes("n")) top += dy;
                if (drag.handle.includes("s")) bottom += dy;
                if (drag.handle.includes("w")) left += dx;
                if (drag.handle.includes("e")) right += dx;
                return { ...init, top, left, bottom, right };
            }
        }
        return area;
    };

    const removeArea = (index: number) => {
        onAreasChange((prev) => {
            const pageAreas = prev.filter((a) => a.page === currentPage);
            const target = pageAreas[index];
            if (!target) return prev;
            const globalIndex = prev.indexOf(target);
            if (globalIndex === -1) return prev;
            const next = [...prev];
            next.splice(globalIndex, 1);
            return next;
        });
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
                        ← 前のページ
                    </button>
                    <span className="text-sm text-slate-300">
                        {currentPage} / {pageCount} ページ
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                        disabled={currentPage === pageCount}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all"
                    >
                        次のページ →
                    </button>
                    {isAutoDetecting && (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-300 animate-pulse">
                            <span className="animate-spin">⏳</span>
                            自動検出中...（{autoDetectProcessedCount}/{pageCount}
                            {autoDetectCurrentPage ? `・処理中: ${autoDetectCurrentPage}ページ` : ""}
                            ）
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
                            このページの選択を削除
                        </button>
                    )}
                    {areas.length > 0 && (
                        <button
                            onClick={clearAll}
                            disabled={isAutoDetecting}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            すべて削除
                        </button>
                    )}
                </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-800 select-none">
                {loadingImage ? (
                    <div className="flex items-center justify-center h-96 text-slate-400">
                        <span className="animate-spin mr-2">⏳</span> ページを読み込み中...
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
                                    {["nw", "ne", "sw", "se", "n", "e", "s", "w"].map((h) => (
                                        <div
                                            key={h}
                                            className={`absolute w-3 h-3 bg-red-500 rounded-full border border-white z-20
                                                opacity-0 group-hover:opacity-100 transition-opacity
                                                ${h.includes("n") ? "-top-1.5" : h.includes("s") ? "-bottom-1.5" : "top-1/2 -translate-y-1/2"}
                                                ${h.includes("w") ? "-left-1.5" : h.includes("e") ? "-right-1.5" : "left-1/2 -translate-x-1/2"}
                                                cursor-${h}-resize
                                            `}
                                            onMouseDown={(e) => handleMouseDownHandle(e, originalArea, i, h as ResizeHandle)}
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
                        ページの読み込みに失敗しました
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-500 text-center">
                💡 ドラッグで範囲選択、枠をドラッグで移動、ハンドルでリサイズが可能です。自動検出された範囲も調整できます。
            </p>
        </div>
    );
}
