import { useCallback, useState } from "react";
import { getPageCount } from "@/lib/api";

type UsePdfFileSetupOptions = {
  onBeforeLoad: () => void;
  onLoaded: () => void;
  messages: {
    pdfLoadFailed: string;
  };
};

export function usePdfFileSetup({
  onBeforeLoad,
  onLoaded,
  messages,
}: UsePdfFileSetupOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const clearFileError = useCallback(() => {
    setFileError(null);
  }, []);

  const handleFileSelect = useCallback(async (nextFile: File) => {
    setFile(nextFile);
    setFileError(null);
    onBeforeLoad();
    setIsLoadingFile(true);

    try {
      const count = await getPageCount(nextFile);
      setPageCount(count);
      onLoaded();
    } catch (e) {
      setFileError(e instanceof Error ? e.message : messages.pdfLoadFailed);
    } finally {
      setIsLoadingFile(false);
    }
  }, [messages.pdfLoadFailed, onBeforeLoad, onLoaded]);

  const resetFileSetup = useCallback(() => {
    setFile(null);
    setPageCount(1);
    setIsLoadingFile(false);
    setFileError(null);
  }, []);

  return {
    file,
    pageCount,
    isLoadingFile,
    fileError,
    clearFileError,
    handleFileSelect,
    resetFileSetup,
  };
}
