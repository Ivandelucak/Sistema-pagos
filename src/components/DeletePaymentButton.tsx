"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePaymentButton({
  paymentId,
}: {
  paymentId: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setError("");
  }

  async function handleDelete() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/pagos/${paymentId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar el cobro.");
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
        className="text-sm font-semibold text-red-600 transition-colors hover:text-red-700 hover:underline"
      >
        Eliminar
      </button>

      {open && (
        <div className="fixed inset-0 z-9999 grid min-h-screen place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <h3 className="text-xl font-semibold text-slate-950">
              Eliminar cobro
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              ¿Seguro que querés eliminar este cobro? El saldo, las cuotas y el
              próximo vencimiento se recalcularán automáticamente.
            </p>

            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">
                Esta acción modifica el historial de pagos de la cuenta.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Eliminando..." : "Eliminar cobro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
