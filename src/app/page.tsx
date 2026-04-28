import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { calculateCreditTracking } from "@/lib/credit-calculations";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    order?: "asc" | "desc";
  }>;
}) {
  const user = await requireUser();

  if (user.rol === "VENDEDOR") {
    redirect("/hoy");
  }

  const { q, order } = await searchParams;

  const search = q?.trim() ?? "";
  const sort = order === "desc" ? "desc" : "asc";

  const creditos = await prisma.credit.findMany({
    where: {
      activo: true,
      saldo: { gt: 0 },
      ...(search
        ? {
            client: {
              nombre: {
                contains: search,
              },
            },
          }
        : {}),
    },
    include: {
      client: true,
      vendedor: true,
    },
  });

  const cuentas = creditos
    .map((c) => {
      const tracking = calculateCreditTracking({
        fechaInicio: c.fechaInicio,
        frecuenciaDias: c.frecuenciaDias,
        valorCuota: c.valorCuota,
        total: c.total,
        montoPagado: c.montoPagado,
      });

      return { ...c, tracking };
    })
    .sort((a, b) => {
      const diff =
        a.tracking.proximoVencimiento.getTime() -
        b.tracking.proximoVencimiento.getTime();

      return sort === "asc" ? diff : -diff;
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
            <Link
              href="/clientes/nuevo"
              className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
            >
              Nuevo cliente
            </Link>

            <Link
              href="/clientes"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clientes
            </Link>
          </div>
        </div>

        <form className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar cliente..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />

            <select
              name="order"
              defaultValue={sort}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
            >
              <option value="asc">Más próximo primero</option>
              <option value="desc">Más lejano primero</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
            >
              Aplicar
            </button>

            {(search || order) && (
              <Link
                href="/"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex justify-between">
            <h2 className="font-semibold text-slate-950">Cuentas pendientes</h2>

            <span className="text-sm font-medium text-slate-600">
              {cuentas.length} cuentas
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cuentas.map((c) => {
              const vencida = c.tracking.diasParaVencer < 0;

              return (
                <Link
                  key={c.id}
                  href={`/cuentas/${c.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                >
                  <div className="grid gap-3 md:grid-cols-5 md:items-center">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {c.client.nombre}
                      </p>
                      <p className="text-sm text-slate-500">{c.tipo}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Vendedor</p>
                      <p className="font-semibold text-slate-900">
                        {c.vendedor.nombre}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Vence</p>
                      <p className="font-semibold text-slate-900">
                        {c.tracking.proximoVencimiento.toLocaleDateString(
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
                        {c.tracking.diasParaVencer}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-sm text-slate-500">Saldo</p>
                      <p className="font-bold text-red-600">
                        ${c.tracking.saldo.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}

            {cuentas.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No hay cuentas pendientes.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
