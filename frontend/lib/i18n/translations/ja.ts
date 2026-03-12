export const ja = {
  // layout metadata
  meta_title: "Tabula Web — PDF から表を抽出",
  meta_description: "PDF ファイルにある表データを CSV・Excel・JSON に変換できる無料ウェブツール",

  // header
  header_subtitle: "PDF から表データを抽出",
  header_reset: "✕ 最初からやり直す",

  // steps
  step_upload: "① アップロード",
  step_select: "② 範囲選択",
  step_preview: "③ プレビュー & エクスポート",

  // upload screen
  upload_heading: "PDF の表を一瞬で抽出",
  upload_subheading: "PDF をアップロードして、抽出範囲を選択するだけ",
  upload_loading: "⏳ PDF を読み込んでいます...",
  upload_drag: "PDF をドラッグ＆ドロップ",
  upload_click: "または クリックしてファイルを選択（最大 10MB）",

  // select screen
  select_heading: "抽出範囲を選択",
  select_areas_count: "{count} 件の範囲を選択中",
  select_no_areas: "範囲未選択（全体を抽出）",
  select_autodetecting: "自動範囲選択中...（{processed}/{total} ページ）",
  select_extracting: "抽出中...（初回は起動待ちで10〜20秒かかる場合があります）",
  select_extract_selected: "選択範囲（全{count}件）を抽出してプレビュー",
  select_extract_all: "全体を抽出してプレビュー",

  // preview screen
  preview_tables_found: "{count} 件のテーブルが見つかりました",
  preview_no_tables: "テーブルが見つかりませんでした",
  preview_extracted_from: "選択範囲 {count} 件から抽出",
  preview_back: "← 範囲選択に戻る（修正する）",
  preview_no_tables_detail: "テーブルが見つかりませんでした。",
  preview_no_tables_hint: "アルゴリズムを切り替えるか、「選択に戻る」で範囲を見直してください。",

  // PdfPageViewer
  page_prev: "← 前のページ",
  page_next: "次のページ →",
  page_indicator: "{current} / {total} ページ",
  page_autodetecting: "自動検出中...（{processed}/{total}{detail}）",
  page_autodetecting_detail: "・処理中: {current}ページ",
  page_clear_current: "このページの選択を削除",
  page_clear_all: "すべて削除",
  page_loading: "ページを読み込み中...",
  page_load_failed: "ページの読み込みに失敗しました",
  page_hint: "💡 ドラッグで範囲選択、枠をドラッグで移動、ハンドルでリサイズが可能です。自動検出された範囲も調整できます。",

  // TablePreview
  table_algorithm: "抽出アルゴリズム",
  table_lattice: "🔲 Lattice（罫線あり）",
  table_stream: "〰 Stream（罫線なし）",
  table_lattice_desc: "縦横の罫線（セル境界）を使って表構造を復元。Excel由来の格子型PDF向け。",
  table_stream_desc: "文字の位置と間隔（空白）から列境界を推定。罫線のない表やテキスト中心PDF向け。",
  table_back: "← 選択に戻る",
  table_tab: "テーブル {index}",
  table_size: "{rows}行 × {columns}列",
  table_column_default: "列 {index}",
  table_empty: "テーブルが見つかりませんでした。アルゴリズムを切り替えるか、選択範囲を見直してください。",
  table_download_label: "全ページ一括ダウンロード：",
  table_download_failed: "ダウンロードに失敗しました: {error}",

  // api.ts errors
  api_retry_failed: "リクエストが失敗しました（リトライ上限）",
  api_unknown_error: "不明なエラー",
  api_error_status: "エラー: {status}",
  api_download_failed: "ダウンロードに失敗しました",
  api_detect_failed: "自動検出に失敗しました",
  api_pdf_load_failed: "PDF の読み込みに失敗しました",
  api_extract_failed: "抽出に失敗しました",
  api_reextract_failed: "再抽出に失敗しました",
} as const;

export type TranslationKeys = Record<keyof typeof ja, string>;
