import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import NuevoUsuarioForm from "@/components/NuevoUsuarioForm";

export default async function NuevoUsuarioPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/usuarios"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Volver a usuarios
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Nuevo usuario
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Creá un usuario para administración o para vendedores. La contraseña
            se guarda protegida y el usuario queda activo por defecto.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">
                Tipos de usuario
              </h2>

              <div className="mt-4 space-y-4">
                <RoleInfo
                  title="Administrador"
                  description="Puede crear clientes, cuentas, registrar pagos, editar movimientos y gestionar usuarios."
                />

                <RoleInfo
                  title="Vendedor"
                  description="Puede consultar su cartera asignada y revisar cuentas, pero no modifica datos operativos."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-sm font-medium text-slate-300">
                Recomendación
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-100">
                Para vendedores nuevos, usá un email interno simple. Ejemplo:
                nico.cobrador@sistema.local. Luego se puede cambiar la clave si
                hace falta.
              </p>
            </div>
          </aside>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <NuevoUsuarioForm />
          </div>
        </div>
      </section>
    </main>
  );
}

function RoleInfo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
