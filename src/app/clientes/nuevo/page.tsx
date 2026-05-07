//src/app/clientes/nuevo/page.tsx
import Link from "next/link";
import NuevoClienteForm from "@/components/NuevoClienteForm";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
  }>;
}) {
  await requireAdmin();

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

  const { from } = await searchParams;

  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/clientes";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href={backHref}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Volver
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Nuevo cliente
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Cargá los datos básicos del cliente y asignalo a un vendedor. Luego
            vas a poder agregarle una cuenta desde su ficha.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">
                Asignación del cliente
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                El vendedor no se escribe manualmente: se selecciona desde los
                usuarios cargados como vendedores. Esto evita duplicados o
                errores por diferencias de escritura.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-sm font-medium text-slate-300">
                Criterio operativo
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-100">
                Cada cliente queda asociado a un vendedor. Las cuentas nuevas
                que se carguen para ese cliente tomarán automáticamente ese
                mismo vendedor.
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
            <NuevoClienteForm vendedores={vendedores} />
          </div>
        </div>
      </section>
    </main>
  );
}
