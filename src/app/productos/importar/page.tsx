//src/app/productos/importar/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import ProductExcelImportForm from "@/components/ProductExcelImportForm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImportarProductosPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/productos"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Volver a productos
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Importar productos
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Cargá productos desde Excel usando el mismo criterio del importador
            local. Esta herramienta está disponible solo para administración.
          </p>
        </div>

        <ProductExcelImportForm />
      </section>
    </main>
  );
}
