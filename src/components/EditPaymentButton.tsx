"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function EditPaymentButton({
  paymentId,
  currentAmount,
}: {
  paymentId: number;
  currentAmount: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [monto, setMonto] = useState(String(currentAmount));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedMonto = Number(monto);

  function askConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    setConfirmOpen(true);
  }

  async function handleEdit() {
    setLoading(true);

    const res = await fetch(`/api/pagos/${paymentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monto: parsedMonto,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo editar el cobro.");
      setConfirmOpen(false);
      return;
    }

    setConfirmOpen(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-slate-700 hover:underline"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-950">
              Editar cobro
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Modificá el monto registrado. La cuenta se recalculará
              automáticamente.
            </p>

            <form onSubmit={askConfirm} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Monto
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title="Confirmar edición"
          description={`¿Querés editar este cobro de $${currentAmount.toLocaleString(
            "es-AR",
          )} a $${parsedMonto.toLocaleString("es-AR")}?`}
          confirmText="Aceptar"
          loading={loading}
          onConfirm={handleEdit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
