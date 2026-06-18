import { useEffect, useState } from "react";
import { getPageImageUrl } from "@/lib/api";

export function usePdfPageImage(pdfFile: File, currentPage: number) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoadingImage(true);
      setImageUrl(null);

      try {
        const url = await getPageImageUrl(pdfFile, currentPage);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        objectUrl = url;
        setImageUrl(url);
      } catch (e) {
        console.error("ページ画像の取得に失敗しました", e);
      } finally {
        if (!cancelled) setLoadingImage(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfFile, currentPage]);

  return {
    imageUrl,
    loadingImage,
  };
}
