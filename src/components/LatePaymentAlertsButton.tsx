//src/components/LatePaymentAlertsButton.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getLatePaymentFrequencyLabel } from "@/lib/late-payment-alerts";

type AlertAccount = {
  creditId: number;
  clientName: string;
  creditType: string;
  sellerId: number;
  sellerName: string;
  nextDueDate: string;
  diasParaVencer: number;
  saldo: number;
  valorCuota: number;
  frecuenciaDias: number;
  cuotasImpagasVencidas: number;
  threshold: number;
};

type SellerOption = {
  id: number;
  nombre: string;
};

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-AR", {
    timeZone: "UTC",
  });
}

export default function LatePaymentAlertsButton({
  accounts,
  sellers = [],
  showSellerFilter = false,
  compact = false,
}: {
  accounts: AlertAccount[];
  sellers?: SellerOption[];
  showSellerFilter?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sellerId, setSellerId] = useState("");

  const total = accounts.length;
  const hasAlerts = total > 0;

  const filteredAccounts = useMemo(() => {
    const parsedSellerId = Number(sellerId);

    if (!Number.isInteger(parsedSellerId) || parsedSellerId <= 0) {
      return accounts;
    }

    return accounts.filter((account) => account.sellerId === parsedSellerId);
  }, [accounts, sellerId]);

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
        aria-label="Ver alertas de atraso"
        className={`relative inline-flex items-center justify-center rounded-xl border text-lg font-black shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.96] ${
          compact ? "h-11 w-11" : "h-10 w-10"
        } ${
          hasAlerts
            ? "border-red-300 bg-red-50 text-red-700 ring-2 ring-red-100 hover:bg-red-100"
            : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        !
        {hasAlerts && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white ring-2 ring-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="flex h-full min-h-0 items-center justify-center">
            <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
              <div className="shrink-0 border-b border-slate-200 p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-black ${
                          hasAlerts
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-slate-300 bg-slate-50 text-slate-500"
                        }`}
                      >
                        !
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">
                          Cuentas con atraso crítico
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Cuentas que superaron el rango de atraso configurado.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  {showSellerFilter ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Filtrar por vendedor
                      </label>

                      <select
                        value={sellerId}
                        onChange={(e) => setSellerId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                      >
                        <option value="">Todos</option>

                        {sellers.map((seller) => (
                          <option key={seller.id} value={seller.id}>
                            {seller.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                      Mostrando solo cuentas asignadas al usuario actual.
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-950 px-4 py-3 text-white">
                    <p className="text-xs font-medium text-slate-300">
                      Alertas visibles
                    </p>
                    <p className="text-2xl font-bold">
                      {filteredAccounts.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-3">
                  {filteredAccounts.map((account) => (
                    <Link
                      key={account.creditId}
                      href={`/cuentas/${account.creditId}`}
                      onClick={() => setOpen(false)}
                      className="group block rounded-2xl border border-red-200 bg-red-50/40 p-4 ring-1 ring-red-100 transition-all hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="grid gap-4 md:grid-cols-[1.25fr_0.85fr_0.75fr_0.75fr] md:items-center">
                        <div className="min-w-0">
                          <p className="break-words font-bold leading-5 text-slate-950">
                            {account.clientName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {account.creditType}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                              {account.cuotasImpagasVencidas} cuota
                              {account.cuotasImpagasVencidas === 1
                                ? ""
                                : "s"}{" "}
                              vencida
                              {account.cuotasImpagasVencidas === 1 ? "" : "s"}
                            </span>

                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                              {getLatePaymentFrequencyLabel(
                                account.frecuenciaDias,
                              )}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Vendedor
                          </p>
                          <p className="font-semibold text-slate-900">
                            {account.sellerName}
                          </p>

                          <p className="mt-2 text-xs font-medium text-slate-500">
                            Vence
                          </p>
                          <p className="font-semibold text-slate-900">
                            {formatDate(account.nextDueDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            DPV
                          </p>
                          <p className="text-lg font-bold text-red-600">
                            {account.diasParaVencer}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            Umbral: {account.threshold} cuota
                            {account.threshold === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="md:text-right">
                          <p className="text-xs font-medium text-slate-500">
                            Saldo
                          </p>
                          <p className="text-lg font-bold text-red-600">
                            {formatMoney(account.saldo)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            Cuota: {formatMoney(account.valorCuota)}
                          </p>

                          <p className="mt-3 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
                            Ver cuenta →
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}

                  {filteredAccounts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <p className="text-sm font-medium text-slate-600">
                        No hay cuentas dentro del rango de alerta.
                      </p>
                    </div>
                  )}
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
