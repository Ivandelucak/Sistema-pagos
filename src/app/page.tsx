import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { calculateCreditTracking } from "@/lib/credit-calculations";
import HomeSearchFilter from "@/components/HomeSearchFilter";
import PendingBalancesButton from "@/components/PendingBalancesButton";
import { canViewPendingBalances } from "@/lib/balance-permissions";

type HomeSort = "az" | "za" | "dueAsc" | "dueDesc";

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function matchesSearch({
  search,
  fields,
}: {
  search: string;
  fields: Array<string | null | undefined>;
}) {
  const query = normalizeText(search);

  if (!query) return true;

  return fields.some((field) => normalizeText(field ?? "").includes(query));
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    order?: HomeSort;
    vendedorId?: string;
  }>;
}) {
  const user = await requireUser();
  const canSeePendingBalances = canViewPendingBalances(user);

  if (user.rol === "VENDEDOR") {
    redirect("/hoy");
  }

  const { q, order, vendedorId: vendedorIdParam } = await searchParams;

  const search = q?.trim() ?? "";

  const sort: HomeSort =
    order === "za" || order === "dueAsc" || order === "dueDesc" ? order : "az";

  const vendedorIdFromQuery = vendedorIdParam ? Number(vendedorIdParam) : null;

  const vendedorId =
    vendedorIdFromQuery !== null &&
    Number.isInteger(vendedorIdFromQuery) &&
    vendedorIdFromQuery > 0
      ? vendedorIdFromQuery
      : undefined;

  const vendedores = await prisma.user.findMany({
    where: {
      rol: "VENDEDOR",
      activo: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });

  const vendedorSeleccionado = Number.isInteger(vendedorId)
    ? (vendedores.find((vendedor) => vendedor.id === vendedorId) ?? null)
    : null;

  const saldoWhere = {
    activo: true,
    saldo: {
      gt: 0,
    },
    ...(Number.isInteger(vendedorId) ? { vendedorId } : {}),
  };

  const [
    saldoPendienteAggregate,
    clientesConSaldoPendiente,
    saldosAgrupadosPorVendedor,
  ] = await Promise.all([
    prisma.credit.aggregate({
      where: saldoWhere,
      _sum: {
        saldo: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.credit.findMany({
      where: saldoWhere,
      select: {
        clientId: true,
      },
      distinct: ["clientId"],
    }),

    prisma.credit.groupBy({
      by: ["vendedorId"],
      where: {
        activo: true,
        saldo: {
          gt: 0,
        },
      },
      _sum: {
        saldo: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  let saldoPendienteTotal = 0;
  let clientesConSaldoPendienteCount = 0;
  let cuentasConSaldoPendiente = 0;

  let saldosPorVendedor: Array<{
    id: number;
    nombre: string;
    saldo: number;
    cuentas: number;
  }> = [];

  if (canSeePendingBalances) {
    const saldoWhere = {
      activo: true,
      saldo: {
        gt: 0,
      },
    };

    const [
      saldoPendienteAggregate,
      clientesConSaldoPendiente,
      saldosAgrupadosPorVendedor,
    ] = await Promise.all([
      prisma.credit.aggregate({
        where: saldoWhere,
        _sum: {
          saldo: true,
        },
        _count: {
          id: true,
        },
      }),

      prisma.credit.findMany({
        where: saldoWhere,
        select: {
          clientId: true,
        },
        distinct: ["clientId"],
      }),

      prisma.credit.groupBy({
        by: ["vendedorId"],
        where: saldoWhere,
        _sum: {
          saldo: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    saldoPendienteTotal = saldoPendienteAggregate._sum.saldo ?? 0;
    cuentasConSaldoPendiente = saldoPendienteAggregate._count.id;
    clientesConSaldoPendienteCount = clientesConSaldoPendiente.length;

    const saldosPorVendedorMap = new Map(
      saldosAgrupadosPorVendedor.map((item) => [
        item.vendedorId,
        {
          saldo: item._sum.saldo ?? 0,
          cuentas: item._count.id,
        },
      ]),
    );

    saldosPorVendedor = vendedores
      .map((vendedor) => {
        const data = saldosPorVendedorMap.get(vendedor.id);

        return {
          id: vendedor.id,
          nombre: vendedor.nombre,
          saldo: data?.saldo ?? 0,
          cuentas: data?.cuentas ?? 0,
        };
      })
      .filter((vendedor) => vendedor.saldo > 0 || vendedor.cuentas > 0)
      .sort((a, b) => b.saldo - a.saldo);
  }

  function buildVendedorHref(nextVendedorId?: number) {
    const params = new URLSearchParams();

    if (search) params.set("q", search);
    if (sort !== "az") params.set("order", sort);
    if (nextVendedorId) params.set("vendedorId", String(nextVendedorId));

    const query = params.toString();

    return query ? `/?${query}` : "/";
  }

  const creditosBase = await prisma.credit.findMany({
    where: {
      activo: true,
      saldo: { gt: 0 },
      ...(Number.isInteger(vendedorId) ? { vendedorId } : {}),
    },
    include: {
      client: true,
      vendedor: true,
    },
  });

  const creditos = search
    ? creditosBase.filter((credito) =>
        matchesSearch({
          search,
          fields: [
            credito.client.nombre,
            credito.client.telefono,
            credito.client.direccion,
            credito.tipo,
            credito.vendedor.nombre,
          ],
        }),
      )
    : creditosBase;

  const cuentas = creditos.map((credito) => {
    const tracking = calculateCreditTracking({
      fechaInicio: credito.fechaInicio,
      frecuenciaDias: credito.frecuenciaDias,
      valorCuota: credito.valorCuota,
      total: credito.total,
      montoPagado: credito.montoPagado,
    });

    return { ...credito, tracking };
  });

  const cuentasOrdenadas = [...cuentas].sort((a, b) => {
    if (sort === "az") {
      return a.client.nombre.localeCompare(b.client.nombre, "es", {
        sensitivity: "base",
      });
    }

    if (sort === "za") {
      return b.client.nombre.localeCompare(a.client.nombre, "es", {
        sensitivity: "base",
      });
    }

    const diff =
      a.tracking.proximoVencimiento.getTime() -
      b.tracking.proximoVencimiento.getTime();

    return sort === "dueAsc" ? diff : -diff;
  });

  const vencenHoy = cuentas.filter(
    (cuenta) => cuenta.tracking.diasParaVencer === 0,
  ).length;

  const vencidas = cuentas.filter(
    (cuenta) => cuenta.tracking.diasParaVencer < 0,
  ).length;

  const clientesActivos = new Set(cuentas.map((cuenta) => cuenta.client.id))
    .size;

  const cuentasInactivas = await prisma.credit.count({
    where: {
      activo: false,
      ...(Number.isInteger(vendedorId) ? { vendedorId } : {}),
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Inicio</h1>

            <p className="mt-2 text-slate-600">
              Panel administrativo de cuentas pendientes.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Sesión: {user.nombre} · {user.rol}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {canSeePendingBalances && (
              <PendingBalancesButton
                saldoPendienteTotal={saldoPendienteTotal}
                clientesConSaldoPendiente={clientesConSaldoPendienteCount}
                cuentasConSaldoPendiente={cuentasConSaldoPendiente}
                saldosPorVendedor={saldosPorVendedor}
              />
            )}

            <Link
              href="/clientes/nuevo"
              className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
            >
              Nuevo cliente
            </Link>

            <Link
              href="/clientes"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clientes
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Vencen hoy" value={vencenHoy} />
          <SummaryCard title="Vencidas" value={vencidas} danger />
          <SummaryCard title="Clientes activos" value={clientesActivos} />
          <SummaryCard title="Cuentas inactivas" value={cuentasInactivas} />
        </div>

        <HomeSearchFilter
          search={search}
          sort={sort}
          vendedorId={Number.isInteger(vendedorId) ? vendedorId : undefined}
          vendedores={vendedores}
        />

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex justify-between">
            <h2 className="font-semibold text-slate-950">Cuentas pendientes</h2>

            <span className="text-sm font-medium text-slate-600">
              {cuentasOrdenadas.length} cuentas
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cuentasOrdenadas.map((cuenta) => {
              const vencida = cuenta.tracking.diasParaVencer < 0;
              const venceHoy = cuenta.tracking.diasParaVencer === 0;

              return (
                <Link
                  key={cuenta.id}
                  href={`/cuentas/${cuenta.id}`}
                  className={`group block rounded-2xl border bg-white p-4 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ${
                    vencida
                      ? "border-red-200 border-l-4 border-l-red-500 ring-red-100 hover:border-red-300"
                      : venceHoy
                        ? "border-slate-200 border-l-4 border-l-slate-300 ring-slate-100 hover:border-slate-300"
                        : "border-green-200 border-l-4 border-l-green-500 ring-green-100 hover:border-green-300"
                  }`}
                >
                  <div className="grid gap-3 md:grid-cols-5 md:items-center">
                    <div>
                      <p className="font-semibold text-slate-950 transition-colors group-hover:text-slate-700">
                        {cuenta.client.nombre}
                      </p>

                      <p className="text-sm text-slate-500">{cuenta.tipo}</p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          vencida
                            ? "bg-red-100 text-red-700"
                            : venceHoy
                              ? "bg-slate-200 text-slate-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {vencida
                          ? "VENCIDA"
                          : venceHoy
                            ? "VENCE HOY"
                            : "AL DÍA"}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Vendedor</p>
                      <p className="font-semibold text-slate-900">
                        {cuenta.vendedor.nombre}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Vence</p>
                      <p className="font-semibold text-slate-900">
                        {cuenta.tracking.proximoVencimiento.toLocaleDateString(
                          "es-AR",
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">DPV</p>
                      <p
                        className={`font-semibold ${
                          vencida ? "text-red-600" : "text-slate-900"
                        }`}
                      >
                        {cuenta.tracking.diasParaVencer}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-sm text-slate-500">Saldo</p>
                      <p
                        className={`font-bold ${
                          vencida ? "text-red-600" : "text-slate-900"
                        }`}
                      >
                        ${cuenta.tracking.saldo.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}

            {cuentasOrdenadas.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                {search
                  ? "No hay cuentas pendientes que coincidan con la búsqueda."
                  : "No hay cuentas pendientes."}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
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
        className={`mt-2 text-2xl font-bold ${
          danger ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
function BalanceSummaryCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: number | string;
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
