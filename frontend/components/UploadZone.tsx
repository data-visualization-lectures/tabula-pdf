"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
}

export default function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
    const { t } = useI18n();
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
        rounded-xl border-2 border-dashed p-12 text-center
        transition-all duration-200 cursor-pointer
        ${isDragging
                    ? "border-[#0F6CBD] bg-blue-50"
                    : "border-gray-300 bg-gray-50 hover:border-[#0F6CBD] hover:bg-blue-50"
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
                <p className="text-lg font-semibold text-gray-800">
                    {t("upload_drag")}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                    {t("upload_click")}
                </p>
            </div>
        </div>
    );
}
