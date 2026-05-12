//src/app/clientes/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import ClientSearchInput from "@/components/ClientSearchInput";

type EstadoCuenta = "pendientes" | "saldadas" | "todas";

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

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    vendedorId?: string;
    estado?: EstadoCuenta;
  }>;
}) {
  const user = await requireUser();
  const { q, vendedorId: vendedorIdParam, estado } = await searchParams;

  const search = q?.trim() ?? "";

  const estadoFiltro: EstadoCuenta =
    estado === "saldadas" || estado === "todas" ? estado : "pendientes";

  const vendedorIdFromQuery = vendedorIdParam ? Number(vendedorIdParam) : null;

  const vendedorId =
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
          orderBy: {
            nombre: "asc",
          },
        })
      : [];

  const vendedorSeleccionado =
    user.rol === "ADMIN" && Number.isInteger(vendedorId)
      ? (vendedores.find((vendedor) => vendedor.id === vendedorId) ?? null)
      : null;

  const clientesBase = await prisma.client.findMany({
    where: {
      activo: true,
      ...(Number.isInteger(vendedorId)
        ? {
            OR: [
              {
                vendedorId,
              },
              {
                credits: {
                  some: {
                    vendedorId,
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      vendedor: true,
      credits: {
        include: {
          vendedor: true,
        },
      },
    },
    orderBy: {
      nombre: "asc",
    },
  });

  const getVisibleCredits = (cliente: (typeof clientesBase)[number]) => {
    if (Number.isInteger(vendedorId)) {
      return cliente.credits.filter(
        (cuenta) => cuenta.vendedorId === vendedorId,
      );
    }

    return cliente.credits;
  };

  const clienteMatchesEstado = (cliente: (typeof clientesBase)[number]) => {
    const cuentasVisibles = getVisibleCredits(cliente);

    const cuentasOperativas = cuentasVisibles.filter((cuenta) => cuenta.activo);

    const tienePendientes = cuentasOperativas.some(
      (cuenta) => cuenta.saldo > 0,
    );

    const tieneSaldadas = cuentasOperativas.some((cuenta) => cuenta.saldo <= 0);

    if (estadoFiltro === "pendientes") return tienePendientes;
    if (estadoFiltro === "saldadas") return tieneSaldadas;

    return tienePendientes || tieneSaldadas;
  };

  const clientesFiltradosPorEstado = clientesBase.filter(clienteMatchesEstado);

  const clientes = search
    ? clientesFiltradosPorEstado.filter((cliente) => {
        const cuentasVisibles = getVisibleCredits(cliente);

        return matchesSearch({
          search,
          fields: [
            cliente.nombre,
            cliente.telefono,
            cliente.direccion,
            cliente.vendedor.nombre,
            ...cuentasVisibles.map((cuenta) => cuenta.tipo),
            ...cuentasVisibles.map((cuenta) => cuenta.vendedor.nombre),
          ],
        });
      })
    : clientesFiltradosPorEstado;

  const clientesConSaldoPendiente = clientesBase.filter((cliente) =>
    getVisibleCredits(cliente).some(
      (cuenta) => cuenta.activo && cuenta.saldo > 0,
    ),
  ).length;

  const clientesConCuentaSaldada = clientesBase.filter((cliente) =>
    getVisibleCredits(cliente).some(
      (cuenta) => cuenta.activo && cuenta.saldo <= 0,
    ),
  ).length;

  const clientesSinCuentaActiva = clientesBase.filter((cliente) => {
    const cuentasVisibles = getVisibleCredits(cliente);
    return !cuentasVisibles.some((cuenta) => cuenta.activo);
  }).length;

  const hasFilters =
    Boolean(search) ||
    (user.rol === "ADMIN" && Boolean(vendedorId)) ||
    estadoFiltro !== "pendientes";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Clientes
            </h1>

            <p className="mt-2 text-slate-600">
              {user.rol === "ADMIN"
                ? "Administrá y consultá la cartera de clientes por vendedor."
                : "Consultá los clientes vinculados a tu cartera."}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Sesión: {user.nombre} · {user.rol}
            </p>
          </div>

          {user.rol === "ADMIN" && (
            <Link
              href="/clientes/nuevo?from=/clientes"
              className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
            >
              Nuevo cliente
            </Link>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Clientes visibles" value={clientes.length} />

          <SummaryCard
            title="Con saldo pendiente"
            value={clientesConSaldoPendiente}
          />

          <SummaryCard
            title="Con cuenta saldada"
            value={clientesConCuentaSaldada}
          />

          <SummaryCard
            title="Sin cuenta activa"
            value={clientesSinCuentaActiva}
          />
        </div>

        <form className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="w-full">
              <label className="text-sm font-medium text-slate-700">
                Buscar cliente
              </label>

              <ClientSearchInput
                defaultValue={search}
                placeholder="Buscar por nombre..."
                vendedorId={vendedorId}
                estado={estadoFiltro}
              />
            </div>

            {user.rol === "ADMIN" && (
              <div className="w-full md:max-w-xs">
                <label className="text-sm font-medium text-slate-700">
                  Vendedor
                </label>

                <select
                  name="vendedorId"
                  defaultValue={Number.isInteger(vendedorId) ? vendedorId : ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                >
                  <option value="">Todos los vendedores</option>

                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full md:max-w-xs">
              <label className="text-sm font-medium text-slate-700">
                Estado de cuenta
              </label>

              <select
                name="estado"
                defaultValue={estadoFiltro}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
              >
                <option value="pendientes">Con saldo pendiente</option>
                <option value="saldadas">Cuentas saldadas</option>
                <option value="todas">Todas</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
            >
              Aplicar
            </button>

            {hasFilters && (
              <Link
                href="/clientes"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Resultado
              </h2>

              <p className="text-sm text-slate-500">
                {user.rol === "ADMIN"
                  ? vendedorSeleccionado
                    ? `Mostrando clientes con cuentas de ${vendedorSeleccionado.nombre}.`
                    : "Mostrando clientes de todos los vendedores."
                  : "Mostrando clientes con cuentas vinculadas a tu usuario."}
              </p>

              <p className="mt-1 text-xs font-medium text-slate-500">
                {estadoFiltro === "pendientes" &&
                  "Filtro actual: clientes con saldo pendiente."}
                {estadoFiltro === "saldadas" &&
                  "Filtro actual: clientes con cuentas saldadas."}
                {estadoFiltro === "todas" &&
                  "Filtro actual: clientes con cuentas pendientes y saldadas."}
              </p>
            </div>

            <span className="text-sm font-medium text-slate-600">
              {clientes.length} cliente{clientes.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {clientes.map((cliente) => {
              const cuentasVisibles = getVisibleCredits(cliente).filter(
                (cuenta) => cuenta.activo,
              );

              const cuentasPendientes = cuentasVisibles.filter(
                (cuenta) => cuenta.saldo > 0,
              );

              const cuentasSaldadas = cuentasVisibles.filter(
                (cuenta) => cuenta.saldo <= 0,
              );

              const saldoPendiente = cuentasPendientes.reduce(
                (acc, cuenta) => acc + cuenta.saldo,
                0,
              );

              const tieneSaldoPendiente = saldoPendiente > 0;

              return (
                <Link
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className={`group block rounded-2xl border bg-white p-4 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
                    tieneSaldoPendiente
                      ? "border-slate-200 border-l-4 border-l-slate-500 ring-slate-100 hover:border-slate-300"
                      : "border-slate-200 border-l-4 border-l-emerald-500 ring-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div className="grid gap-4 md:grid-cols-4 md:items-center">
                    <div>
                      <p className="font-semibold text-slate-950 transition-colors group-hover:text-slate-700">
                        {cliente.nombre}
                      </p>

                      {user.rol === "ADMIN" && (
                        <p className="mt-1 text-sm text-slate-500">
                          Vendedor principal: {cliente.vendedor.nombre}
                        </p>
                      )}

                      {user.rol === "ADMIN" && vendedorSeleccionado && (
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Mostrando cuentas de {vendedorSeleccionado.nombre}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Cuentas pendientes
                      </p>
                      <p className="font-semibold text-slate-900">
                        {cuentasPendientes.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Cuentas saldadas</p>
                      <p className="font-semibold text-slate-900">
                        {cuentasSaldadas.length}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-sm text-slate-500">Saldo pendiente</p>

                      <p className="font-bold text-slate-950">
                        ${saldoPendiente.toLocaleString("es-AR")}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          tieneSaldoPendiente
                            ? "bg-slate-100 text-slate-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {tieneSaldoPendiente
                          ? "CON SALDO PENDIENTE"
                          : "SALDADO"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {clientes.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                {search
                  ? "No se encontraron clientes que coincidan con la búsqueda y el filtro aplicado."
                  : "No se encontraron clientes para este filtro."}
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
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
