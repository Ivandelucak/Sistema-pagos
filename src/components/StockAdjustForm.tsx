"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function StockAdjustForm({
  productId,
  productName,
  currentStock,
}: {
  productId: number;
  productName: string;
  currentStock: number;
}) {
  const router = useRouter();

  const [stock, setStock] = useState(String(currentStock));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedStock = Number(stock);

  const difference = useMemo(() => {
    if (!Number.isInteger(parsedStock) || parsedStock < 0) return 0;
    return parsedStock - currentStock;
  }, [parsedStock, currentStock]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError("Ingresá un stock válido.");
      return;
    }

    if (parsedStock === currentStock) {
      setError("No hay cambios de stock para guardar.");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/productos/${productId}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stock: parsedStock,
        note,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo ajustar el stock.");
      return;
    }

    router.push("/productos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-950">{productName}</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Info label="Stock actual" value={String(currentStock)} />
          <Info
            label="Nuevo stock"
            value={
              Number.isInteger(parsedStock) && parsedStock >= 0
                ? String(parsedStock)
                : "-"
            }
          />
          <Info
            label="Diferencia"
            value={`${difference > 0 ? "+" : ""}${difference}`}
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-slate-700">
            Nuevo stock
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-slate-700">
            Motivo / nota
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ej: reposición, corrección de inventario, error de carga..."
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/productos")}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar stock"}
        </button>
      </div>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
