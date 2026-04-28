import Link from "next/link";
import NuevoClienteForm from "@/components/NuevoClienteForm";

export default function NuevoClientePage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-xl space-y-6">
        <div>
          <Link
            href="/clientes"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Volver a clientes
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Nuevo cliente
          </h1>

          <p className="mt-2 text-slate-600">
            Cargá los datos básicos del cliente. Luego vas a poder agregarle una
            cuenta.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <NuevoClienteForm />
        </div>
      </section>
    </main>
  );
}
