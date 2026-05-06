"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type MetodoPago = "EFECTIVO" | "TRANSFERENCIA";

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })}`;
}

function formatMetodoPago(value: MetodoPago) {
  return value === "EFECTIVO" ? "Efectivo" : "Transferencia";
}

export default function EditPaymentButton({
  paymentId,
  currentAmount,
  currentMethod = "EFECTIVO",
}: {
  paymentId: number;
  currentAmount: number;
  currentMethod?: MetodoPago;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [monto, setMonto] = useState(String(currentAmount));
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(currentMethod);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedMonto = Number(monto);

  const diferencia = useMemo(() => {
    if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) return 0;

    return parsedMonto - currentAmount;
  }, [parsedMonto, currentAmount]);

  const hasChanges =
    parsedMonto !== currentAmount || metodoPago !== currentMethod;

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setConfirmOpen(false);
    setError("");
    setMonto(String(currentAmount));
    setMetodoPago(currentMethod);
  }

  function askConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    if (!hasChanges) {
      setError("No hay cambios para guardar.");
      return;
    }

    setConfirmOpen(true);
  }

  async function handleEdit() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/pagos/${paymentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monto: parsedMonto,
        metodoPago,
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
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 hover:underline"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-40 grid min-h-screen place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-xl font-semibold text-slate-950">
                Editar cobro
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Modificá el monto o el método registrado. La cuenta se
                recalculará automáticamente.
              </p>
            </div>

            <form onSubmit={askConfirm} className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoCard
                  label="Monto actual"
                  value={formatMoney(currentAmount)}
                />

                <InfoCard
                  label="Nuevo monto"
                  value={
                    Number.isFinite(parsedMonto) && parsedMonto > 0
                      ? formatMoney(parsedMonto)
                      : "-"
                  }
                />

                <InfoCard
                  label="Diferencia"
                  value={
                    diferencia === 0
                      ? "$0"
                      : `${diferencia > 0 ? "+" : ""}${formatMoney(diferencia)}`
                  }
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <label className="text-sm font-medium text-slate-700">
                  Nuevo monto
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={monto}
                  onChange={(e) => {
                    setMonto(e.target.value);
                    setError("");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                  placeholder="Ej: 10000"
                />

                <p className="mt-2 text-xs text-slate-500">
                  El sistema no permitirá guardar un monto que haga superar el
                  total de la cuenta.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-700">
                  Método de pago
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <PaymentMethodButton
                    label="Efectivo"
                    active={metodoPago === "EFECTIVO"}
                    onClick={() => setMetodoPago("EFECTIVO")}
                  />

                  <PaymentMethodButton
                    label="Transferencia"
                    active={metodoPago === "TRANSFERENCIA"}
                    onClick={() => setMetodoPago("TRANSFERENCIA")}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-700">
                  Vista previa
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {diferencia > 0
                    ? `Estás aumentando este cobro en ${formatMoney(
                        diferencia,
                      )}.`
                    : diferencia < 0
                      ? `Estás reduciendo este cobro en ${formatMoney(
                          Math.abs(diferencia),
                        )}.`
                      : "El monto queda igual."}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Método:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatMetodoPago(metodoPago)}
                  </span>
                </p>
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
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
          description={`¿Querés editar este cobro de ${formatMoney(
            currentAmount,
          )} a ${formatMoney(parsedMonto)} con método ${formatMetodoPago(
            metodoPago,
          )}? La cuenta se recalculará automáticamente.`}
          confirmText="Aceptar"
          loading={loading}
          onConfirm={handleEdit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

function PaymentMethodButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
