"use client";

import { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import PdfPageViewer from "@/components/PdfPageViewer";
import TablePreview from "@/components/TablePreview";
import { ExtractResponse, ExtractionMode } from "@/lib/api";
import { buildExtractionPayload } from "@/lib/extractionPayload";
import { useAutoDetectAreas } from "@/hooks/useAutoDetectAreas";
import { usePdfAreas } from "@/hooks/usePdfAreas";
import { usePdfExtractionActions } from "@/hooks/usePdfExtractionActions";
import { usePdfFileSetup } from "@/hooks/usePdfFileSetup";
import { useI18n } from "@/components/I18nProvider";

type Step = "upload" | "select" | "preview";

export default function Home() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("upload");

  const [mode, setMode] = useState<ExtractionMode>("lattice");
  const [result, setResult] = useState<ExtractResponse | null>(null);

  const invalidateResult = useCallback(() => {
    setResult(null);
  }, []);

  const {
    areas,
    clearAreas,
    getCurrentAreas,
    handleAreasChange,
    replaceAreas,
  } = usePdfAreas({ onAreasChanged: invalidateResult });

  const handleExtracted = useCallback((data: ExtractResponse) => {
    setResult(data);
    setStep("preview");
  }, []);

  const handleReextracted = useCallback((data: ExtractResponse) => {
    setResult(data);
  }, []);

  const handleFileLoadStart = useCallback(() => {
    setResult(null);
    clearAreas();
  }, [clearAreas]);

  const handleFileLoaded = useCallback(() => {
    setStep("select");
  }, []);

  const {
    file,
    pageCount,
    isLoadingFile,
    fileError,
    clearFileError,
    handleFileSelect: loadFile,
    resetFileSetup,
  } = usePdfFileSetup({
    onBeforeLoad: handleFileLoadStart,
    onLoaded: handleFileLoaded,
    messages: {
      pdfLoadFailed: t("api_pdf_load_failed"),
    },
  });

  const {
    isAutoDetecting,
    autoDetectCurrentPage,
    processedPageCount,
    resetAutoDetect,
  } = useAutoDetectAreas({
    file,
    pageCount,
    onAreasDetected: replaceAreas,
  });

  const handleFileSelect = useCallback((nextFile: File) => {
    resetAutoDetect();
    loadFile(nextFile);
  }, [loadFile, resetAutoDetect]);

  const {
    loading: isExtracting,
    error: extractionError,
    isReextracting,
    clearError: clearExtractionError,
    handleExtract,
    handleModeChange,
  } = usePdfExtractionActions({
    file,
    mode,
    setMode,
    isAutoDetecting,
    getAreas: getCurrentAreas,
    onExtracted: handleExtracted,
    onReextracted: handleReextracted,
    messages: {
      extractFailed: t("api_extract_failed"),
      reextractFailed: t("api_reextract_failed"),
    },
  });

  const loading = isLoadingFile || isExtracting;
  const error = fileError ?? extractionError;

  // Screen C → B（選択に戻る）
  const handleRevise = () => {
    setStep("select");
    setResult(null);
    clearExtractionError();
  };

  // 全リセット
  const handleReset = () => {
    setStep("upload");
    resetFileSetup();
    clearAreas();
    setResult(null);
    clearFileError();
    clearExtractionError();
    setMode("lattice");
    resetAutoDetect();
  };

  // ステップインジケーター
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: t("step_upload") },
    { key: "select", label: t("step_select") },
    { key: "preview", label: t("step_preview") },
  ];

  const extractionPayload = buildExtractionPayload(getCurrentAreas());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* ヘッダー */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Tabula Web</h1>
              <p className="text-xs text-slate-400">{t("header_subtitle")}</p>
            </div>
          </div>
          {step !== "upload" && (
            <button
              onClick={handleReset}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              {t("header_reset")}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* ステップインジケーター */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => {
            // ステップがクリック可能か判定
            const isClickable =
              s.key === "upload" ||
              (s.key === "select" && file !== null) ||
              (s.key === "preview" &&
                !isAutoDetecting &&
                ((step === "select" && file !== null) || result !== null));

            const isActive = step === s.key;
            const isPast = steps.findIndex((x) => x.key === step) > i;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!isClickable) return;

                    if (s.key === "upload") {
                      handleReset();
                      return;
                    }

                    if (s.key === "select") {
                      if (step === "preview") {
                        handleRevise();
                      } else {
                        setStep("select");
                      }
                      return;
                    }

                    // preview
                    if (step === "select") {
                      await handleExtract();
                    } else {
                      setStep("preview");
                    }
                  }}
                  disabled={!isClickable}
                  className={`
                    text-sm font-medium px-3 py-1 rounded-full transition-all
                    ${isActive
                      ? "bg-indigo-600 text-white cursor-default"
                      : isPast
                        ? "bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800 cursor-pointer"
                        : "text-slate-500 cursor-not-allowed"
                    }
                  `}
                >
                  {s.label}
                </button>
                {i < steps.length - 1 && (
                  <span className="text-slate-600">→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-6 py-4 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ─── Screen A: アップロード ─── */}
        {step === "upload" && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                {t("upload_heading")}
              </h2>
              <p className="mt-2 text-slate-400">
                {t("upload_subheading")}
              </p>
            </div>
            <UploadZone onFileSelect={handleFileSelect} disabled={loading} />
            {loading && (
              <p className="text-center text-slate-400 text-sm animate-pulse">
                {t("upload_loading")}
              </p>
            )}
          </div>
        )}

        {/* ─── Screen B: 範囲選択 ─── */}
        {step === "select" && file && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{t("select_heading")}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  📄 {file.name}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                {areas.length > 0 ? (
                  <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300">
                    {t("select_areas_count", { count: areas.length })}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    {t("select_no_areas")}
                  </span>
                )}
              </div>
            </div>

            <PdfPageViewer
              pdfFile={file!}
              pageCount={pageCount}
              areas={areas}
              onAreasChange={handleAreasChange}
              isAutoDetecting={isAutoDetecting}
              autoDetectCurrentPage={autoDetectCurrentPage}
              autoDetectProcessedCount={processedPageCount}
            />

            {isAutoDetecting ? (
              <div className="w-full py-3.5 rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 text-sm flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {t("select_autodetecting", { processed: processedPageCount, total: pageCount })}
              </div>
            ) : (
              <button
                onClick={handleExtract}
                disabled={loading}
                className="
                                w-full py-3.5 rounded-xl font-bold text-base
                                bg-gradient-to-r from-indigo-500 to-cyan-500
                                hover:from-indigo-400 hover:to-cyan-400
                                disabled:opacity-40 disabled:cursor-not-allowed
                                transition-all duration-200 shadow-lg shadow-indigo-500/20
                                flex items-center justify-center gap-2
                            "
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    {t("select_extracting")}
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    {areas.length > 0
                      ? t("select_extract_selected", { count: areas.length })
                      : t("select_extract_all")}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* ─── Screen C: プレビュー & エクスポート ─── */}
        {step === "preview" && result && file && (
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  {result.count > 0
                    ? t("preview_tables_found", { count: result.count })
                    : t("preview_no_tables")}
                </h2>
                {areas.length > 0 && (
                  <span className="text-xs text-slate-400 bg-red-500/10 border border-red-400/20 px-3 py-1 rounded-full text-red-300">
                    {t("preview_extracted_from", { count: areas.length })}
                  </span>
                )}
              </div>

              <div className="mb-4">
                <button
                  onClick={handleRevise}
                  className="text-indigo-300 hover:text-white text-sm flex items-center gap-1 transition-colors"
                >
                  {t("preview_back")}
                </button>
              </div>

              {result.count > 0 ? (
                <div className="bg-white rounded-xl p-4 text-slate-900">
                  <TablePreview
                    tables={result.tables}
                    file={file}
                    mode={mode}
                    pages={extractionPayload.pages}
                    area={extractionPayload.area}
                    regions={extractionPayload.regions}
                    onModeChange={handleModeChange}
                    onRevise={handleRevise}
                    isReextracting={isReextracting}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-slate-500 text-center">
                  <p>{t("preview_no_tables_detail")}</p>
                  <p className="text-sm mt-2">
                    {t("preview_no_tables_hint")}
                  </p>
                  <div className="mt-4 bg-slate-50 rounded-xl p-4">
                    <TablePreview
                      tables={[]}
                      file={file}
                      mode={mode}
                      pages={extractionPayload.pages}
                      area={extractionPayload.area}
                      regions={extractionPayload.regions}
                      onModeChange={handleModeChange}
                      onRevise={handleRevise}
                      isReextracting={isReextracting}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
          Powered by{" "}
          <a
            href="https://github.com/tabulapdf/tabula-java"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            tabula-java
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/chezou/tabula-py"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            tabula-py
          </a>
        </div>
      </footer>
    </div>
  );
}
