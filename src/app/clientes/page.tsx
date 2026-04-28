import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

  const vendedorDaniId = 2;

  const clientes = await prisma.client.findMany({
    where: {
      vendedorId: vendedorDaniId,
      activo: true,
      ...(search
        ? {
            nombre: {
              contains: search,
            },
          }
        : {}),
    },
    include: {
      credits: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Clientes
            </h1>
            <p className="mt-2 text-slate-600">
              Listado de clientes asignados al cobrador.
            </p>
          </div>

          <Link
            href="/clientes/nuevo"
            className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
          >
            Nuevo cliente
          </Link>
        </div>

        <form className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <label className="text-sm font-medium text-slate-700">
            Buscar cliente
          </label>

          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nombre..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Buscar
            </button>

            {search && (
              <Link
                href="/clientes"
                className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Resultado</h2>

            <span className="text-sm font-medium text-slate-600">
              {clientes.length} cliente{clientes.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {clientes.map((cliente) => {
              const cuentasActivas = cliente.credits.filter((c) => c.saldo > 0);

              const saldoPendiente = cuentasActivas.reduce(
                (acc, c) => acc + c.saldo,
                0,
              );

              return (
                <Link
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {cliente.nombre}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {cuentasActivas.length} cuenta
                        {cuentasActivas.length === 1 ? "" : "s"} activa
                        {cuentasActivas.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-sm text-slate-500">Saldo pendiente</p>
                      <p
                        className={`font-bold ${
                          saldoPendiente > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        ${saldoPendiente.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}

            {clientes.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No se encontraron clientes.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
