"use client";

import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import TablePreview from "@/components/TablePreview";
import { ExtractResponse, ExtractionMode, extractTables } from "@/lib/api";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ExtractionMode>("lattice");
  const [pages, setPages] = useState("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await extractTables(file, mode, pages);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setPages("all");
    setMode("lattice");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* ヘッダー */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tabula Web</h1>
            <p className="text-xs text-slate-400">PDF から表データを抽出</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* ヒーロー */}
        <div className="text-center">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            PDF の表を一瞬で抽出
          </h2>
          <p className="mt-3 text-slate-400 text-lg">
            PDF をアップロードするだけで、表データを CSV・Excel・JSON に変換できます
          </p>
        </div>

        {/* メインカード */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-6">

          {/* アップロードゾーン */}
          <UploadZone onFileSelect={handleFileSelect} disabled={loading} />

          {/* ファイル情報 */}
          {file && (
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-5 py-3 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                ✕ リセット
              </button>
            </div>
          )}

          {/* オプション */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 抽出モード */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                抽出モード
              </label>
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                {(["lattice", "stream"] as ExtractionMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`
                      flex-1 py-2.5 text-sm font-medium transition-all
                      ${mode === m
                        ? "bg-indigo-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }
                    `}
                  >
                    {m === "lattice" ? "🔲 Lattice（罫線あり）" : "〰 Stream（罫線なし）"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {mode === "lattice"
                  ? "罫線で区切られた表に最適"
                  : "罫線のない表・スペース区切りに最適"}
              </p>
            </div>

            {/* ページ指定 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                ページ指定
              </label>
              <input
                type="text"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="例: all, 1, 1-3, 1,3,5"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500">
                all で全ページ、1-3 で範囲指定
              </p>
            </div>
          </div>

          {/* 抽出ボタン */}
          <button
            onClick={handleExtract}
            disabled={!file || loading}
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
                抽出中...（初回は起動待ちで10〜20秒かかる場合があります）
              </>
            ) : (
              <>
                <span>🔍</span>
                テーブルを抽出する
              </>
            )}
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-6 py-4 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* 結果表示 */}
        {result && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {result.count > 0
                  ? `${result.count} 件のテーブルが見つかりました`
                  : "テーブルが見つかりませんでした"}
              </h3>
              {result.count > 0 && (
                <span className="text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  モード: {mode}
                </span>
              )}
            </div>

            {result.count > 0 && file ? (
              <div className="bg-white rounded-xl p-4 text-slate-900">
                <TablePreview
                  tables={result.tables}
                  file={file}
                  mode={mode}
                  pages={pages}
                />
              </div>
            ) : (
              <p className="text-slate-400 text-sm">
                抽出モードを切り替えて再試行してみてください。
              </p>
            )}
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
