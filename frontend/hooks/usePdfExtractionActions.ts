import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { Area } from "@/components/PdfPageViewer";
import { type ExtractResponse, type ExtractionMode, extractTables } from "@/lib/api";
import { buildExtractionPayload } from "@/lib/extractionPayload";

type UsePdfExtractionActionsOptions = {
  file: File | null;
  mode: ExtractionMode;
  setMode: Dispatch<SetStateAction<ExtractionMode>>;
  isAutoDetecting: boolean;
  getAreas: () => Area[];
  onExtracted: (data: ExtractResponse) => void;
  onReextracted: (data: ExtractResponse) => void;
  messages: {
    extractFailed: string;
    reextractFailed: string;
  };
};

export function usePdfExtractionActions({
  file,
  mode,
  setMode,
  isAutoDetecting,
  getAreas,
  onExtracted,
  onReextracted,
  messages,
}: UsePdfExtractionActionsOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReextracting, setIsReextracting] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!file || isAutoDetecting) return;

    setLoading(true);
    setError(null);

    try {
      const payload = buildExtractionPayload(getAreas());
      const data = await extractTables(file, mode, payload.pages, payload.area, payload.regions);
      onExtracted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : messages.extractFailed);
    } finally {
      setLoading(false);
    }
  }, [file, getAreas, isAutoDetecting, messages.extractFailed, mode, onExtracted]);

  const handleModeChange = useCallback(async (newMode: ExtractionMode) => {
    if (!file || newMode === mode) return;

    setMode(newMode);
    setIsReextracting(true);

    try {
      const payload = buildExtractionPayload(getAreas());
      const data = await extractTables(file, newMode, payload.pages, payload.area, payload.regions);
      onReextracted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : messages.reextractFailed);
    } finally {
      setIsReextracting(false);
    }
  }, [file, getAreas, messages.reextractFailed, mode, onReextracted, setMode]);

  return {
    loading,
    error,
    isReextracting,
    clearError,
    handleExtract,
    handleModeChange,
  };
}
