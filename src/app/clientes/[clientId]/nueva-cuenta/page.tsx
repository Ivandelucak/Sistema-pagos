import Link from "next/link";
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
    return <div className="p-8">Cliente inválido</div>;
  }

  const cliente = await prisma.client.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      nombre: true,
      vendedorId: true,
      vendedor: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  if (!cliente) {
    return <div className="p-8">Cliente no encontrado</div>;
  }

  const vendedores = await prisma.user.findMany({
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
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href={`/clientes/${cliente.id}`}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Volver al cliente
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Nueva cuenta
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Cargá una nueva cuenta para este cliente. Podés asignarla al
            vendedor principal o a otro vendedor activo.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">
                Cliente seleccionado
              </h2>

              <div className="mt-4 space-y-3">
                <Info label="Cliente" value={cliente.nombre} />
                <Info
                  label="Vendedor principal"
                  value={cliente.vendedor.nombre}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-sm font-medium text-slate-300">
                Cuentas por vendedor
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-100">
                El cliente puede tener varias cuentas y cada cuenta puede estar
                asignada a un vendedor distinto. El vendedor solo verá las
                cuentas que le correspondan.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-500">
                Vendedores disponibles
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {vendedores.length}
              </p>
            </div>
          </aside>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <NuevaCuentaForm
              clientId={cliente.id}
              clienteNombre={cliente.nombre}
              vendedorId={cliente.vendedorId}
              vendedorNombre={cliente.vendedor.nombre}
              vendedores={vendedores}
            />
          </div>
        </div>
      </section>
    </main>
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
