"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MetodoPago = "EFECTIVO" | "TRANSFERENCIA";

function getTodayInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })}`;
}

function formatInputDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return "-";

  return new Date(year, month - 1, day).toLocaleDateString("es-AR");
}

function formatMetodoPago(value: MetodoPago) {
  return value === "EFECTIVO" ? "Efectivo" : "Transferencia";
}

export default function RegistrarCobroButton({
  creditId,
  saldo,
  valorCuota,
}: {
  creditId: number;
  saldo: number;
  valorCuota?: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState(getTodayInputValue());
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedMonto = Number(monto);

  const saldoPosterior = useMemo(() => {
    if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) return saldo;

    return Math.max(saldo - parsedMonto, 0);
  }, [parsedMonto, saldo]);

  const excedeSaldo = Number.isFinite(parsedMonto) && parsedMonto > saldo;
  const pagoCompleto = Number.isFinite(parsedMonto) && parsedMonto === saldo;

  const pagoParcial =
    Number.isFinite(parsedMonto) && parsedMonto > 0 && parsedMonto < saldo;

  const cuotaReferencia = valorCuota && valorCuota > 0 ? valorCuota : null;

  const cubreCuota =
    cuotaReferencia && Number.isFinite(parsedMonto)
      ? parsedMonto >= cuotaReferencia
      : false;

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setError("");
    setMonto("");
    setFechaPago(getTodayInputValue());
    setMetodoPago("EFECTIVO");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    if (parsedMonto > saldo) {
      setError("El monto no puede ser mayor al saldo pendiente.");
      return;
    }

    if (!fechaPago) {
      setError("Seleccioná la fecha del cobro.");
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
        fechaPago,
        metodoPago,
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
    setFechaPago(getTodayInputValue());
    setMetodoPago("EFECTIVO");

    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
      >
        Registrar cobro
      </button>

      {open && (
        <div className="fixed inset-0 z-9999 overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex min-h-dvh w-full max-w-lg items-start sm:items-center">
            <div className="my-auto max-h-[calc(100dvh-3rem)] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
              <div className="border-b border-slate-200 p-6">
                <h3 className="text-xl font-semibold text-slate-950">
                  Registrar cobro
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Cargá el monto recibido. La cuenta se recalculará
                  automáticamente.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoCard label="Saldo actual" value={formatMoney(saldo)} />

                  <InfoCard
                    label="Saldo posterior"
                    value={formatMoney(saldoPosterior)}
                  />

                  <InfoCard label="Fecha" value={formatInputDate(fechaPago)} />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      Datos del cobro
                    </p>

                    {cuotaReferencia && (
                      <p className="text-xs font-medium text-slate-500">
                        Cuota sugerida:{" "}
                        <span className="font-semibold text-slate-800">
                          {formatMoney(Math.min(cuotaReferencia, saldo))}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Monto recibido
                      </label>

                      <input
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        type="number"
                        min="1"
                        max={saldo}
                        step="1"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                        placeholder="Ej: 10000"
                      />

                      {cuotaReferencia && (
                        <button
                          type="button"
                          onClick={() => {
                            setMonto(String(Math.min(cuotaReferencia, saldo)));
                            setError("");
                          }}
                          className="mt-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                        >
                          Usar cuota sugerida (
                          {formatMoney(Math.min(cuotaReferencia, saldo))})
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Fecha del cobro
                      </label>

                      <input
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
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
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Vista previa
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {!Number.isFinite(parsedMonto) || parsedMonto <= 0 ? (
                      <p>Ingresá un monto para ver el resultado del cobro.</p>
                    ) : excedeSaldo ? (
                      <p className="font-medium text-red-600">
                        El monto supera el saldo pendiente.
                      </p>
                    ) : pagoCompleto ? (
                      <p className="font-medium text-slate-900">
                        Este cobro cancelará completamente la cuenta.
                      </p>
                    ) : pagoParcial ? (
                      <p className="font-medium text-slate-900">
                        Este cobro será parcial. Quedará un saldo pendiente de{" "}
                        {formatMoney(saldoPosterior)}.
                      </p>
                    ) : null}

                    {cuotaReferencia &&
                      Number.isFinite(parsedMonto) &&
                      parsedMonto > 0 && (
                        <p>
                          Referencia de cuota: {formatMoney(cuotaReferencia)}.{" "}
                          {cubreCuota
                            ? "El monto cubre al menos una cuota."
                            : "El monto no cubre una cuota completa."}
                        </p>
                      )}

                    <p>
                      Método seleccionado:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatMetodoPago(metodoPago)}
                      </span>
                    </p>
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
                    {loading ? "Guardando..." : "Guardar cobro"}
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
