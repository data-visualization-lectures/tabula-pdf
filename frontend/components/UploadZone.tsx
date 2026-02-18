"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
}

export default function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            const file = e.dataTransfer.files[0];
            if (file && file.type === "application/pdf") {
                onFileSelect(file);
            }
        },
        [onFileSelect, disabled]
    );

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelect(file);
        e.target.value = "";
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
        relative flex flex-col items-center justify-center gap-4
        rounded-2xl border-2 border-dashed p-12 text-center
        transition-all duration-200 cursor-pointer
        ${isDragging
                    ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
                    : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
                }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
        >
            <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileInput}
                disabled={disabled}
            />
            <div className="text-5xl">📄</div>
            <div>
                <p className="text-lg font-semibold text-slate-700">
                    PDF をドラッグ＆ドロップ
                </p>
                <p className="text-sm text-slate-500 mt-1">
                    または クリックしてファイルを選択（最大 10MB）
                </p>
            </div>
        </div>
    );
}
