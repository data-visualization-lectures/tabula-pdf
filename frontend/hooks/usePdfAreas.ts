import { useCallback, useRef, useState, type SetStateAction } from "react";
import type { Area } from "@/lib/pdfAreas";

type UsePdfAreasOptions = {
  onAreasChanged?: () => void;
};

export function usePdfAreas({ onAreasChanged }: UsePdfAreasOptions = {}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const areasRef = useRef<Area[]>([]);

  const replaceAreas = useCallback((nextAreas: Area[]) => {
    areasRef.current = nextAreas;
    setAreas(nextAreas);
    onAreasChanged?.();
  }, [onAreasChanged]);

  const clearAreas = useCallback(() => {
    replaceAreas([]);
  }, [replaceAreas]);

  const getCurrentAreas = useCallback(() => areasRef.current, []);

  const handleAreasChange = useCallback((nextAreas: SetStateAction<Area[]>) => {
    const resolved = typeof nextAreas === "function"
      ? nextAreas(areasRef.current)
      : nextAreas;
    replaceAreas(resolved);
  }, [replaceAreas]);

  return {
    areas,
    clearAreas,
    getCurrentAreas,
    handleAreasChange,
    replaceAreas,
  };
}
