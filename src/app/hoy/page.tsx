import Link from "next/link";
import { getCreditsDueToday, getOverdueCredits } from "@/lib/credits";
import { calculateCreditTracking } from "@/lib/credit-calculations";

export default async function HoyPage() {
  const vendedorDaniId = 2;

  const vencenHoy = await getCreditsDueToday(vendedorDaniId);
  const vencidos = await getOverdueCredits(vendedorDaniId);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Cobros del día
          </h1>
          <p className="mt-2 text-slate-600">
            Vista operativa para cuentas que vencen hoy y cuentas vencidas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SummaryCard title="Vencen hoy" value={vencenHoy.length} />
          <SummaryCard title="Vencidos" value={vencidos.length} danger />
        </div>

        <CreditSection
          title="Cuentas que vencen hoy"
          description="Clientes a cobrar durante la jornada actual."
          credits={vencenHoy}
          emptyText="No hay cuentas que venzan hoy."
        />

        <CreditSection
          title="Cuentas vencidas"
          description="Clientes con saldo pendiente y vencimiento anterior a hoy."
          credits={vencidos}
          emptyText="No hay cuentas vencidas."
          danger
        />
      </section>
    </main>
  );
}

function CreditSection({
  title,
  description,
  credits,
  emptyText,
  danger,
}: {
  title: string;
  description: string;
  credits: Awaited<ReturnType<typeof getOverdueCredits>>;
  emptyText: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>

        <span
          className={`text-sm font-semibold ${
            danger ? "text-red-600" : "text-slate-700"
          }`}
        >
          {credits.length} cuenta{credits.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-4 py-3 text-left font-semibold">Cliente</th>
              <th className="px-4 py-3 text-left font-semibold">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold">Cuota</th>
              <th className="px-4 py-3 text-left font-semibold">Saldo</th>
              <th className="px-4 py-3 text-left font-semibold">Vencimiento</th>
              <th className="px-4 py-3 text-left font-semibold">DPV</th>
              <th className="px-4 py-3 text-right font-semibold">Acción</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {credits.map((credito) => {
              const tracking = calculateCreditTracking({
                fechaInicio: credito.fechaInicio,
                frecuenciaDias: credito.frecuenciaDias,
                valorCuota: credito.valorCuota,
                total: credito.total,
                montoPagado: credito.montoPagado,
              });

              return (
                <tr key={credito.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-950">
                    {credito.client.nombre}
                  </td>

                  <td className="px-4 py-3 text-slate-700">{credito.tipo}</td>

                  <td className="px-4 py-3 text-slate-700">
                    ${credito.valorCuota.toLocaleString("es-AR")}
                  </td>

                  <td className="px-4 py-3 font-semibold text-red-600">
                    ${tracking.saldo.toLocaleString("es-AR")}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {tracking.proximoVencimiento.toLocaleDateString("es-AR")}
                  </td>

                  <td
                    className={`px-4 py-3 font-semibold ${
                      tracking.diasParaVencer < 0
                        ? "text-red-600"
                        : "text-slate-700"
                    }`}
                  >
                    {tracking.diasParaVencer}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/cuentas/${credito.id}`}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Ver cuenta
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {credits.length === 0 && (
          <div className="bg-white px-4 py-8 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </div>
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
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p
        className={`mt-2 text-3xl font-bold ${
          danger ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
