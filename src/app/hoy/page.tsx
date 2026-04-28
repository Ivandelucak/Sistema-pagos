import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCreditsDueToday, getOverdueCredits } from "@/lib/credits";
import { calculateCreditTracking } from "@/lib/credit-calculations";

export default async function HoyPage() {
  const user = await requireUser();

  const vendedorId = user.rol === "VENDEDOR" ? user.id : undefined;

  const vencenHoy = await getCreditsDueToday(vendedorId);
  const vencidos = await getOverdueCredits(vendedorId);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Cobros del día</h1>
          <p className="mt-1 text-slate-600">Clientes a gestionar hoy.</p>
          <p className="mt-1 text-sm text-slate-500">
            {user.nombre} · {user.rol}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard title="Pendientes hoy" value={vencenHoy.length} />
          <SummaryCard title="Vencidos" value={vencidos.length} danger />
        </div>

        <CreditList
          title="Pendientes de hoy"
          credits={vencenHoy}
          emptyText="No hay cuentas que venzan hoy."
        />

        <CreditList
          title="Vencidos"
          credits={vencidos}
          emptyText="No hay cuentas vencidas."
          danger
        />
      </section>
    </main>
  );
}

function CreditList({
  title,
  credits,
  emptyText,
  danger,
}: {
  title: string;
  credits: Awaited<ReturnType<typeof getOverdueCredits>>;
  emptyText: string;
  danger?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>

        <span
          className={`text-sm font-semibold ${
            danger ? "text-red-600" : "text-slate-600"
          }`}
        >
          {credits.length} cuenta{credits.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        {credits.map((credito) => {
          const tracking = calculateCreditTracking({
            fechaInicio: credito.fechaInicio,
            frecuenciaDias: credito.frecuenciaDias,
            valorCuota: credito.valorCuota,
            total: credito.total,
            montoPagado: credito.montoPagado,
          });

          const vencida = tracking.diasParaVencer < 0;
          const hoy = tracking.diasParaVencer === 0;

          return (
            <Link
              key={credito.id}
              href={`/cuentas/${credito.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">
                    {credito.client.nombre}
                  </p>

                  <p className="text-sm text-slate-500">{credito.tipo}</p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      vencida
                        ? "text-red-600"
                        : hoy
                          ? "text-blue-600"
                          : "text-slate-700"
                    }`}
                  >
                    {vencida
                      ? `Vencido hace ${Math.abs(
                          tracking.diasParaVencer,
                        )} día${Math.abs(tracking.diasParaVencer) === 1 ? "" : "s"}`
                      : hoy
                        ? "Vence hoy"
                        : `En ${tracking.diasParaVencer} días`}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm text-slate-500">Saldo</p>
                  <p className="font-bold text-red-600">
                    ${tracking.saldo.toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}

        {credits.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCard({
  title,
  value,
  danger,
}: {
  title: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p
        className={`text-2xl font-bold ${
          danger ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
