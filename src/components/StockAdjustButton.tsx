"use client";

import { useMemo, useState, type WheelEvent } from "react";
import { useRouter } from "next/navigation";

function preventNumberWheel(e: WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}

export default function StockAdjustButton({
  productId,
  productName,
  currentStock,
  currentLowStockAlert,
}: {
  productId: number;
  productName: string;
  currentStock: number;
  currentLowStockAlert: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [stock, setStock] = useState(String(currentStock));
  const [lowStockAlert, setLowStockAlert] = useState(
    String(currentLowStockAlert),
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedStock = Number(stock);
  const parsedLowStockAlert = Number(lowStockAlert);

  const difference = useMemo(() => {
    if (!Number.isInteger(parsedStock) || parsedStock < 0) return 0;

    return parsedStock - currentStock;
  }, [parsedStock, currentStock]);

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setError("");
    setStock(String(currentStock));
    setLowStockAlert(String(currentLowStockAlert));
    setNote("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError("Ingresá un stock válido.");
      return;
    }

    if (!Number.isInteger(parsedLowStockAlert) || parsedLowStockAlert < 0) {
      setError("Ingresá una alerta de stock bajo válida.");
      return;
    }

    const stockChanged = parsedStock !== currentStock;
    const alertChanged = parsedLowStockAlert !== currentLowStockAlert;

    if (!stockChanged && !alertChanged) {
      setError("No hay cambios para guardar.");
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
        lowStockAlert: parsedLowStockAlert,
        note,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo ajustar el stock.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
      >
        Ajustar stock
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex min-h-dvh w-full max-w-xl items-center">
            <div className="w-full rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-950">
                Ajustar stock
              </h2>

              <p className="mt-1 text-sm text-slate-500">{productName}</p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
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

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <label className="text-sm font-medium text-slate-700">
                    Nuevo stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onWheel={preventNumberWheel}
                    onChange={(e) => setStock(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <label className="text-sm font-medium text-slate-700">
                    Alerta stock bajo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={lowStockAlert}
                    onWheel={preventNumberWheel}
                    onChange={(e) => setLowStockAlert(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Si el stock queda igual o por debajo de este número, el
                    producto se marcará como stock bajo.
                  </p>
                </div>

                <div>
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

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
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
                    {loading ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}
