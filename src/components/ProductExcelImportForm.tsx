//src/components/ProductExcelImportForm.tsx

"use client";

import Link from "next/link";
import { useState } from "react";

type ImportResult = {
  sheetName: string;
  rowsRead: number;
  validRows: number;
  created: number;
  updated: number;
  stockInitial: number;
  lowStockAlertInitial: number;
  withMainImage: number;
  withFallbackImage: number;
  withoutImage: number;
  byCategory: Record<string, number>;
  skippedRows: Array<{
    rowNumber: number;
    name: string;
    reason: string;
  }>;
};

export default function ProductExcelImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setResult(null);

    if (!file) {
      setError("Seleccioná un archivo Excel.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    const res = await fetch("/api/productos/importar", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo importar el Excel.");
      return;
    }

    setFileName(data.fileName ?? file.name);
    setResult(data.result);
    setFile(null);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="text-lg font-semibold text-slate-950">
          Archivo de productos
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Subí el Excel exportado del catálogo. El sistema tomará el precio de
          contado, calculará costo y financiado, asignará categorías internas y
          dejará stock inicial en 0.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <label className="text-sm font-medium text-slate-700">
            Seleccionar Excel
          </label>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError("");
              setResult(null);
            }}
            className="mt-2 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
          />

          {file && (
            <p className="mt-2 text-sm text-slate-500">
              Archivo seleccionado:{" "}
              <span className="font-semibold text-slate-700">{file.name}</span>
            </p>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          <p className="font-semibold">Importante</p>
          <p>
            Si el producto ya existe, se actualizarán nombre, marca, categoría,
            costo, precio contado, precio financiado e imagen si el Excel trae
            imagen. El stock existente no se pisa.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/productos"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Volver
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Importando..." : "Importar productos"}
          </button>
        </div>
      </form>

      {result && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Importación finalizada
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Archivo:{" "}
                <span className="font-medium text-slate-700">{fileName}</span> ·
                Hoja:{" "}
                <span className="font-medium text-slate-700">
                  {result.sheetName}
                </span>
              </p>
            </div>

            <Link
              href="/productos"
              className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
            >
              Ver productos
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ResultCard label="Filas leídas" value={result.rowsRead} />
            <ResultCard label="Procesadas" value={result.validRows} />
            <ResultCard label="Creados" value={result.created} />
            <ResultCard label="Actualizados" value={result.updated} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ResultCard
              label="Con imagen principal"
              value={result.withMainImage}
            />
            <ResultCard
              label="Imagen fallback"
              value={result.withFallbackImage}
            />
            <ResultCard label="Sin imagen" value={result.withoutImage} />
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <h3 className="text-sm font-semibold text-slate-950">
              Productos por categoría
            </h3>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {Object.entries(result.byCategory)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([categoryName, count]) => (
                  <div
                    key={categoryName}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                  >
                    <span className="font-medium text-slate-700">
                      {categoryName}
                    </span>
                    <span className="font-bold text-slate-950">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Filas salteadas
              </h3>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                {result.skippedRows.length}
              </span>
            </div>

            {result.skippedRows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No hubo filas salteadas.
              </p>
            ) : (
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {result.skippedRows.map((row, index) => (
                  <div
                    key={`${row.rowNumber}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  >
                    <p className="font-semibold text-slate-950">
                      Fila {row.rowNumber} · {row.name}
                    </p>
                    <p className="mt-1 text-slate-500">{row.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
