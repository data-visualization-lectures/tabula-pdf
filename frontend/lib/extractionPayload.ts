export type ExtractionArea = {
  page: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type ExtractionPayload = {
  area: string;
  pages: string;
  regions: string;
};

export function areasToRegionsJson(areas: ExtractionArea[]): string {
  if (areas.length === 0) return "[]";

  return JSON.stringify(
    areas.map((area) => ({
      page: area.page,
      top: area.top,
      left: area.left,
      bottom: area.bottom,
      right: area.right,
    })),
  );
}

export function areasToPages(areas: ExtractionArea[]): string {
  if (areas.length === 0) return "all";

  const pages = [...new Set(areas.map((area) => area.page))].sort((a, b) => a - b);
  return pages.join(",");
}

export function buildExtractionPayload(areas: ExtractionArea[]): ExtractionPayload {
  return {
    area: "",
    pages: areasToPages(areas),
    regions: areasToRegionsJson(areas),
  };
}
