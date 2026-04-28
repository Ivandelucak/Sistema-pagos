"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegistrarCobroButton({
  creditId,
  saldo,
}: {
  creditId: number;
  saldo: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    const parsedMonto = Number(monto);

    if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/pagos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creditId,
        monto: parsedMonto,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar el cobro.");
      return;
    }

    setOpen(false);
    setMonto("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Registrar cobro
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Registrar cobro
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Saldo actual: ${saldo.toLocaleString("es-AR")}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Monto recibido
                </label>
                <input
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600"
                  placeholder="Ej: 10000"
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
                  disabled={loading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
