import type { TranslationKeys } from "./ja";

export const en: TranslationKeys = {
  // layout metadata
  meta_title: "Tabula Web — Extract Tables from PDF",
  meta_description: "A free web tool to convert table data in PDF files to CSV, Excel, and JSON",

  // header
  header_subtitle: "Extract table data from PDF",
  header_reset: "✕ Start over",

  // steps
  step_upload: "① Upload",
  step_select: "② Select Area",
  step_preview: "③ Preview & Export",

  // upload screen
  upload_heading: "Extract tables from PDF instantly",
  upload_subheading: "Just upload a PDF and select the extraction area",
  upload_loading: "⏳ Loading PDF...",
  upload_drag: "Drag & drop a PDF",
  upload_click: "or click to select a file (max 10MB)",

  // select screen
  select_heading: "Select extraction area",
  select_areas_count: "{count} area(s) selected",
  select_no_areas: "No area selected (extract all)",
  select_autodetecting: "Auto-detecting areas... ({processed}/{total} pages)",
  select_extracting: "Extracting... (first run may take 10–20 sec for cold start)",
  select_extract_selected: "Extract {count} selected area(s) & preview",
  select_extract_all: "Extract all & preview",

  // preview screen
  preview_tables_found: "{count} table(s) found",
  preview_no_tables: "No tables found",
  preview_extracted_from: "Extracted from {count} selected area(s)",
  preview_back: "← Back to area selection (revise)",
  preview_no_tables_detail: "No tables found.",
  preview_no_tables_hint: "Try switching the algorithm or go back to revise the selection area.",

  // PdfPageViewer
  page_prev: "← Previous",
  page_next: "Next →",
  page_indicator: "{current} / {total} pages",
  page_autodetecting: "Auto-detecting... ({processed}/{total}{detail})",
  page_autodetecting_detail: " · processing: page {current}",
  page_clear_current: "Clear this page",
  page_clear_all: "Clear all",
  page_loading: "Loading page...",
  page_load_failed: "Failed to load page",
  page_hint: "💡 Drag to select an area, drag a box to move it, and use handles to resize. Auto-detected areas can also be adjusted.",

  // TablePreview
  table_algorithm: "Extraction Algorithm",
  table_lattice: "🔲 Lattice (with borders)",
  table_stream: "〰 Stream (no borders)",
  table_lattice_desc: "Reconstructs table structure using cell borders. Best for grid-style PDFs from Excel.",
  table_stream_desc: "Estimates column boundaries from character positions and spacing. Best for borderless tables.",
  table_back: "← Back to selection",
  table_tab: "Table {index}",
  table_size: "{rows} rows × {columns} cols",
  table_column_default: "Column {index}",
  table_empty: "No tables found. Try switching the algorithm or revising the selection area.",
  table_download_label: "Download all pages:",
  table_download_failed: "Download failed: {error}",

  // api.ts errors
  api_retry_failed: "Request failed (retry limit reached)",
  api_unknown_error: "Unknown error",
  api_error_status: "Error: {status}",
  api_download_failed: "Download failed",
  api_detect_failed: "Auto-detection failed",
  api_pdf_load_failed: "Failed to load PDF",
  api_extract_failed: "Extraction failed",
  api_reextract_failed: "Re-extraction failed",
};
