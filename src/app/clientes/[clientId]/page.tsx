import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type EstadoFiltro = "activas" | "inactivas" | "todas";

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ estado?: EstadoFiltro }>;
}) {
  const { clientId } = await params;
  const { estado } = await searchParams;
  const user = await requireUser();

  const id = Number(clientId);
  const filtro: EstadoFiltro =
    estado === "inactivas" || estado === "todas" ? estado : "activas";

  if (!Number.isInteger(id)) {
    return <StateMessage title="Cliente inválido" />;
  }

  const cliente = await prisma.client.findUnique({
    where: { id },
    include: {
      credits: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!cliente) {
    return <StateMessage title="Cliente no encontrado" />;
  }

  const cuentasFiltradas = cliente.credits.filter((c) => {
    if (filtro === "activas") return c.activo;
    if (filtro === "inactivas") return !c.activo;
    return true;
  });

  const activas = cuentasFiltradas.filter((c) => c.saldo > 0);
  const pagadas = cuentasFiltradas.filter((c) => c.saldo <= 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/clientes"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Volver a clientes
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {cliente.nombre}
            </h1>

            <p className="mt-1 text-slate-600">Detalle del cliente</p>
          </div>
          {user.rol === "ADMIN" && (
            <Link
              href={`/clientes/${cliente.id}/nueva-cuenta`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
            >
              Nueva cuenta
            </Link>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-700">
            Estado de cuentas
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <FilterLink
              href={`/clientes/${cliente.id}?estado=activas`}
              active={filtro === "activas"}
            >
              Activas
            </FilterLink>

            <FilterLink
              href={`/clientes/${cliente.id}?estado=inactivas`}
              active={filtro === "inactivas"}
            >
              Dadas de baja
            </FilterLink>

            <FilterLink
              href={`/clientes/${cliente.id}?estado=todas`}
              active={filtro === "todas"}
            >
              Todas
            </FilterLink>
          </div>
        </div>

        <CuentaSection
          title="Cuentas pendientes"
          emptyText="No hay cuentas pendientes para este filtro."
          cuentas={activas}
        />

        <CuentaSection
          title="Cuentas finalizadas"
          emptyText="No hay cuentas finalizadas para este filtro."
          cuentas={pagadas}
          finalizadas
        />
      </section>
    </main>
  );
}

function CuentaSection({
  title,
  emptyText,
  cuentas,
  finalizadas,
}: {
  title: string;
  emptyText: string;
  cuentas: Array<{
    id: number;
    tipo: string;
    fechaInicio: Date;
    saldo: number;
    activo: boolean;
  }>;
  finalizadas?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>

        <span className="text-sm font-medium text-slate-600">
          {cuentas.length} cuenta{cuentas.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {cuentas.map((c) => (
          <Link
            key={c.id}
            href={`/cuentas/${c.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{c.tipo}</p>

                  {!c.activo && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      DADA DE BAJA
                    </span>
                  )}

                  {finalizadas && (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                      PAGADA
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Inicio: {c.fechaInicio.toLocaleDateString("es-AR")}
                </p>
              </div>

              <div className="md:text-right">
                <p className="text-sm text-slate-500">
                  {finalizadas ? "Estado" : "Saldo"}
                </p>

                {finalizadas ? (
                  <p className="font-semibold text-green-600">Finalizada</p>
                ) : (
                  <p className="font-semibold text-red-600">
                    ${c.saldo.toLocaleString("es-AR")}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}

        {cuentas.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-center text-sm font-medium ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}

function StateMessage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-sm">
        {title}
      </div>
    </main>
  );
}
