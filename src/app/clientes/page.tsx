import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function ClientesPage({
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

  const vendedorIdFromQuery = vendedorIdParam
    ? Number(vendedorIdParam)
    : undefined;

  const vendedorId =
    user.rol === "VENDEDOR"
      ? user.id
      : Number.isInteger(vendedorIdFromQuery)
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
      ? vendedores.find((vendedor) => vendedor.id === vendedorId)
      : null;

  const clientes = await prisma.client.findMany({
    where: {
      activo: true,
      ...(Number.isInteger(vendedorId) ? { vendedorId } : {}),
      ...(search
        ? {
            nombre: {
              contains: search,
            },
          }
        : {}),
    },
    include: {
      vendedor: true,
      credits: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });

  const clientesConCuentaActiva = clientes.filter((cliente) =>
    cliente.credits.some((cuenta) => cuenta.activo && cuenta.saldo > 0),
  ).length;

  const clientesSinCuentaActiva = clientes.length - clientesConCuentaActiva;

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
                : "Consultá los clientes asignados a tu cartera."}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Sesión: {user.nombre} · {user.rol}
            </p>
          </div>

          {user.rol === "ADMIN" && (
            <Link
              href="/clientes/nuevo"
              className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
            >
              Nuevo cliente
            </Link>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard title="Clientes visibles" value={clientes.length} />
          <SummaryCard
            title="Con cuenta activa"
            value={clientesConCuentaActiva}
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

              <input
                name="q"
                defaultValue={search}
                placeholder="Buscar por nombre..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
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

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
            >
              Aplicar
            </button>

            {(search || (user.rol === "ADMIN" && vendedorId)) && (
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
                    ? `Mostrando clientes de ${vendedorSeleccionado.nombre}.`
                    : "Mostrando clientes de todos los vendedores."
                  : "Mostrando únicamente tu cartera asignada."}
              </p>
            </div>

            <span className="text-sm font-medium text-slate-600">
              {clientes.length} cliente{clientes.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {clientes.map((cliente) => {
              const cuentasActivas = cliente.credits.filter(
                (cuenta) => cuenta.activo && cuenta.saldo > 0,
              );

              const cuentasFinalizadas = cliente.credits.filter(
                (cuenta) => cuenta.saldo <= 0,
              );

              const saldoPendiente = cuentasActivas.reduce(
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
                      : "border-slate-200 border-l-4 border-l-slate-300 ring-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div className="grid gap-4 md:grid-cols-4 md:items-center">
                    <div className="md:col-span-1">
                      <p className="font-semibold text-slate-950 transition-colors group-hover:text-slate-700">
                        {cliente.nombre}
                      </p>

                      {user.rol === "ADMIN" && (
                        <p className="mt-1 text-sm text-slate-500">
                          Vendedor: {cliente.vendedor.nombre}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Cuentas activas</p>
                      <p className="font-semibold text-slate-900">
                        {cuentasActivas.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Cuentas finalizadas
                      </p>
                      <p className="font-semibold text-slate-900">
                        {cuentasFinalizadas.length}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-sm text-slate-500">Saldo pendiente</p>

                      <p className="font-bold text-slate-950">
                        ${saldoPendiente.toLocaleString("es-AR")}
                      </p>

                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {tieneSaldoPendiente
                          ? "CON CUENTA ACTIVA"
                          : "SIN CUENTA ACTIVA"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {clientes.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No se encontraron clientes.
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
