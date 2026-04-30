import BackButton from "@/components/BackButton";
import NuevaCuentaForm from "@/components/NuevaCuentaForm";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NuevaCuentaPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireAdmin();

  const { clientId } = await params;
  const id = Number(clientId);

  if (!Number.isInteger(id)) {
    return <StateMessage title="Cliente inválido" />;
  }

  const cliente = await prisma.client.findUnique({
    where: { id },
    include: {
      vendedor: true,
      credits: {
        where: {
          activo: true,
          saldo: {
            gt: 0,
          },
        },
      },
    },
  });

  if (!cliente) {
    return <StateMessage title="Cliente no encontrado" />;
  }

  if (!cliente.activo) {
    return (
      <StateMessage title="No se puede crear una cuenta para un cliente dado de baja" />
    );
  }

  const saldoPendiente = cliente.credits.reduce(
    (acc, cuenta) => acc + cuenta.saldo,
    0,
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div>
          <BackButton />

          <div className="mt-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Nueva cuenta
            </h1>

            <p className="mt-2 max-w-2xl text-slate-600">
              Cargá una nueva cuenta para el cliente seleccionado. La asignación
              al vendedor se toma automáticamente desde la ficha del cliente.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard title="Cliente" value={cliente.nombre} />
          <SummaryCard title="Vendedor" value={cliente.vendedor.nombre} />
          <SummaryCard
            title="Cuentas activas"
            value={String(cliente.credits.length)}
            description={`Saldo pendiente: $${saldoPendiente.toLocaleString(
              "es-AR",
            )}`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">
                Asignación
              </h2>

              <div className="mt-4 space-y-3">
                <Info label="Cliente" value={cliente.nombre} />
                <Info
                  label="Vendedor asignado"
                  value={cliente.vendedor.nombre}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                La nueva cuenta se guardará con el mismo vendedor del cliente.
                Si el vendedor no corresponde, primero hay que reasignar el
                cliente antes de crear la cuenta.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-sm font-medium text-slate-300">
                Criterio de carga
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-100">
                El sistema calcula el valor de cuota dividiendo el total por la
                cantidad de cuotas. Los vencimientos se proyectan desde la fecha
                inicial según la frecuencia indicada.
              </p>
            </div>
          </aside>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <NuevaCuentaForm
              clientId={cliente.id}
              clienteNombre={cliente.nombre}
              vendedorId={cliente.vendedorId}
              vendedorNombre={cliente.vendedor.nombre}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>

      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
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

function StateMessage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-sm ring-1 ring-slate-200">
        {title}
      </div>
    </main>
  );
}
