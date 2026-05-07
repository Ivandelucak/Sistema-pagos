//src/app/hoy/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getCreditsDueToday, getOverdueCredits } from "@/lib/credits";
import { calculateCreditTracking } from "@/lib/credit-calculations";

type CreditItem = Awaited<ReturnType<typeof getOverdueCredits>>[number];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function filterCredits(credits: CreditItem[], search: string) {
  const query = normalizeText(search.trim());

  if (!query) return credits;

  return credits.filter((credito) => {
    const fields = [
      credito.client.nombre,
      credito.client.direccion ?? "",
      credito.tipo,
      credito.vendedor?.nombre ?? "",
    ];

    return fields.some((field) => normalizeText(field).includes(query));
  });
}

export default async function HoyPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    vendedorId?: string;
  }>;
}) {
  const user = await requireUser();
  const { q, vendedorId: vendedorIdParam } = await searchParams;

  const search = q?.trim() ?? "";

  const vendedorIdFromQuery = vendedorIdParam ? Number(vendedorIdParam) : null;

  const vendedorIdFiltro =
    user.rol === "VENDEDOR"
      ? user.id
      : vendedorIdFromQuery !== null &&
          Number.isInteger(vendedorIdFromQuery) &&
          vendedorIdFromQuery > 0
        ? vendedorIdFromQuery
        : undefined;

  const vendedores =
    user.rol === "ADMIN"
      ? await prisma.user.findMany({
          where: {
            rol: "VENDEDOR",
            activo: true,
          },
          select: {
            id: true,
            nombre: true,
          },
          orderBy: {
            nombre: "asc",
          },
        })
      : [];

  const vendedorSeleccionado =
    user.rol === "ADMIN" && vendedorIdFiltro
      ? (vendedores.find((vendedor) => vendedor.id === vendedorIdFiltro) ??
        null)
      : null;

  const vencenHoyBase = await getCreditsDueToday(vendedorIdFiltro);
  const vencidosBase = await getOverdueCredits(vendedorIdFiltro);

  const vencenHoy = filterCredits(vencenHoyBase, search);
  const vencidos = filterCredits(vencidosBase, search);

  const totalOperativo = vencenHoy.length + vencidos.length;
  const totalBase = vencenHoyBase.length + vencidosBase.length;

  const hasFilters =
    Boolean(search) || (user.rol === "ADMIN" && Boolean(vendedorIdFiltro));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Cobros del día
              </h1>

              <p className="mt-2 text-slate-600">
                Vista rápida para consultar clientes pendientes y vencidos.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {user.nombre} · {user.rol}
              </p>
            </div>

            {user.rol === "VENDEDOR" && (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-700">
                  Modo consulta
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Esta vista es para consultar la cartera asignada. Los cobros
                  se registran desde administración.
                </p>
              </div>
            )}

            {user.rol === "ADMIN" && vendedorSeleccionado && (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-700">
                  Filtro activo
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Mostrando cobros correspondientes a{" "}
                  <span className="font-semibold text-slate-800">
                    {vendedorSeleccionado.nombre}
                  </span>
                  .
                </p>
              </div>
            )}
          </div>
        </div>

        <form className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Buscar cliente
              </label>

              <input
                name="q"
                defaultValue={search}
                placeholder="Buscar por nombre, dirección o tipo..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
              />
            </div>

            {user.rol === "ADMIN" && (
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Clientes de
                </label>

                <select
                  name="vendedorId"
                  defaultValue={vendedorIdFiltro ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                >
                  <option value="">Todos</option>

                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                Aplicar
              </button>

              {hasFilters && (
                <Link
                  href="/hoy"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Limpiar
                </Link>
              )}
            </div>
          </div>

          {hasFilters && (
            <p className="mt-3 text-sm text-slate-500">
              Mostrando {totalOperativo} de {totalBase} cuenta
              {totalBase === 1 ? "" : "s"}
              {vendedorSeleccionado
                ? ` de ${vendedorSeleccionado.nombre}`
                : ""}{" "}
              {search ? `para “${search}”` : ""}.
            </p>
          )}
        </form>

        <div className="grid grid-cols-3 gap-3">
          <SummaryCard title="Total" value={totalOperativo} />
          <SummaryCard title="Hoy" value={vencenHoy.length} />
          <SummaryCard title="Vencidos" value={vencidos.length} danger />
        </div>

        <CreditList
          title="Pendientes de hoy"
          description="Cuentas que corresponden a la jornada actual."
          credits={vencenHoy}
          emptyText={
            search || vendedorSeleccionado
              ? "No hay pendientes de hoy que coincidan con los filtros."
              : "No hay cuentas que venzan hoy."
          }
          showSeller={user.rol === "ADMIN"}
          variant="today"
        />

        <CreditList
          title="Vencidos"
          description="Cuentas con vencimiento anterior a la fecha actual."
          credits={vencidos}
          emptyText={
            search || vendedorSeleccionado
              ? "No hay vencidos que coincidan con los filtros."
              : "No hay cuentas vencidas."
          }
          showSeller={user.rol === "ADMIN"}
          variant="overdue"
        />
      </section>
    </main>
  );
}

function CreditList({
  title,
  description,
  credits,
  emptyText,
  showSeller,
  variant,
}: {
  title: string;
  description: string;
  credits: CreditItem[];
  emptyText: string;
  showSeller?: boolean;
  variant: "today" | "overdue";
}) {
  const isOverdueSection = variant === "overdue";

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            isOverdueSection
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {credits.length}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {credits.map((credito) => {
          const tracking = calculateCreditTracking({
            fechaInicio: credito.fechaInicio,
            frecuenciaDias: credito.frecuenciaDias,
            valorCuota: credito.valorCuota,
            total: credito.total,
            montoPagado: credito.montoPagado,
          });

          const vencida = tracking.diasParaVencer < 0;
          const venceHoy = tracking.diasParaVencer === 0;

          return (
            <Link
              key={credito.id}
              href={`/cuentas/${credito.id}`}
              className={`group block rounded-2xl border bg-white p-4 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
                vencida
                  ? "border-red-200 border-l-4 border-l-red-500 ring-red-100 hover:border-red-300"
                  : "border-slate-200 border-l-4 border-l-slate-400 ring-slate-100 hover:border-slate-300"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950 transition-colors group-hover:text-slate-700">
                      {credito.client.nombre}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {credito.tipo}
                    </p>

                    {credito.client.direccion && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {credito.client.direccion}
                      </p>
                    )}

                    {showSeller && (
                      <p className="mt-1 text-sm text-slate-500">
                        Vendedor: {credito.vendedor.nombre}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-500">Saldo</p>

                    <p
                      className={`text-base font-bold ${
                        vencida ? "text-red-600" : "text-slate-950"
                      }`}
                    >
                      ${tracking.saldo.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        vencida
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {vencida
                        ? `VENCIDA · ${Math.abs(tracking.diasParaVencer)} día${
                            Math.abs(tracking.diasParaVencer) === 1 ? "" : "s"
                          }`
                        : venceHoy
                          ? "VENCE HOY"
                          : `EN ${tracking.diasParaVencer} DÍAS`}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Cuota ${credito.valorCuota.toLocaleString("es-AR")}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
                    Ver cuenta →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {credits.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-600">{emptyText}</p>
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
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          danger ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
