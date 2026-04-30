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
  const user = await requireUser();

  const { clientId } = await params;
  const { estado } = await searchParams;

  const id = Number(clientId);

  const filtro: EstadoFiltro =
    estado === "inactivas" || estado === "todas" ? estado : "activas";

  if (!Number.isInteger(id)) {
    return <StateMessage title="Cliente inválido" />;
  }

  const cliente = await prisma.client.findUnique({
    where: { id },
    include: {
      vendedor: true,
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

  if (user.rol === "VENDEDOR" && cliente.vendedorId !== user.id) {
    return <StateMessage title="No tenés permiso para ver este cliente" />;
  }

  const cuentasFiltradas = cliente.credits.filter((cuenta) => {
    if (filtro === "activas") return cuenta.activo;
    if (filtro === "inactivas") return !cuenta.activo;
    return true;
  });

  const cuentasPendientes = cuentasFiltradas.filter(
    (cuenta) => cuenta.saldo > 0,
  );

  const cuentasFinalizadas = cuentasFiltradas.filter(
    (cuenta) => cuenta.saldo <= 0,
  );

  const cuentasActivas = cliente.credits.filter((cuenta) => cuenta.activo);
  const cuentasInactivas = cliente.credits.filter((cuenta) => !cuenta.activo);

  const cuentasPendientesActivas = cuentasActivas.filter(
    (cuenta) => cuenta.saldo > 0,
  );

  const saldoPendiente = cuentasPendientesActivas.reduce(
    (acc, cuenta) => acc + cuenta.saldo,
    0,
  );

  const cuentasFinalizadasTotal = cliente.credits.filter(
    (cuenta) => cuenta.saldo <= 0,
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Link
                href="/clientes"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                ← Volver a clientes
              </Link>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {cliente.nombre}
              </h1>

              <p className="mt-1 text-slate-600">Ficha del cliente</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge label={`Vendedor: ${cliente.vendedor.nombre}`} />
                <Badge label={`${cuentasActivas.length} cuentas activas`} />
                {cuentasInactivas.length > 0 && (
                  <Badge
                    label={`${cuentasInactivas.length} dadas de baja`}
                    muted
                  />
                )}
              </div>
            </div>

            {user.rol === "ADMIN" && (
              <Link
                href={`/clientes/${cliente.id}/nueva-cuenta`}
                className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
              >
                Nueva cuenta
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Cuentas pendientes"
            value={cuentasPendientesActivas.length}
          />

          <SummaryCard
            title="Saldo pendiente"
            value={`$${saldoPendiente.toLocaleString("es-AR")}`}
          />

          <SummaryCard
            title="Cuentas finalizadas"
            value={cuentasFinalizadasTotal}
          />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Datos del cliente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Información general asociada al cliente.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Info label="Nombre" value={cliente.nombre} />
            <Info label="Vendedor asignado" value={cliente.vendedor.nombre} />
            <Info
              label="Estado"
              value={cliente.activo ? "Activo" : "Dado de baja"}
            />
            <Info label="Teléfono" value={cliente.telefono || "Sin cargar"} />
            <Info label="Dirección" value={cliente.direccion || "Sin cargar"} />
            <Info
              label="Fecha de alta"
              value={cliente.createdAt.toLocaleDateString("es-AR")}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Estado de cuentas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filtrá las cuentas visibles para este cliente.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
          description="Cuentas con saldo pendiente para este cliente."
          emptyText="No hay cuentas pendientes para este filtro."
          cuentas={cuentasPendientes}
        />

        <CuentaSection
          title="Cuentas finalizadas"
          description="Cuentas sin saldo pendiente."
          emptyText="No hay cuentas finalizadas para este filtro."
          cuentas={cuentasFinalizadas}
          finalizadas
        />
      </section>
    </main>
  );
}

function CuentaSection({
  title,
  description,
  emptyText,
  cuentas,
  finalizadas,
}: {
  title: string;
  description: string;
  emptyText: string;
  cuentas: Array<{
    id: number;
    tipo: string;
    fechaInicio: Date;
    saldo: number;
    total: number;
    activo: boolean;
  }>;
  finalizadas?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>

        <span className="text-sm font-medium text-slate-600">
          {cuentas.length} cuenta{cuentas.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {cuentas.map((cuenta) => (
          <Link
            key={cuenta.id}
            href={`/cuentas/${cuenta.id}`}
            className={`group block rounded-2xl border bg-white p-4 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
              cuenta.activo
                ? "border-slate-200 border-l-4 border-l-slate-400 ring-slate-100 hover:border-slate-300"
                : "border-slate-200 border-l-4 border-l-slate-300 bg-slate-50 ring-slate-100 hover:border-slate-300"
            }`}
          >
            <div className="grid gap-4 md:grid-cols-4 md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950 transition-colors group-hover:text-slate-700">
                    {cuenta.tipo}
                  </p>

                  {!cuenta.activo && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                      DADA DE BAJA
                    </span>
                  )}

                  {finalizadas && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      FINALIZADA
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Inicio: {cuenta.fechaInicio.toLocaleDateString("es-AR")}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="font-semibold text-slate-900">
                  ${cuenta.total.toLocaleString("es-AR")}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Saldo</p>
                <p className="font-semibold text-slate-900">
                  ${cuenta.saldo.toLocaleString("es-AR")}
                </p>
              </div>

              <div className="md:text-right">
                <p className="text-sm text-slate-500">Acceso</p>
                <p className="font-semibold text-slate-900">Ver cuenta →</p>
              </div>
            </div>
          </Link>
        ))}

        {cuentas.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Badge({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        muted ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
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
      className={`rounded-lg px-4 py-2 text-center text-sm font-medium transition-all ${
        active
          ? "bg-slate-900 text-white shadow-sm"
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
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-sm ring-1 ring-slate-200">
        {title}
      </div>
    </main>
  );
}
