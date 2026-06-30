"use client";

import { useEffect, useState } from "react";

type VendorBalance = {
  id: number;
  nombre: string;
  saldo: number;
  cuentas: number;
};

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

export default function PendingBalancesButton({
  saldoPendienteTotal,
  clientesConSaldoPendiente,
  cuentasConSaldoPendiente,
  saldosPorVendedor,
}: {
  saldoPendienteTotal: number;
  clientesConSaldoPendiente: number;
  cuentasConSaldoPendiente: number;
  saldosPorVendedor: VendorBalance[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98]"
      >
        Saldos pendientes
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-950/60 px-4 py-4 backdrop-blur-sm sm:py-6">
          <div className="flex h-full min-h-0 items-center justify-center">
            <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
              <div className="shrink-0 border-b border-slate-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">
                      Saldos pendientes
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Suma de saldos restantes de cuentas activas con deuda.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <BalanceCard
                    title="Saldo pendiente total"
                    value={formatMoney(saldoPendienteTotal)}
                    highlight
                  />

                  <BalanceCard
                    title="Clientes con saldo"
                    value={clientesConSaldoPendiente}
                  />

                  <BalanceCard
                    title="Cuentas con saldo"
                    value={cuentasConSaldoPendiente}
                  />
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Detalle por vendedor
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Calculado por vendedor asignado a cada cuenta.
                  </p>

                  <div className="mt-4 space-y-2">
                    {saldosPorVendedor.map((vendedor) => (
                      <div
                        key={vendedor.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {vendedor.nombre}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {vendedor.cuentas} cuenta
                            {vendedor.cuentas === 1 ? "" : "s"} con saldo
                          </p>
                        </div>

                        <p className="text-right text-lg font-bold text-slate-950">
                          {formatMoney(vendedor.saldo)}
                        </p>
                      </div>
                    ))}

                    {saldosPorVendedor.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                        No hay saldos pendientes.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white p-4 sm:p-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98] sm:w-auto"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BalanceCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p
        className={`mt-2 text-2xl font-bold ${
          highlight ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
