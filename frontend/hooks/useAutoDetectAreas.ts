import { useCallback, useEffect, useRef, useState } from "react";
import type { Area } from "@/components/PdfPageViewer";
import { detectTables } from "@/lib/api";

type UseAutoDetectAreasOptions = {
  file: File | null;
  pageCount: number;
  onAreasDetected: (areas: Area[]) => void;
};

export function useAutoDetectAreas({
  file,
  pageCount,
  onAreasDetected,
}: UseAutoDetectAreasOptions) {
  const processedPages = useRef<Set<number>>(new Set());
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectCurrentPage, setAutoDetectCurrentPage] = useState<number | null>(null);
  const [processedPageCount, setProcessedPageCount] = useState(0);

  const resetAutoDetect = useCallback(() => {
    processedPages.current.clear();
    setIsAutoDetecting(false);
    setAutoDetectCurrentPage(null);
    setProcessedPageCount(0);
  }, []);

  const markPageProcessed = useCallback((page: number) => {
    if (!processedPages.current.has(page)) {
      processedPages.current.add(page);
      setProcessedPageCount(processedPages.current.size);
    }
  }, []);

  useEffect(() => {
    if (!file || pageCount <= 0) return;

    let cancelled = false;

    const runAutoDetectAllPages = async () => {
      setIsAutoDetecting(true);
      setAutoDetectCurrentPage(null);
      setProcessedPageCount(0);
      processedPages.current.clear();
      const collectedAreas: Area[] = [];

      for (let page = 1; page <= pageCount; page++) {
        if (cancelled) return;
        setAutoDetectCurrentPage(page);

        try {
          const res = await detectTables(file, page);
          if (cancelled) return;

          if (res.areas.length > 0) {
            collectedAreas.push(...res.areas);
          }
        } catch (e) {
          if (!cancelled) {
            console.warn(`[AutoDetect] Failed: Page ${page}`, e);
          }
        } finally {
          if (!cancelled) {
            markPageProcessed(page);
          }
        }
      }

      if (!cancelled) {
        onAreasDetected(collectedAreas);
        setAutoDetectCurrentPage(null);
        setIsAutoDetecting(false);
      }
    };

    runAutoDetectAllPages();

    return () => {
      cancelled = true;
    };
  }, [file, pageCount, markPageProcessed, onAreasDetected]);

  return {
    isAutoDetecting,
    autoDetectCurrentPage,
    processedPageCount,
    resetAutoDetect,
  };
}
